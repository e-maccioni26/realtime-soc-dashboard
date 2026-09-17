import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown } from 'lucide-react';
import { SORT_OPTIONS, SortOption } from '@/lib/alertSort';
import { SEVERITY_LABELS, STATUS_LABELS } from '@/lib/labels';

interface AlertFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedSeverity: string;
  setSelectedSeverity: (severity: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
}

export const AlertFilters = ({
  searchQuery,
  setSearchQuery,
  selectedSeverity,
  setSelectedSeverity,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  setSortBy,
}: AlertFiltersProps) => {
  const severities = ['all', ...Object.keys(SEVERITY_LABELS)] as const;
  const statuses = ['all', ...Object.keys(STATUS_LABELS)] as const;

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/50 p-4 rounded-xl border border-border/50 mb-6">
      <div className="relative w-full md:w-72">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher IP, menace..."
          aria-label="Rechercher une IP ou un type de menace"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Sévérité:</span>
        {severities.map((sev) => (
          <Button
            key={sev}
            variant={selectedSeverity === sev ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSeverity(sev)}
            className="h-8 text-xs"
          >
            {sev === 'all' ? 'Toutes' : SEVERITY_LABELS[sev as keyof typeof SEVERITY_LABELS]}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="text-xs font-semibold text-muted-foreground mr-1">Statut:</span>
        {statuses.map((st) => (
          <Button
            key={st}
            variant={selectedStatus === st ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedStatus(st)}
            className="h-8 text-xs"
          >
            {st === 'all' ? 'Tous' : STATUS_LABELS[st as keyof typeof STATUS_LABELS]}
          </Button>
        ))}
      </div>

      <div className="relative w-full md:w-56">
        <ArrowUpDown className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          aria-label="Trier les alertes"
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 appearance-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};