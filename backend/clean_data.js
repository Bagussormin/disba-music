
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanData() {
  console.log('Cleaning testing data...');
  
  const tables = ['delivery_queue', 'royalties_ledger', 'transactions', 'releases', 'profiles'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) {
      console.error(`Error cleaning ${table}:`, error.message);
    } else {
      console.log(`Table ${table} cleaned.`);
    }
  }
}

cleanData();
