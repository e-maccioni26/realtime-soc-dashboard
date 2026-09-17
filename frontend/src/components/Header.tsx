import { useAlertStore } from '@/store/useAlertStore';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Pause, Play, ShieldAlert } from 'lucide-react';
import { ReadyState } from 'react-use-websocket';

interface HeaderProps {
  readyState: ReadyState;
}

export const Header = ({ readyState }: HeaderProps) => {
  const isLive = useAlertStore((s) => s.isLive);
  const toggleLive = useAlertStore((s) => s.toggleLive);
  const pendingCount = useAlertStore((s) => s.pendingAlerts.length);

  const connectionStatus = {
    [ReadyState.CONNECTING]: { label: 'Connexion...', color: 'bg-yellow-500' },
    [ReadyState.OPEN]: { label: 'Live', color: 'bg-green-500' },
    [ReadyState.CLOSING]: { label: 'Déconnexion...', color: 'bg-orange-500' },
    [ReadyState.CLOSED]: { label: 'Hors ligne', color: 'bg-red-500' },
    [ReadyState.UNINSTANTIATED]: { label: 'Inactif', color: 'bg-gray-500' },
  }[readyState];

  return (
    <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">SOC Threat Monitor</h1>
          <p className="text-xs text-muted-foreground">Supervision des alertes en temps réel</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${connectionStatus?.color || 'bg-gray-500'}`} />
          <span>{connectionStatus?.label || 'Inconnu'}</span>
        </div>

        <Button
          variant={isLive ? "outline" : "default"}
          size="sm"
          onClick={toggleLive}
          className="gap-2 min-w-32"
        >
          {isLive ? (
            <>
              <Pause className="h-4 w-4 text-amber-500" /> Pause Flux
            </>
          ) : (
            <>
              <Play className="h-4 w-4 text-green-500" /> Reprendre{pendingCount > 0 && ` (${pendingCount})`}
            </>
          )}
        </Button>

        <ThemeToggle />
      </div>
    </header>
  );
};