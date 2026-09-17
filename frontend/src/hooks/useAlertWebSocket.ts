import useWebSocketImport from 'react-use-websocket';
import { toast } from 'sonner';
import { useAlertStore } from '@/store/useAlertStore';
import { WS_URL } from '@/lib/config';
import { parseWsMessage } from '@/lib/wsMessage';

// react-use-websocket est publié en CommonJS : selon le bundler, l'export par défaut
// arrive directement ou enveloppé dans { default }.
const useWebSocket = (
  typeof useWebSocketImport === 'function'
    ? useWebSocketImport
    : (useWebSocketImport as unknown as { default: typeof useWebSocketImport }).default
) as typeof useWebSocketImport;

const MAX_RECONNECT_DELAY_MS = 30_000;

export const useAlertWebSocket = () => {
  const { readyState } = useWebSocket(WS_URL, {
    // Chaque message est traité dans le callback : lire lastJsonMessage dans un
    // useEffect perdrait des alertes quand React regroupe plusieurs rendus.
    onMessage: (event) => {
      const message = parseWsMessage(event.data);
      if (!message) {
        console.warn('Message WebSocket ignoré (format invalide) :', event.data);
        return;
      }
      if (message.type === 'error') {
        toast.error(`Erreur ${message.status_code} — ${message.message}`);
        return;
      }
      useAlertStore.getState().addAlert(message.payload);
    },
    // Les messages passent par onMessage : inutile de re-rendre le composant à chaque réception.
    filter: () => false,
    shouldReconnect: () => true,
    reconnectAttempts: Infinity,
    reconnectInterval: (attempt) => Math.min(1000 * 2 ** attempt, MAX_RECONNECT_DELAY_MS),
  });

  return { readyState };
};
