
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log('Seeding landing page content...');
  
  const djs = [
    { 
      name: 'Andri Bayu', stage_name: 'DJ VORTEX', rank: 1, plays: '124.5k', likes: '12.4k', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-1.png', 
      badge: 'Trending', genre: 'Melodic Techno', location: 'Jakarta, ID',
      bio: 'Pioneer of the Jakarta underground melodic techno scene. Known for atmospheric sets and deep basslines.',
      recent_tracks: ['Midnight Drive (Original Mix)', 'Nebula Pulse', 'Jakarta After Dark'],
      upcoming: 'Skyline Lounge - Tonight'
    },
    { 
      name: 'Siska Putri', stage_name: 'LUNA RAY', rank: 2, plays: '98.2k', likes: '8.7k', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-2.png', 
      badge: 'Rising', genre: 'Progressive House', location: 'Bali, ID',
      bio: 'Blending traditional island vibes with modern progressive beats. A crowd favorite in the Bali club circuit.',
      recent_tracks: ['Island Sunset', 'Neon Lights (Deep Mix)', 'Ocean Breath'],
      upcoming: 'The Vault - Friday'
    },
    { 
      name: 'Bimo Seto', stage_name: 'NOVA PULSE', rank: 3, plays: '75.1k', likes: '6.2k', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-1.png', 
      badge: 'Crowd Fav', genre: 'Tech House', location: 'Bandung, ID',
      bio: 'Energy is the name of the game. Bimo brings high-octane tech house that keeps the dancefloor moving.',
      recent_tracks: ['Summer Ghost', 'Rhythm Machine', 'Bassline Theory'],
      upcoming: 'Arena Stage - Saturday'
    },
    { 
      name: 'Dafa Pratama', stage_name: 'ZENITH', rank: 4, plays: '62.8k', likes: '5.1k', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-2.png', 
      badge: 'Top 10', genre: 'Industrial Techno', location: 'Surabaya, ID',
      bio: 'Dark, raw, and uncompromising. Zenith is the sound of the industrial outskirts of Surabaya.',
      recent_tracks: ['Steel Works', 'Cold Night', 'Transmission'],
      upcoming: 'Warehouse 13 - Sunday'
    }
  ];

  const events = [
    { 
      title: 'NEON PULSE NIGHT', venue: 'Skyline Lounge', date: 'TONIGHT', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/event-1.png', 
      status: 'ALMOST FULL', color: 'bg-red-500', 
      lineup: ['Andri Bayu (DJ Vortex)', 'Siska Putri (Luna Ray)'],
      description: 'An immersive neon experience at the highest point of the city. Join us for a night of melodic techno and progressive house.',
      price: 'IDR 150k'
    },
    { 
      title: 'TECHNO UNDERGROUND', venue: 'The Vault', date: 'FRIDAY, MAY 10', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/event-1.png', 
      status: 'HOT THIS WEEK', color: 'bg-orange-500',
      lineup: ['Bimo Seto (Nova Pulse)', 'Guest DJ'],
      description: 'Back to the basics. No phones, no lights, just the pulse of the underground in our most intimate venue.',
      price: 'IDR 200k'
    },
    { 
      title: 'BASS DROP 2024', venue: 'Arena Stage', date: 'SATURDAY, MAY 11', 
      image: 'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/event-1.png', 
      status: 'SELLING FAST', color: 'bg-blue-500',
      lineup: ['Dafa Pratama (Zenith)', 'Vortex', 'Pulse'],
      description: 'The biggest bass event of the season. Featuring the full Disba roster and special international guests.',
      price: 'IDR 350k'
    }
  ];

  try {
    const { error: djError } = await supabase.from('djs').insert(djs);
    if (djError) throw djError;
    console.log('DJs seeded successfully.');

    const { error: eventError } = await supabase.from('events').insert(events);
    if (eventError) throw eventError;
    console.log('Events seeded successfully.');
  } catch (error) {
    console.error('Error seeding data:', error.message);
    console.log('\nIMPORTANT: Make sure you have created the "djs" and "events" tables first using the provided SQL migration (landing_content.sql) in the Supabase SQL Editor.');
  }
}

seedData();
