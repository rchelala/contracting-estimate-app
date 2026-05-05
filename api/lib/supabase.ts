import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database.types'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    'SUPABASE environment variables are required for API routes: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'
  )
}

export const serviceSupabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

export function createAuthSupabase(authorization: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
}
