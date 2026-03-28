import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl:true,
      storageKey:        'loadlink_auth',
    },
    realtime: {
      params: {
        eventsPerSecond: 20,     // increase from default 10
      },
      heartbeatIntervalMs: 15000,  // keep alive every 15s
      reconnectAfterMs: (tries: number) =>
        Math.min(tries * 500, 5000),  // exponential backoff, max 5s
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: { 'x-client-info': 'loadlink-msme/1.0' }
    }
  }
)

export function getRealtimeStatus() {
  return supabase.realtime.connectionState()
}
