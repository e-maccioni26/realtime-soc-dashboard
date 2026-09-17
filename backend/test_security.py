import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

import ipinfo
import main

ALLOWED = main.ALLOWED_ORIGINS[0]


@pytest.fixture
def client():
    main._request_log.clear()
    with TestClient(main.app) as c:
        yield c


def test_websocket_accepte_origine_autorisee(client):
    with client.websocket_connect("/ws/alerts", headers={"origin": ALLOWED}) as ws:
        assert ws.receive_json()["type"] == "snapshot"


@pytest.mark.parametrize("headers", [{"origin": "https://evil.example"}, {}])
def test_websocket_refuse_autres_origines(client, headers):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/alerts", headers=headers) as ws:
            ws.receive_json()


def test_cors_ne_reflete_pas_une_origine_inconnue(client):
    r = client.options(
        "/api/ip/8.8.8.8",
        headers={"origin": "https://evil.example", "access-control-request-method": "GET"},
    )
    assert r.headers.get("access-control-allow-origin") is None


def test_action_refuse_un_id_non_uuid(client):
    r = client.post("/api/alerts/../../etc/action", json={"action": "ban"})
    assert r.status_code in (404, 422)
    assert client.post("/api/alerts/pas-un-uuid/action", json={"action": "ban"}).status_code == 422


def test_action_refuse_une_action_inconnue(client):
    r = client.post("/api/alerts/3f2b8c1e-8a57-4d8e-9a0b-2f1c3d4e5f60/action", json={"action": "delete"})
    assert r.status_code == 422


def test_rate_limit(client, monkeypatch):
    monkeypatch.setattr(main, "RATE_LIMIT_PER_MINUTE", 3)
    codes = [client.get("/api/ip/10.0.0.1").status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]


@pytest.mark.parametrize("ip", ["pas-une-ip", "8.8.8.8%2F..%2Fme", "999.1.1.1"])
def test_ip_invalide(client, ip):
    assert client.get(f"/api/ip/{ip}").status_code in (404, 422)


def test_ip_privee_sans_appel_externe(client, monkeypatch):
    monkeypatch.setattr(ipinfo, "_fetch", lambda ip: pytest.fail("IPinfo ne doit pas être appelé"))
    assert client.get("/api/ip/192.168.1.254").json() == {"ip": "192.168.1.254", "bogon": True}


def test_ip_publique_filtre_et_met_en_cache(client, monkeypatch):
    ipinfo._cache.clear()
    calls = []

    def fake_fetch(ip):
        calls.append(ip)
        return {"ip": ip, "city": "Paris", "org": {"inattendu": True}, "readme": "https://ipinfo.io/missingauth"}

    monkeypatch.setattr(ipinfo, "_fetch", fake_fetch)
    first = client.get("/api/ip/8.8.8.8").json()
    second = client.get("/api/ip/8.8.8.8").json()
    assert first == second == {"ip": "8.8.8.8", "city": "Paris", "bogon": False}
    assert calls == ["8.8.8.8"]
