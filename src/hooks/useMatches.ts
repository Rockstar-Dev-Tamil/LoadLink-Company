import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Match = Database['public']['Tables']['matches']['Row'] & {
  route: Database['public']['Tables']['routes']['Row'] & {
    truck: Database['public']['Tables']['trucks']['Row'];
  };
};

export function useMatches(shipmentId: string | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    if (!shipmentId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('matches')
        .select(`
          *,
          route:routes!inner (
            *,
            truck:trucks!inner (*)
          )
        `)
        .eq('shipment_id', shipmentId)
        .order('match_score', { ascending: false });

      if (fetchError) throw fetchError;
      setMatches(data as any[] || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shipmentId) {
      setMatches([]);
      return;
    }

    let timeout: any;
    const debouncedFetch = () => {
      clearTimeout(timeout);
      timeout = setTimeout(fetchMatches, 1000);
    };

    fetchMatches();

    const channel = supabase
      .channel(`matches:${shipmentId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `shipment_id=eq.${shipmentId}` },
        debouncedFetch
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [shipmentId]);

  return { matches, loading, error, refresh: fetchMatches };
}
