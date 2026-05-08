
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDjNdrowImage() {
  console.log('Fixing DJ Ndrow image URL...');
  
  // The user uploaded "dj ndrow.jpeg" (with space)
  const correctImageUrl = `${supabaseUrl}/storage/v1/object/public/rilisan/assets/dj%20ndrow.jpeg`;

  try {
    const { error } = await supabase
      .from('djs')
      .update({ image: correctImageUrl })
      .eq('stage_name', 'DJ NDROW');
      
    if (error) throw error;
    
    // Also update the release cover
    const { error: relError } = await supabase
      .from('releases')
      .update({ cover_url: correctImageUrl })
      .eq('title', 'Miracle (Rangga Zenico & DJ Ndrow Bootleg)');
      
    if (relError) throw relError;

    console.log('DJ Ndrow image URL fixed successfully.');
  } catch (error) {
    console.error('Error fixing image URL:', error.message);
  }
}

fixDjNdrowImage();
