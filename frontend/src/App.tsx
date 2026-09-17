import { useState, useMemo } from 'react';
import { useAlertStore } from '@/store/useAlertStore';
import { useAlertWebSocket } from '@/hooks/useAlertWebSocket';
import { Header } from '@/components/Header';
import { AlertFilters } from '@/components/AlertFilters';
import { AlertList } from '@/components/AlertList';
import { AlertDetails } from '@/components/AlertDetails';
import { sortAlerts, SortOption } from '@/lib/alertSort';

export default function App() {
  const { readyState } = useAlertWebSocket();
  const alerts = useAlertStore((state) => state.alerts);

  // On garde l'id et non une copie : le panneau suit ainsi les mises à jour du store.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAlert = alerts.find((a) => a.id === selectedId) ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

 const filteredAlerts = useMemo(() => {
    const filtered = alerts.filter((alert) => {
      const matchSearch =
        alert.ip.includes(searchQuery) ||
        alert.threat_type.toLowerCase().includes(searchQuery.toLowerCase());
 
      const matchSeverity =
        selectedSeverity === 'all' || alert.severity === selectedSeverity;
 
      const matchStatus =
        selectedStatus === 'all' || alert.status === selectedStatus;
 
      return matchSearch && matchSeverity && matchStatus;
    });
 
    return sortAlerts(filtered, sortBy);
  }, [alerts, searchQuery, selectedSeverity, selectedStatus, sortBy]);

  return (
     <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <Header readyState={readyState} />
 
      <main className="flex-1 p-6 w-full max-w-screen-2xl mx-auto">
        <AlertFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedSeverity={selectedSeverity}
          setSelectedSeverity={setSelectedSeverity}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
 
        <AlertList
          alerts={filteredAlerts}
          onSelectAlert={(alert) => setSelectedId(alert.id)}
        />
      </main>
 
      <AlertDetails
        alert={selectedAlert}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}