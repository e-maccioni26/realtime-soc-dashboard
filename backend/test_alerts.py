import uuid

import pytest
from fastapi.testclient import TestClient

import alert_store
import main
from alert_service import generate_alert

ORIGIN = {"origin": main.ALLOWED_ORIGINS[0]}


@pytest.fixture
def client():
    main._request_log.clear()
    with TestClient(main.app) as c:
        alert_store.reset()
        yield c


def add(ip: str):
    alert = generate_alert()
    alert.ip = ip
    return alert_store.add(alert)


def act(client, alert_id, action):
    return client.post(f"/api/alerts/{alert_id}/action", json={"action": action})


def test_snapshot_a_la_connexion_du_plus_recent_au_plus_ancien(client):
    first, second = add("8.8.8.8"), add("1.1.1.1")
    with client.websocket_connect("/ws/alerts", headers=ORIGIN) as ws:
        msg = ws.receive_json()
    assert msg["type"] == "snapshot"
    assert [a["id"] for a in msg["payload"]] == [second.id, first.id]


def test_bannir_une_ip_bannit_toutes_ses_alertes_et_diffuse_la_mise_a_jour(client):
    a1, a2, other = add("8.8.8.8"), add("8.8.8.8"), add("1.1.1.1")
    with client.websocket_connect("/ws/alerts", headers=ORIGIN) as ws:
        ws.receive_json()  # snapshot
        r = act(client, a1.id, "ban")
        assert r.status_code == 200
        assert {a["id"] for a in r.json()["alerts"]} == {a1.id, a2.id}

        update = ws.receive_json()
        assert update["type"] == "update"
        assert {a["id"] for a in update["payload"]} == {a1.id, a2.id}

    assert other.status == "active"
    # Une nouvelle alerte de cette IP arrive déjà bannie.
    assert add("8.8.8.8").status == "banned"


def test_bannir_deux_fois_est_idempotent(client):
    alert = add("8.8.8.8")
    act(client, alert.id, "ban")
    assert act(client, alert.id, "ban").json() == {"alerts": []}


def test_ignorer_une_alerte_bannie_est_refuse(client):
    alert = add("8.8.8.8")
    act(client, alert.id, "ban")
    assert act(client, alert.id, "ignore").status_code == 409


def test_ignorer_ne_touche_que_l_alerte(client):
    a1, a2 = add("8.8.8.8"), add("8.8.8.8")
    assert [a["id"] for a in act(client, a1.id, "ignore").json()["alerts"]] == [a1.id]
    assert a2.status == "active"


def test_alerte_inconnue(client):
    assert act(client, uuid.uuid4(), "ban").status_code == 404


def test_plafond_du_stockage(client, monkeypatch):
    monkeypatch.setattr(alert_store, "MAX_ALERTS", 3)
    alerts = [add("8.8.8.8") for _ in range(5)]
    assert [a.id for a in alert_store.newest_first()] == [a.id for a in reversed(alerts[2:])]
