"""État partagé des alertes : une seule source de vérité pour tous les clients connectés.

Pas de verrou nécessaire : ces fonctions ne font aucun `await`, elles s'exécutent donc
d'un bloc dans la boucle asyncio.
"""
from typing import Literal

from models import Alert

# ponytail: stockage en mémoire, perdu au redémarrage ; SQLite si l'historique doit survivre
MAX_ALERTS = 500

_alerts: dict[str, Alert] = {}  # ordre d'insertion = ordre chronologique
_banned_ips: set[str] = set()


class AlertNotFound(Exception):
    pass


class ActionConflict(Exception):
    pass


def reset() -> None:
    _alerts.clear()
    _banned_ips.clear()


def add(alert: Alert) -> Alert:
    # Une IP déjà bannie reste bannie : la nouvelle tentative est tracée, mais déjà traitée.
    if alert.ip in _banned_ips:
        alert.status = "banned"
    _alerts[alert.id] = alert
    while len(_alerts) > MAX_ALERTS:
        del _alerts[next(iter(_alerts))]
    return alert


def newest_first() -> list[Alert]:
    return list(reversed(_alerts.values()))


def apply_action(alert_id: str, action: Literal["ban", "ignore"]) -> list[Alert]:
    """Applique l'action et renvoie les alertes réellement modifiées."""
    alert = _alerts.get(alert_id)
    if alert is None:
        raise AlertNotFound(alert_id)

    if action == "ban":
        # Bannir concerne l'IP : toutes ses alertes passent en "banned".
        _banned_ips.add(alert.ip)
        changed = [a for a in _alerts.values() if a.ip == alert.ip and a.status != "banned"]
        for a in changed:
            a.status = "banned"
        return changed

    if alert.status == "banned":
        raise ActionConflict("Cette IP est déjà bannie, l'alerte ne peut pas être ignorée.")
    if alert.status == "ignored":
        return []
    alert.status = "ignored"
    return [alert]
