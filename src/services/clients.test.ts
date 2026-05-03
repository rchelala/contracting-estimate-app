import { describe, it, expect } from 'vitest'
import * as clients from './clients'

describe('clients service', () => {
  it('exports listClients and createClient', () => {
    expect(typeof clients.listClients).toBe('function')
    expect(typeof clients.createClient).toBe('function')
  })
})
