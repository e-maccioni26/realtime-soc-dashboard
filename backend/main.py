import asyncio
import logging
import os
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder

from alert_service import generate_alert, generate_alert_or_error
from ipinfo import IpInfoError, lookup_ip
from models import AlertAction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BROADCAST_INTERVAL_S = 15
SEND_TIMEOUT_S = 5
RATE_LIMIT_PER_MINUTE = 30

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")
    if o.strip()
]

active_connections: set[WebSocket] = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On garde la référence : une tâche asyncio non référencée peut être ramassée par le GC.
    task = asyncio.create_task(broadcast_alerts())
    yield
    task.cancel()


app = FastAPI(title="SOC Alerts API", lifespan=lifespan)

# Aucun cookie n'est utilisé : pas de credentials, et seules les origines listées sont acceptées.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ponytail: compteur en mémoire par IP et par processus ; derrière un reverse proxy, lire X-Forwarded-For, et Redis si plusieurs instances
_request_log: dict[str, deque[float]] = defaultdict(deque)


def rate_limit(request: Request):
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    hits = _request_log[client]
    while hits and now - hits[0] > 60:
        hits.popleft()
    if len(hits) >= RATE_LIMIT_PER_MINUTE:
        raise HTTPException(429, "Trop de requêtes, réessayez dans une minute.")
    hits.append(now)


@app.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    # CORS ne s'applique pas aux WebSockets : sans ce contrôle, n'importe quel site
    # pourrait ouvrir le flux depuis le navigateur d'un analyste (Cross-Site WebSocket Hijacking).
    if websocket.headers.get("origin") not in ALLOWED_ORIGINS:
        logger.warning(f"WebSocket refusé, origine non autorisée : {websocket.headers.get('origin')!r}")
        await websocket.close(code=1008)
        return

    await websocket.accept()
    active_connections.add(websocket)
    try:
        initial_alert = generate_alert()
        await websocket.send_json({"type": "alert", "payload": jsonable_encoder(initial_alert)})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        # Quelle que soit la cause de la sortie, le client ne doit pas rester dans la liste.
        active_connections.discard(websocket)


async def send_to_client(connection: WebSocket, payload: dict):
    try:
        await asyncio.wait_for(connection.send_json(payload), SEND_TIMEOUT_S)
    except Exception as e:
        logger.warning(f"WebSocket delivery failed, dropping client: {e!r}")
        active_connections.discard(connection)


async def broadcast_alerts():
    while True:
        await asyncio.sleep(BROADCAST_INTERVAL_S)
        if not active_connections:
            continue

        result = generate_alert_or_error()
        if result["type"] == "alert":
            payload = {"type": "alert", "payload": jsonable_encoder(result["payload"])}
        else:
            payload = {"type": "error", "status_code": result["status_code"], "message": result["message"]}
            logger.warning(f"Simulated ingestion failure: {result['status_code']} - {result['message']}")

        # Envoi en parallèle : un client lent ne bloque plus les autres.
        await asyncio.gather(*(send_to_client(c, payload) for c in list(active_connections)))


@app.post("/api/alerts/{alert_id}/action", dependencies=[Depends(rate_limit)])
async def handle_alert_action(alert_id: uuid.UUID, action_data: AlertAction):
    await asyncio.sleep(0.5)
    return {"status": "success", "alert_id": str(alert_id), "action": action_data.action}


@app.get("/api/ip/{ip}", dependencies=[Depends(rate_limit)])
async def ip_info(ip: str):
    try:
        return await lookup_ip(ip)
    except ValueError:
        raise HTTPException(422, "Adresse IP invalide.")
    except IpInfoError as e:
        raise HTTPException(e.status_code, e.message)
