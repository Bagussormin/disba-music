
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadGeneratedImage() {
  const filePath = 'C:/Users/NEC VG-U/.gemini/antigravity/brain/e4fa13a0-3626-4cb7-a79a-c23926dc7ce6/dj_vortex_real_1778243784705.png';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }
  
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from('rilisan')
    .upload('assets/dj_vortex_real.png', fileBuffer, {
      upsert: true,
      contentType: 'image/png'
    });
    
  if (error) {
    console.error('Error uploading:', error.message);
  } else {
    console.log('Uploaded dj_vortex_real.png to assets/dj_vortex_real.png');
    console.log('Public URL:', `${supabaseUrl}/storage/v1/object/public/rilisan/assets/dj_vortex_real.png`);
  }
}

uploadGeneratedImage();
