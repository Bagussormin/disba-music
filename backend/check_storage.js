
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('Checking Supabase storage...');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error.message);
    return;
  }
  console.log('Buckets:', buckets.map(b => b.name));
  
  for (const bucket of buckets) {
    const { data: files, error: fileError } = await supabase.storage.from(bucket.name).list();
    if (fileError) {
      console.error(`Error listing files in ${bucket.name}:`, fileError.message);
    } else {
      console.log(`Files in bucket "${bucket.name}":`, files.map(f => f.name));
    }
  }
}

checkStorage();
