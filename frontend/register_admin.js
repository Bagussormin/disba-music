import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwxrxwfrpilxkpdlolph.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3eHJ4d2ZycGlseGtwZGxvbHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjI4ODMsImV4cCI6MjA4OTgzODg4M30.jTJ3jBIJnMsWFLJbAlhshe1ovZZ016HQ76tyvGkCEZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.auth.signUp({
    email: 'disbamusic.official@gmail.com',
    password: 'DisbaAdmin123!'
  });
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success:', data.user?.email);
  }
}
main();
