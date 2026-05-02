import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const verifyEnv = (name, value) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}. Please set ${name} in your Vercel dashboard.`)
  }
}

verifyEnv('VITE_SUPABASE_URL', supabaseUrl)
verifyEnv('VITE_SUPABASE_ANON_KEY', supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
