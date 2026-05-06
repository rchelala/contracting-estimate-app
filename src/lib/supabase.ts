import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env.local'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
