import { create } from 'zustand';

export interface Alert {
  id: string;
  ip: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threat_type: string;
  status: 'active' | 'banned' | 'ignored';
  is_read: boolean;
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
  addAlert: (alert: Alert) => void;
  updateAlertStatus: (id: string, status: Alert['status']) => void;
  toggleLive: () => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  pendingAlerts: [],
  isLive: true,
  recentlyArrivedIds: new Set(),

  addAlert: (alert) =>
    set((state) => {
      const known = (a: Alert) => a.id === alert.id;
      if (state.alerts.some(known) || state.pendingAlerts.some(known)) return state;

      if (!state.isLive) {
        return { pendingAlerts: [alert, ...state.pendingAlerts].slice(0, MAX_ALERTS) };
      }

      setTimeout(() => {
        set((s) => {
          if (!s.recentlyArrivedIds.has(alert.id)) return s;
          const next = new Set(s.recentlyArrivedIds);
          next.delete(alert.id);
          return { recentlyArrivedIds: next };
        });
      }, NEW_ALERT_HIGHLIGHT_MS);

      const recentlyArrivedIds = new Set(state.recentlyArrivedIds);
      recentlyArrivedIds.add(alert.id);

      return { alerts: [alert, ...state.alerts].slice(0, MAX_ALERTS), recentlyArrivedIds };
    }),

  updateAlertStatus: (id, status) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, status, is_read: true } : a)),
    })),

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
