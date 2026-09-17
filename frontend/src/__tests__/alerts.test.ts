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
});

describe('parseWsMessage', () => {
  it('accepte une alerte et une erreur valides', () => {
    expect(parseWsMessage(JSON.stringify({ type: 'alert', payload: makeAlert('a') }))?.type).toBe('alert');
    expect(parseWsMessage(JSON.stringify({ type: 'error', status_code: 502, message: 'x' }))?.type).toBe('error');
  });

  it('écarte les entrées invalides d’un snapshot sans rejeter le lot', () => {
    const raw = JSON.stringify({ type: 'snapshot', payload: [makeAlert('a'), { id: 'b' }, makeAlert('c')] });
    const message = parseWsMessage(raw);
    expect(message?.type).toBe('snapshot');
    expect(message?.type === 'snapshot' && message.payload.map((a) => a.id)).toEqual(['a', 'c']);
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

  const ids = (list: Alert[]) => list.map((a) => a.id);
  const state = () => useAlertStore.getState();

  it('ignore les doublons', () => {
    state().upsertAlerts([makeAlert('a')], { highlight: true });
    state().upsertAlerts([makeAlert('a')], { highlight: true });
    expect(state().alerts).toHaveLength(1);
  });

  it('met à jour sur place une alerte connue, y compris en attente', () => {
    state().upsertAlerts([makeAlert('a')]);
    state().toggleLive();
    state().upsertAlerts([makeAlert('b')]);
    state().upsertAlerts([
      { ...makeAlert('a'), status: 'banned' },
      { ...makeAlert('b'), status: 'banned' },
    ]);
    expect(state().alerts.map((a) => a.status)).toEqual(['banned']);
    expect(state().pendingAlerts.map((a) => a.status)).toEqual(['banned']);
  });

  it('ne surligne pas un snapshot, surligne une nouvelle alerte', () => {
    state().upsertAlerts([makeAlert('a'), makeAlert('b')]);
    expect(state().recentlyArrivedIds.size).toBe(0);
    state().upsertAlerts([makeAlert('c')], { highlight: true });
    expect([...state().recentlyArrivedIds]).toEqual(['c']);
  });

  it('met les alertes en attente pendant la pause puis les restitue', () => {
    state().upsertAlerts([makeAlert('a')]);
    state().toggleLive();
    state().upsertAlerts([makeAlert('b')], { highlight: true });
    expect(ids(state().alerts)).toEqual(['a']);
    expect(ids(state().pendingAlerts)).toEqual(['b']);

    state().toggleLive();
    expect(ids(state().alerts)).toEqual(['b', 'a']);
    expect(state().pendingAlerts).toHaveLength(0);
  });

  it('un snapshot de reconnexion n’ajoute que les alertes manquées', () => {
    state().upsertAlerts([makeAlert('b'), makeAlert('a')]);
    state().upsertAlerts([makeAlert('d'), makeAlert('c'), makeAlert('b'), makeAlert('a')]);
    expect(ids(state().alerts)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('plafonne le nombre d’alertes en mémoire', () => {
    const many = Array.from({ length: MAX_ALERTS + 10 }, (_, i) => makeAlert(String(MAX_ALERTS + 9 - i)));
    state().upsertAlerts(many);
    expect(state().alerts).toHaveLength(MAX_ALERTS);
    expect(state().alerts[0].id).toBe(String(MAX_ALERTS + 9));
  });
});
