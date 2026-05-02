import { supabase } from '../lib/supabase'

export interface MyMembership {
  id: string
  organization_id: string
  role: string
}

/**
 * Creates a new organization for the currently authenticated user.
 * Calls the `create_organization` SECURITY DEFINER RPC which creates both the
 * organizations row and the owner membership row atomically.
 *
 * @param name - The company name (1..120 chars, trimmed)
 * @returns The new organization's UUID
 * @throws Error with user-facing message if validation fails or RPC errors
 */
export async function createOrganization(name: string): Promise<string> {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    throw new Error('Company name is required.')
  }
  if (trimmed.length > 120) {
    throw new Error('Company name must be 120 characters or fewer.')
  }

  // create_organization RPC was added after types were generated — cast the
  // return value at runtime and verify it's a string rather than using `any`.
  const { data, error } = await supabase.rpc('create_organization' as never, {
    p_name: trimmed,
  } as never)

  if (error) {
    throw new Error("Couldn't create your workspace. Please try again.", { cause: error })
  }
  if (typeof data !== 'string') {
    throw new Error("Couldn't create your workspace. Please try again.")
  }
  return data
}

/**
 * Fetches the current user's organization membership row.
 *
 * @param userId - The authenticated user's UUID (from session.user.id)
 * @returns The membership row or null if the user has no org
 * @throws The Supabase error if the query fails
 */
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
