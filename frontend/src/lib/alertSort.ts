import { Alert } from '@/store/useAlertStore';
import { STATUS_LABELS } from '@/lib/labels';

export type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'severity_desc'
  | 'severity_asc'
  | 'threat_type'
  | 'status';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_desc', label: 'Date (plus récentes)' },
  { value: 'date_asc', label: 'Date (plus anciennes)' },
  { value: 'severity_desc', label: 'Criticité (critique → faible)' },
  { value: 'severity_asc', label: 'Criticité (faible → critique)' },
  { value: 'threat_type', label: 'Type de menace (A → Z)' },
  { value: 'status', label: 'Statut (A → Z)' },
];

const SEVERITY_RANK: Record<Alert['severity'], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export const sortAlerts = (alerts: Alert[], sortBy: SortOption): Alert[] => {
  const sorted = [...alerts];

  switch (sortBy) {
    case 'date_desc':
      return sorted.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    case 'date_asc':
      return sorted.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    case 'severity_desc':
      return sorted.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    case 'severity_asc':
      return sorted.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
    case 'threat_type':
      return sorted.sort((a, b) => a.threat_type.localeCompare(b.threat_type));
    case 'status':
      return sorted.sort((a, b) => STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status], 'fr'));
    default:
      return sorted;
  }
};