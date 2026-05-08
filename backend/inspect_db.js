
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('Inspecting Supabase database...');
  
  // List tables (using a query that might fail if permissions are tight, but service role should be fine)
  // Actually, we can just try to select from expected tables.
  const tables = ['profiles', 'releases', 'djs', 'events', 'transactions', 'royalties_ledger', 'delivery_queue'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: false });
    
    if (error) {
      console.log(`Table "${table}": Error or not found - ${error.message}`);
    } else {
      console.log(`Table "${table}": Found ${data.length} rows (Total count: ${count})`);
      if (data.length > 0) {
        console.log('Sample data (first row):', JSON.stringify(data[0], null, 2));
      }
    }
  }
}

inspectDatabase();
