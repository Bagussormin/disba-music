
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testInsert() {
  console.log("Testing insert into 'transactions'...");
  try {
    const { data, error } = await supabase.from('transactions').insert({
      midtrans_order_id: 'TEST-' + Date.now(),
      amount: 1000,
      status: 'pending',
      type: 'TEST'
    });

    if (error) {
      console.error("❌ Insert failed:", JSON.stringify(error, null, 2));
    } else {
      console.log("✅ Insert successful");
    }
  } catch (e) {
    console.error("❌ Exception during insert:", e);
  }
}

testInsert();
