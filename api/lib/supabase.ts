import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function ensureSupabaseEnv(): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing: string[] = []
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabasePublishableKey) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    throw new Error(
      `SUPABASE environment variables are required for API routes: ${missing.join(', ')}`
    )
  }
}

export function getServiceSupabase() {
  ensureSupabaseEnv()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  })
}

export function createAuthSupabase(authorization: string) {
  ensureSupabaseEnv()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  return createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
}
