import { Alert, useAlertStore } from '@/store/useAlertStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Eye } from 'lucide-react';
import { SEVERITY_LABELS, STATUS_LABELS, formatDateTime } from '@/lib/labels';

interface AlertListProps {
  alerts: Alert[];
  onSelectAlert: (alert: Alert) => void;
}

const severityConfig: Record<Alert['severity'], { color: string; glow: string }> = {
  critical: { color: 'bg-red-500/20 text-red-500 border-red-500/30', glow: 'rgb(239 68 68 / 0.18)' },
  high: { color: 'bg-orange-500/20 text-orange-500 border-orange-500/30', glow: 'rgb(249 115 22 / 0.18)' },
  medium: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', glow: 'rgb(234 179 8 / 0.18)' },
  low: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', glow: 'rgb(59 130 246 / 0.18)' },
};

export const AlertList = ({ alerts, onSelectAlert }: AlertListProps) => {
  const recentlyArrivedIds = useAlertStore((state) => state.recentlyArrivedIds);

  if (alerts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed rounded-xl bg-card/30">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Aucune menace détectée</h3>
        <p className="text-sm text-muted-foreground mt-1">Le flux est calme ou les filtres sont trop restrictifs.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>IP Source</TableHead>
            <TableHead>Menace</TableHead>
            <TableHead>Sévérité</TableHead>
            <TableHead>Date / Heure</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => {
            const isNew = recentlyArrivedIds.has(alert.id);
            return (
              <TableRow
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAlert(alert);
                  }
                }}
                tabIndex={0}
                aria-label={`Investiguer l'alerte ${alert.threat_type} depuis ${alert.ip}`}
                className={`cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none transition-colors ${isNew ? 'alert-row-new' : ''}`}
                style={isNew ? ({ '--row-glow': severityConfig[alert.severity].glow } as React.CSSProperties) : undefined}
              >
                <TableCell className="font-mono text-sm">{alert.ip}</TableCell>
                <TableCell className="font-medium">{alert.threat_type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`font-bold ${severityConfig[alert.severity].color}`}>
                    {SEVERITY_LABELS[alert.severity].toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDateTime(alert.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant={alert.status === 'banned' ? 'destructive' : 'secondary'} className="capitalize">
                    {STATUS_LABELS[alert.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Eye aria-hidden className="h-4 w-4 inline text-muted-foreground hover:text-primary" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};