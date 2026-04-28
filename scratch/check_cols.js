
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
  console.log("Checking 'transactions' table structure...");
  try {
    // Attempt to select one row to see available columns in the response (though maybe not all show up if null)
    // Better yet, just try to insert a minimal row and see which columns fail.
    
    const { data, error } = await supabase.from('transactions').select('*').limit(1);
    if (error) {
      console.error("❌ Failed to select from transactions:", error);
    } else {
      console.log("✅ Table exists. Columns found in first row (if any):", data.length > 0 ? Object.keys(data[0]) : "Empty table");
    }

    // Try a test insert with all required columns for Midtrans
    console.log("Testing full insert...");
    const { error: insertError } = await supabase.from('transactions').insert({
      midtrans_order_id: 'DEBUG-' + Date.now(),
      amount: 50000,
      status: 'pending',
      type: 'UPGRADE_PRO',
      snap_token: 'test_token'
    });

    if (insertError) {
      console.error("❌ Full insert failed:", insertError.message);
    } else {
      console.log("✅ Full insert successful!");
    }
  } catch (e) {
    console.error("❌ Exception:", e);
  }
}

checkColumns();
