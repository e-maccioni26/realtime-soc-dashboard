import asyncio
import ipaddress
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

CACHE_TTL_S = 3600
TIMEOUT_S = 5
EXPOSED_FIELDS = ("ip", "city", "region", "country", "org", "timezone")

# ponytail: cache en mémoire sans éviction, borné en pratique par le nombre d'IP vues ; Redis si multi-instance
_cache: dict[str, tuple[float, dict]] = {}


class IpInfoError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _fetch(ip: str) -> dict:
    headers = {"Accept": "application/json"}
    # Le token reste côté serveur : il n'apparaît jamais dans le bundle du navigateur.
    if token := os.getenv("IPINFO_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"
    with urlopen(Request(f"https://ipinfo.io/{ip}/json", headers=headers), timeout=TIMEOUT_S) as response:
        return json.load(response)


async def lookup_ip(raw_ip: str) -> dict:
    """Lève ValueError si l'adresse est invalide, IpInfoError si IPinfo échoue."""
    ip = ipaddress.ip_address(raw_ip)
    key = str(ip)

    # IP privée, loopback, réservée… : aucune donnée publique, inutile d'interroger IPinfo.
    if not ip.is_global:
        return {"ip": key, "bogon": True}

    cached = _cache.get(key)
    if cached and time.monotonic() - cached[0] < CACHE_TTL_S:
        return cached[1]

    try:
        data = await asyncio.to_thread(_fetch, key)
    except HTTPError as e:
        if e.code == 429:
            raise IpInfoError(429, "Quota IPinfo atteint, réessayez plus tard.")
        raise IpInfoError(502, f"IPinfo a répondu {e.code}.")
    except (URLError, TimeoutError, ValueError):
        raise IpInfoError(502, "IPinfo injoignable.")

    # On ne relaie que des champs connus et de type texte, jamais la réponse brute.
    result = {k: v for k in EXPOSED_FIELDS if isinstance(v := data.get(k), str)}
    result["bogon"] = False
    _cache[key] = (time.monotonic(), result)
    return result
