import { supabase } from '../supabase';

export const generateISRC = async () => {
  const { data, error } = await supabase.rpc('generate_next_isrc');
  
  if (error) {
    console.error('Error generating ISRC:', error);
    // Fallback logic if RPC fails (though ideally RPC should be fixed)
    const year = new Date().getFullYear().toString().slice(-2);
    const ts = Date.now().toString().slice(-4);
    const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `IDDBM${year}${ts}${rand}`;
  }
  
  return data;
};

export const generateUPC = () => {
  // Membuat 12 digit angka acak untuk Barcode Album
  return Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
};