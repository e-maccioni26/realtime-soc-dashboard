import type { Alert } from '@/store/useAlertStore';

export const SEVERITY_LABELS: Record<Alert['severity'], string> = {
  critical: 'Critique',
  high: 'Élevée',
  medium: 'Moyenne',
  low: 'Faible',
};

export const STATUS_LABELS: Record<Alert['status'], string> = {
  active: 'Active',
  banned: 'Bannie',
  ignored: 'Ignorée',
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
