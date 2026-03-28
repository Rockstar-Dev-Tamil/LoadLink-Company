import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';

type ShipmentInsert = Database['public']['Tables']['shipments']['Insert'];

export const shipmentService = {
  async createShipment(data: ShipmentInsert) {
    const { data: shipment, error } = await supabase
      .from('shipments')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return shipment;
  },

  async getMyShipments(businessId: string) {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .eq('business_id', businessId);

    if (error) throw error;
    return data || [];
  }
};
