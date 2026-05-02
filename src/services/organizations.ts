import { supabase } from '../lib/supabase'

export interface MyMembership {
  id: string
  organization_id: string
  role: string
}

export async function createOrganization(name: string): Promise<string> {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    throw new Error('Company name is required.')
  }
  if (trimmed.length > 120) {
    throw new Error('Company name must be 120 characters or fewer.')
  }

  // create_organization was added after type generation; cast the rpc call to avoid the type error
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)(
    'create_organization',
    { p_name: trimmed }
  )
  if (error) {
    throw new Error("Couldn't create your workspace. Please try again.", { cause: error })
  }
  if (typeof data !== 'string') {
    throw new Error("Couldn't create your workspace. Please try again.")
  }
  return data
}

export async function getMyMembership(userId: string): Promise<MyMembership | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as MyMembership | null
}
