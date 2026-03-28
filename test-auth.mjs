import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if(!supabaseUrl || !supabaseKey) {
    console.error("Missing ENV vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    console.log("Attempting test signup...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test_auto_' + Date.now() + '@example.com',
        password: 'TestPassword123!'
    });
    
    if(signUpError) {
        console.error("Signup failed:", signUpError.message);
    } else {
        console.log("Signup success! Session:", !!signUpData.session);
    }
    
    console.log("Attempting sign in with invalid credentials...");
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test_auto_' + Date.now() + '@example.com',
        password: 'WrongPassword'
    });
    console.log("Sign in error:", signInError?.message);
}

testAuth();
