import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function ensureSupabaseEnv(): void {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing: string[] = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL or SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY')
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    throw new Error(
      `SUPABASE environment variables are required for API routes: ${missing.join(', ')}`
    )
  }
}

export function getServiceSupabase() {
  ensureSupabaseEnv()
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  })
}

export function createAuthSupabase(authorization: string) {
  ensureSupabaseEnv()
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
}
