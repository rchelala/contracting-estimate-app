function maskValue(value: string | undefined): string | null {
  if (value === undefined) return null
  if (value.length <= 10) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function getEnvValue(name: string): string | undefined {
  return process.env[name]
}

export default function handler(req: { method?: string }, res: { statusCode?: number; setHeader: (name: string, value: string) => void; end: (data: string) => void }) {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const envNames = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
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
