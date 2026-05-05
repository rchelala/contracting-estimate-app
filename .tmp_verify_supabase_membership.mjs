import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split('=')
      return [key, rest.join('=')]
    }),
)
const token = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImFkMTAyZjZkLTNlOGItNDY0MS1hMTljLTcyNzkxMjc1ODJlZiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Nma2R0d2lya2RwYWd4Y2ZscndyLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlY2M5MWI1Yy1hMjMzLTQzZTQtODE3OS03YjhkOGNlMmVmM2EiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc3OTczNDg0LCJpYXQiOjE3Nzc5Njk4ODQsImVtYWlsIjoicm9iZXJ0Y2hlbGFsYUBnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoicm9iZXJ0Y2hlbGFsYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJlY2M5MWI1Yy1hMjMzLTQzZTQtODE3OS03YjhkOGNlMmVmM2EifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3NzkyNzc2OH1dLCJzZXNzaW9uX2lkIjoiYTNiYjVkYTItYWI3ZS00MDJjLTk1OWQtNzY4MjMyZjM2Y2FkIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.nkXQg2D6Ht0qsxkONPScCCTh-1FsWhJzthOoDwxePp_6V72-joykjTNi_2Dc4Wa5dL47WnylXrM8U8m3YMsXfg'
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const { data: sessionData, error: sessionError } = await supabase.auth.setSession(token)
console.log('sessionError', sessionError?.message || null)
console.log('sessionData user id', sessionData?.data?.session?.user?.id)

const userId = sessionData?.data?.session?.user?.id
if (!userId) {
  process.exit(1)
}

const { data, error } = await supabase.from('organization_members').select('*').eq('user_id', userId)
console.log('queryError', error?.message || null)
console.log('rows', JSON.stringify(data, null, 2))
