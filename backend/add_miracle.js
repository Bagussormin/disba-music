
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMiracleRelease() {
  console.log('Adding Miracle release to database...');
  
  const releaseData = {
    title: 'Miracle (Rangga Zenico & DJ Ndrow Bootleg)',
    genre: 'House / Remix',
    status: 'released',
    audio_url: 'https://screenapp.io/app/v/xBb4rbA7ZY', // Using the link provided
    cover_url: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-ndrow.png',
    spotify_status: 'live',
    isrc: 'IDDBM2600001',
    upc: '8804821000101',
    copyright_holder: 'DJ Ndrow & Rangga Zenico',
    copyright_year: 2026,
    language: 'id'
  };

  try {
    const { error } = await supabase.from('releases').insert(releaseData);
    if (error) throw error;
    console.log('Miracle release added successfully.');
  } catch (error) {
    console.error('Error adding release:', error.message);
  }
}

addMiracleRelease();
