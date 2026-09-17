import random
import uuid
from datetime import datetime, timezone
from models import Alert

MOCK_IPS = ["8.8.8.8", "1.1.1.1", "192.168.1.254", "104.21.2.1", "142.250.179.110"]
THREATS = ["Brute-force SSH", "Scan de ports", "Injection SQL", "DDoS Attempt", "Malware C2 Communication"]
SEVERITIES = ["low", "medium", "high", "critical"]

FAILURE_RATE = 0.15  # ~15% des cycles de génération échouent

FAILURE_SCENARIOS = [
    {"status_code": 429, "message": "Limite de requêtes IPinfo atteinte, réessai automatique."},
    {"status_code": 500, "message": "Erreur interne du pipeline de collecte des logs."},
    {"status_code": 502, "message": "Passerelle SIEM injoignable."},
    {"status_code": 503, "message": "Service de génération d'alertes temporairement indisponible."},
]

def generate_alert(timestamp: datetime | None = None) -> Alert:
    return Alert(
        id=str(uuid.uuid4()),
        ip=random.choice(MOCK_IPS),
        timestamp=timestamp or datetime.now(timezone.utc),
        severity=random.choice(SEVERITIES),
        threat_type=random.choice(THREATS),
        status="active",
    )

def generate_alert_or_error() -> dict:
    """Simule un cycle de génération d'alerte, avec un taux d'échec
    volontaire (4xx/5xx) pour reproduire une source de données réelle
    qui peut ponctuellement échouer, sans jamais casser l'application."""
    if random.random() < FAILURE_RATE:
        scenario = random.choice(FAILURE_SCENARIOS)
        return {"type": "error", **scenario}
    return {"type": "alert", "payload": generate_alert()}