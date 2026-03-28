import { Database } from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Truck = Database['public']['Tables']['trucks']['Row'];

export type Shipment = Database['public']['Tables']['shipments']['Row'] & {
  matches?: Match[];
  bookings?: Booking[];
};

export type Route = Database['public']['Tables']['routes']['Row'] & {
  truck?: Truck & { driver?: Profile };
};

export type Match = Database['public']['Tables']['matches']['Row'] & {
  route?: Route;
};

export type Booking = Database['public']['Tables']['bookings']['Row'] & {
  driver?: Profile;
  payments?: Payment[];
};

export type Payment = Database['public']['Tables']['payments']['Row'];

export type Message = Database['public']['Tables']['messages']['Row'] & {
  sender?: Profile;
  receiver?: Profile;
};

export type Tracking = Database['public']['Tables']['tracking']['Row'];

export type Sustainability = Database['public']['Tables']['sustainability']['Row'];
