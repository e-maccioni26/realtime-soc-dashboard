import type { Alert } from '@/store/useAlertStore';

export type WsMessage =
  | { type: 'alert'; payload: Alert }
  /** État complet envoyé à chaque (re)connexion. */
  | { type: 'snapshot'; payload: Alert[] }
  /** Alertes dont le statut a changé (action d'un analyste). */
  | { type: 'update'; payload: Alert[] }
  | { type: 'error'; status_code: number; message: string };

const SEVERITIES: readonly string[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: readonly string[] = ['active', 'banned', 'ignored'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export const isAlert = (p: unknown): p is Alert =>
  isObj(p) &&
  isStr(p.id) &&
  isStr(p.ip) &&
  isStr(p.timestamp) &&
  !Number.isNaN(Date.parse(p.timestamp)) &&
  isStr(p.severity) &&
  SEVERITIES.includes(p.severity) &&
  isStr(p.threat_type) &&
  isStr(p.status) &&
  STATUSES.includes(p.status);

/** Frontière de confiance : tout ce qui vient du socket est validé ici, sinon ignoré. */
export const parseWsMessage = (raw: unknown): WsMessage | null => {
  if (typeof raw !== 'string') return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data)) return null;

  if (data.type === 'alert' && isAlert(data.payload)) {
    return { type: 'alert', payload: data.payload };
  }
  if ((data.type === 'snapshot' || data.type === 'update') && Array.isArray(data.payload)) {
    // Une entrée invalide est écartée sans rejeter le reste du lot.
    return { type: data.type, payload: data.payload.filter(isAlert) };
  }
  if (data.type === 'error' && typeof data.status_code === 'number' && isStr(data.message)) {
    return { type: 'error', status_code: data.status_code, message: data.message };
  }
  return null;
};
