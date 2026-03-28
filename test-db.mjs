import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  try {
     console.log("Starting test...");
     
     const email = 'test_user_loadlink_' + Date.now() + '@example.com';
     console.log("Signing up with", email);
     const response = await supabase.auth.signUp({
       email,
       password: 'TestPassword123!'
     });
     
     console.log("Signup Response:", JSON.stringify(response, null, 2));

     const uid = response.data?.user?.id;
     if(!uid) {
        console.error("No UID returned from signup.");
        process.exit(1);
     }

     console.log("Upserting profile for UID", uid);
     const profResponse = await supabase.from('profiles').upsert([{ 
        id: uid, 
        role: 'business', 
        name: 'LoadLink Test Business',
        email: email 
     }]);
     
     console.log("Profile Upsert Response:", JSON.stringify(profResponse, null, 2));

     console.log("Inserting shipment...");
     const shipResponse = await supabase.from('shipments').insert([{ 
        business_id: uid, 
        status: 'pending',
        is_partial: false, 
        pickup_address: 'Mumbai Warehouse', 
        drop_address: 'Pune Distribution Center', 
        pickup_location: { type: 'Point', coordinates: [72.8777, 19.0760] },
        drop_location: { type: 'Point', coordinates: [73.8567, 18.5204] },
        weight_kg: 100,
        price: 5000
     }]);

     console.log("Shipment Insert Response:", JSON.stringify(shipResponse, null, 2));
     
     process.exit(0);
  } catch (err) {
     console.error("Caught exception:", err);
     process.exit(1);
  }
}

test();
