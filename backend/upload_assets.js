
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadAssets() {
  console.log('Uploading assets to Supabase storage...');
  
  const assetsDir = '../frontend/src/assets';
  const filesToUpload = ['dj-1.png', 'dj-2.png', 'event-1.png', 'logo-disba.png', 'hero-bg.png'];
  
  for (const fileName of filesToUpload) {
    const filePath = path.join(assetsDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, skipping.`);
      continue;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
      .from('rilisan')
      .upload(`assets/${fileName}`, fileBuffer, {
        upsert: true,
        contentType: 'image/png'
      });
      
    if (error) {
      console.error(`Error uploading ${fileName}:`, error.message);
    } else {
      console.log(`Uploaded ${fileName} to assets/${fileName}`);
    }
  }
}

uploadAssets();
