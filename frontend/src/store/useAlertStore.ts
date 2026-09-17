import { create } from 'zustand';

export interface Alert {
  id: string;
  ip: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threat_type: string;
  status: 'active' | 'banned' | 'ignored';
}

const NEW_ALERT_HIGHLIGHT_MS = 1400;
// ponytail: plafond en mémoire, virtualiser le tableau si on veut en garder plus
export const MAX_ALERTS = 500;

interface AlertStore {
  alerts: Alert[];
  /** Alertes reçues pendant la pause, affichées à la reprise. */
  pendingAlerts: Alert[];
  isLive: boolean;
  recentlyArrivedIds: Set<string>;
  /**
   * Point d'entrée unique pour les données serveur (snapshot, nouvelle alerte, mise à jour).
   * `incoming` est trié du plus récent au plus ancien. Les alertes connues sont mises à jour
   * sur place, les nouvelles sont ajoutées (ou mises en attente si le flux est en pause).
   */
  upsertAlerts: (incoming: Alert[], options?: { highlight?: boolean }) => void;
  toggleLive: () => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  pendingAlerts: [],
  isLive: true,
  recentlyArrivedIds: new Set(),

  upsertAlerts: (incoming, { highlight = false } = {}) =>
    set((state) => {
      const byId = new Map(incoming.map((a) => [a.id, a]));
      const refresh = (list: Alert[]) => list.map((a) => byId.get(a.id) ?? a);
      const alerts = refresh(state.alerts);
      const pendingAlerts = refresh(state.pendingAlerts);

      const known = new Set([...alerts, ...pendingAlerts].map((a) => a.id));
      const fresh = incoming.filter((a) => !known.has(a.id));

      if (fresh.length === 0) return { alerts, pendingAlerts };
      if (!state.isLive) {
        return { alerts, pendingAlerts: [...fresh, ...pendingAlerts].slice(0, MAX_ALERTS) };
      }
      if (!highlight) {
        return { alerts: [...fresh, ...alerts].slice(0, MAX_ALERTS), pendingAlerts };
      }

      const freshIds = fresh.map((a) => a.id);
      setTimeout(() => {
        set((s) => {
          const next = new Set(s.recentlyArrivedIds);
          freshIds.forEach((id) => next.delete(id));
          return { recentlyArrivedIds: next };
        });
      }, NEW_ALERT_HIGHLIGHT_MS);

      return {
        alerts: [...fresh, ...alerts].slice(0, MAX_ALERTS),
        pendingAlerts,
        recentlyArrivedIds: new Set([...state.recentlyArrivedIds, ...freshIds]),
      };
    }),

  toggleLive: () =>
    set((state) =>
      state.isLive
        ? { isLive: false }
        : {
            isLive: true,
            alerts: [...state.pendingAlerts, ...state.alerts].slice(0, MAX_ALERTS),
            pendingAlerts: [],
          }
    ),
}));
