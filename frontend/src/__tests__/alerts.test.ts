import { describe, it, expect, beforeEach } from 'vitest';
import { parseWsMessage } from '@/lib/wsMessage';
import { useAlertStore, MAX_ALERTS, type Alert } from '@/store/useAlertStore';

const makeAlert = (id: string): Alert => ({
  id,
  ip: '8.8.8.8',
  timestamp: '2026-09-17T10:00:00Z',
  severity: 'high',
  threat_type: 'Scan de ports',
  status: 'active',
  is_read: false,
});

describe('parseWsMessage', () => {
  it('accepte une alerte et une erreur valides', () => {
    expect(parseWsMessage(JSON.stringify({ type: 'alert', payload: makeAlert('a') }))?.type).toBe('alert');
    expect(parseWsMessage(JSON.stringify({ type: 'error', status_code: 502, message: 'x' }))?.type).toBe('error');
  });

  it('rejette les messages invalides', () => {
    expect(parseWsMessage('pas du json')).toBeNull();
    expect(parseWsMessage(new Blob())).toBeNull();
    expect(parseWsMessage('null')).toBeNull();
    expect(parseWsMessage(JSON.stringify({ type: 'alert', payload: { ...makeAlert('a'), severity: 'extreme' } }))).toBeNull();
    expect(parseWsMessage(JSON.stringify({ type: 'alert', payload: { ...makeAlert('a'), timestamp: 'hier' } }))).toBeNull();
    expect(parseWsMessage(JSON.stringify({ type: 'error', message: 'sans code' }))).toBeNull();
  });
});

describe('useAlertStore', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [], pendingAlerts: [], isLive: true, recentlyArrivedIds: new Set() });
  });

  it('ignore les doublons', () => {
    const { addAlert } = useAlertStore.getState();
    addAlert(makeAlert('a'));
    addAlert(makeAlert('a'));
    expect(useAlertStore.getState().alerts).toHaveLength(1);
  });

  it('met les alertes en attente pendant la pause puis les restitue', () => {
    const s = useAlertStore.getState();
    s.addAlert(makeAlert('a'));
    s.toggleLive();
    s.addAlert(makeAlert('b'));
    s.addAlert(makeAlert('b'));
    expect(useAlertStore.getState().alerts.map((a) => a.id)).toEqual(['a']);
    expect(useAlertStore.getState().pendingAlerts).toHaveLength(1);

    s.toggleLive();
    expect(useAlertStore.getState().alerts.map((a) => a.id)).toEqual(['b', 'a']);
    expect(useAlertStore.getState().pendingAlerts).toHaveLength(0);
  });

  it('plafonne le nombre d’alertes en mémoire', () => {
    const { addAlert } = useAlertStore.getState();
    for (let i = 0; i < MAX_ALERTS + 10; i++) addAlert(makeAlert(String(i)));
    expect(useAlertStore.getState().alerts).toHaveLength(MAX_ALERTS);
    expect(useAlertStore.getState().alerts[0].id).toBe(String(MAX_ALERTS + 9));
  });
});
