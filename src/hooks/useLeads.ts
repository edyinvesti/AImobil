import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils';

export interface Lead {
  id: string | number;
  name: string;
  phone: string;
  interest: string;
  notes: string;
  score: number;
  status: string;
  date: string;
  potential_value: number;
  property_id: number | null;
  last_contacted: string;
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const API_BASE = getApiUrl();
    
    if (!API_BASE) {
      setLeads([]);
      setStats(null);
      setError(null);
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/leads`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setStats(data.stats || null);
        setError(null);
      } else {
        setError('Falha ao carregar leads');
      }
    } catch (err) {
      console.error('Erro ao buscar leads:', err);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    // Refresh every 30 seconds for "Live Sync" feel
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  return { leads, stats, loading, error, refresh: fetchLeads };
}
