export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PostgisPoint = {
  type: 'Point'
  coordinates: [number, number]
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: string
          name: string
          email: string
          home_city: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: string
          name: string
          email: string
          home_city?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: string
          name?: string
          email?: string
          home_city?: string | null
          created_at?: string
        }
        Relationships: []
      }
      trucks: {
        Row: {
          id: string
          driver_id: string
          vehicle_number: string | null
          vehicle_type: string
          capacity_kg: number
          capacity_volume: number | null
          ulip_verified: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          vehicle_number?: string | null
          vehicle_type: string
          capacity_kg: number
          capacity_volume?: number | null
          ulip_verified?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          vehicle_number?: string | null
          vehicle_type?: string
          capacity_kg?: number
          capacity_volume?: number | null
          ulip_verified?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trucks_driver_id_fkey"
            columns: ["driver_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      shipments: {
        Row: {
          id: string
          business_id: string
          pickup_address: string
          drop_address: string
          pickup_location: PostgisPoint
          drop_location: PostgisPoint
          weight_kg: number
          price: number
          is_partial: boolean
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          pickup_address: string
          drop_address: string
          pickup_location: PostgisPoint
          drop_location: PostgisPoint
          weight_kg: number
          price: number
          is_partial?: boolean
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          pickup_address?: string
          drop_address?: string
          pickup_location?: PostgisPoint
          drop_location?: PostgisPoint
          weight_kg?: number
          price?: number
          is_partial?: boolean
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      routes: {
        Row: {
          id: string
          truck_id: string
          origin: string
          destination: string
          origin_location: PostgisPoint
          destination_location: PostgisPoint
          departure_time: string
          expected_arrival: string
          is_return_trip: boolean | null
          available_capacity_kg: number
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          truck_id: string
          origin: string
          destination: string
          origin_location: PostgisPoint
          destination_location: PostgisPoint
          departure_time: string
          expected_arrival: string
          is_return_trip?: boolean | null
          available_capacity_kg: number
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          truck_id?: string
          origin?: string
          destination?: string
          origin_location?: PostgisPoint
          destination_location?: PostgisPoint
          departure_time?: string
          expected_arrival?: string
          is_return_trip?: boolean | null
          available_capacity_kg?: number
          status?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_truck_id_fkey"
            columns: ["truck_id"]
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          shipment_id: string
          driver_id: string
          business_id: string
          route_id: string | null
          agreed_price: number
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shipment_id: string
          driver_id: string
          business_id: string
          route_id?: string | null
          agreed_price: number
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shipment_id?: string
          driver_id?: string
          business_id?: string
          route_id?: string | null
          agreed_price?: number
          status?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shipment_id_fkey"
            columns: ["shipment_id"]
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          }
        ]
      }
      matches: {
        Row: {
          id: string
          route_id: string
          shipment_id: string
          match_score: number
          detour_km: number
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          shipment_id: string
          match_score: number
          detour_km: number
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          shipment_id?: string
          match_score?: number
          detour_km?: number
          status?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_shipment_id_fkey"
            columns: ["shipment_id"]
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          driver_id: string
          business_id: string
          booking_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          business_id: string
          booking_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          business_id?: string
          booking_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_driver_id_fkey"
            columns: ["driver_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      route_cache: {
        Row: {
          id: string
          url_hash: string
          route_data: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          url_hash: string
          route_data: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          url_hash?: string
          route_data?: Json
          created_at?: string | null
        }
        Relationships: []
      }
      tracking: {
        Row: {
          id: string
          booking_id: string
          location: PostgisPoint
          speed: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          location: PostgisPoint
          speed?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          location?: PostgisPoint
          speed?: number | null
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_booking_id_fkey"
            columns: ["booking_id"]
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          payment_status: string | null
          payment_method: string | null
          transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          payment_status?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          payment_status?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      sustainability: {
        Row: {
          id: string
          route_id: string
          distance_saved_km: number | null
          fuel_saved_liters: number | null
          co2_reduction_kg: number | null
          created_at: string
        }
        Insert: {
          id?: string
          route_id: string
          distance_saved_km?: number | null
          fuel_saved_liters?: number | null
          co2_reduction_kg?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          route_id?: string
          distance_saved_km?: number | null
          fuel_saved_liters?: number | null
          co2_reduction_kg?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sustainability_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          }
        ]
      }
      messages: {
        Row: {
          id: string
          shipment_id: string | null
          sender_id: string
          receiver_id: string
          content: string
          type: string
          metadata: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          shipment_id?: string | null
          sender_id: string
          receiver_id: string
          content: string
          type?: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          shipment_id?: string | null
          sender_id?: string
          receiver_id?: string
          content?: string
          type?: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_shipment_id_fkey"
            columns: ["shipment_id"]
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          }
        ]
      }
      user_locations: {
        Row: {
          id: string
          device_id: string
          latitude: number
          longitude: number
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          latitude: number
          longitude: number
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_device_id_fkey"
            columns: ["device_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
