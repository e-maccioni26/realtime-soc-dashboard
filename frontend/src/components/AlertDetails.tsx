import { useState } from 'react';
import { Alert, useAlertStore } from '@/store/useAlertStore';
import { useIpInfo } from '@/hooks/useIpInfo';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldBan, CheckCircle2, Globe, Building, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';

interface AlertDetailsProps {
  alert: Alert | null;
  onClose: () => void;
}

export const AlertDetails = ({ alert, onClose }: AlertDetailsProps) => {
  const { updateAlertStatus } = useAlertStore();
  const { data: ipInfo, isLoading, isError } = useIpInfo(alert?.ip || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleAction = async (action: 'banned' | 'ignored') => {
    if (!alert) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/alerts/${encodeURIComponent(alert.id)}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action === 'banned' ? 'ban' : 'ignore' }),
      });

      if (!response.ok) throw new Error('Erreur API');

      updateAlertStatus(alert.id, action);
      toast.success(`Action validée : l'IP ${alert.ip} a été ${action === 'banned' ? 'bannie' : 'ignorée'}`);
      onClose();
    } catch {
      toast.error("Le serveur backend n'a pas pu traiter cette action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={!!alert} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Investigation IP : <span className="font-mono text-primary">{alert?.ip}</span>
          </SheetTitle>
          <SheetDescription>
            Alerte émise le {alert ? new Date(alert.timestamp).toLocaleString('fr-FR') : ''}
          </SheetDescription>
        </SheetHeader>

        {alert && (
          <div className="px-4 py-6 space-y-6">
            <div className="space-y-3 bg-muted/40 p-4 rounded-lg border border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Type de Menace</span>
                <span className="font-semibold text-sm">{alert.threat_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sévérité</span>
                <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="uppercase">
                  {alert.severity}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge className="capitalize">{alert.status}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> OSINT & Géolocalisation (IPinfo)
              </h4>

              {isLoading && (
                <div className="flex items-center justify-center p-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Enrichissement en cours...</span>
                </div>
              )}

              {isError && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                  Impossible de récupérer les informations WHOIS pour cette adresse.
                </div>
              )}

              {ipInfo && (
                <div className="space-y-2 text-sm border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{ipInfo.city ? `${ipInfo.city}, ${ipInfo.country}` : 'Localisation indéterminée'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{ipInfo.org || 'Fournisseur d\'accès inconnu'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                disabled={isSubmitting || alert.status === 'banned'}
                onClick={() => handleAction('banned')}
              >
                <ShieldBan className="h-4 w-4" /> Bannir
              </Button>
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                disabled={isSubmitting || alert.status === 'ignored'}
                onClick={() => handleAction('ignored')}
              >
                <CheckCircle2 className="h-4 w-4" /> Ignorer
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};