import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/config';

export interface IpInfoResponse {
  ip: string;
  /** IP privée ou réservée : aucune donnée publique disponible. */
  bogon: boolean;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  timezone?: string;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Passe par le backend : l'IP de l'analyste et le token IPinfo ne sortent pas du serveur.
const fetchIpInfo = async (ip: string): Promise<IpInfoResponse> => {
  const response = await fetch(`${API_URL}/api/ip/${encodeURIComponent(ip)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new HttpError(response.status, body?.detail ?? "Erreur lors de la récupération des informations de l'IP");
  }
  return response.json();
};

export const useIpInfo = (ip: string | null) => {
  return useQuery({
    queryKey: ['ipinfo', ip],
    queryFn: () => fetchIpInfo(ip as string),
    enabled: !!ip,
    staleTime: 1000 * 60 * 60,
    // Réessayer une erreur 4xx (IP invalide, quota) ne changerait rien.
    retry: (failureCount, error) =>
      failureCount < 1 && !(error instanceof HttpError && error.status < 500),
  });
};
