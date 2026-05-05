function maskValue(value: string | undefined): string | null {
  if (value === undefined) return null
  if (value.length <= 10) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function getEnvValue(name: string): string | undefined {
  return process.env[name]
}

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const envNames = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
  ]

  const result = envNames.reduce<Record<string, { present: boolean; masked: string | null }>>(
    (acc, name) => {
      const value = getEnvValue(name)
      acc[name] = {
        present: value !== undefined && value !== '',
        masked: maskValue(value),
      }
      return acc
    },
    {}
  )

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ env: result }))
}
