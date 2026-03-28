import { supabase } from '../lib/supabase';

export const matchService = {
  async getSmartMatches(shipmentId: string) {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        route:routes (
          *,
          truck:trucks (*)
        )
      `)
      .eq('shipment_id', shipmentId)
      .eq('status', 'suggested');

    if (error) throw error;
    return matches || [];
  },

  async acceptMatch(matchId: string) {
    const { data, error } = await supabase
      .from('matches')
      .update({ status: 'accepted' })
      .eq('id', matchId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
