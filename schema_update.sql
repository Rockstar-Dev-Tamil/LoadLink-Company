-- Consolidated Schema Update for LoadLink MSME Dashboard
-- Part 1: Standard Core Tables (as provided by user)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  role text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  home_city text
);

-- Trucks
CREATE TABLE IF NOT EXISTS public.trucks (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  vehicle_number text,
  vehicle_type text NOT NULL,
  capacity_kg integer NOT NULL,
  capacity_volume numeric,
  ulip_verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.profiles(id),
  pickup_address text NOT NULL,
  drop_address text NOT NULL,
  pickup_location geography(POINT) NOT NULL,
  drop_location geography(POINT) NOT NULL,
  weight_kg numeric NOT NULL,
  price numeric NOT NULL,
  is_partial boolean NOT NULL DEFAULT false,
  status text NOT NULL
);

-- Routes
CREATE TABLE IF NOT EXISTS public.routes (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  truck_id uuid NOT NULL REFERENCES public.trucks(id),
  origin text NOT NULL,
  destination text NOT NULL,
  origin_location geography(POINT) NOT NULL,
  destination_location geography(POINT) NOT NULL,
  departure_time timestamp with time zone NOT NULL,
  expected_arrival timestamp with time zone NOT NULL,
  is_return_trip boolean DEFAULT false,
  available_capacity_kg integer NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id),
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  business_id uuid NOT NULL REFERENCES public.profiles(id),
  route_id uuid REFERENCES public.routes(id),
  agreed_price numeric NOT NULL,
  status text DEFAULT 'requested'::text CHECK (status = ANY (ARRAY['requested'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES public.routes(id),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id),
  match_score numeric NOT NULL,
  detour_km numeric NOT NULL,
  status text DEFAULT 'suggested'::text CHECK (status = ANY (ARRAY['suggested'::text, 'accepted'::text, 'rejected'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  business_id uuid NOT NULL REFERENCES public.profiles(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  rating numeric NOT NULL CHECK (rating >= 1::numeric AND rating <= 5::numeric),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Route Cache
CREATE TABLE IF NOT EXISTS public.route_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  url_hash text NOT NULL UNIQUE,
  route_data jsonb NOT NULL,
  created_at timestamp without time zone DEFAULT now()
);

-- Tracking
CREATE TABLE IF NOT EXISTS public.tracking (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  location geography(POINT) NOT NULL,
  speed numeric DEFAULT 0,
  recorded_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Part 2: Missing Tables for Dashboard (added by Assistant)

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  amount numeric NOT NULL,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])),
  payment_method text,
  transaction_id text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Sustainability
CREATE TABLE IF NOT EXISTS public.sustainability (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id uuid NOT NULL REFERENCES public.routes(id),
  distance_saved_km numeric DEFAULT 0,
  fuel_saved_liters numeric DEFAULT 0,
  co2_reduction_kg numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);
