import { describe, it, expect } from 'vitest'
import {
  lineItemTotal,
  applyMarkup,
  formatCents,
  dollarsToCents,
  centsToDollars,
  add,
  subtract,
} from './money'

describe('add', () => {
  it('adds two cent values', () => {
    expect(add(100, 50)).toBe(150)
  })
})

describe('subtract', () => {
  it('subtracts two cent values', () => {
    expect(subtract(200, 75)).toBe(125)
  })
})

describe('dollarsToCents', () => {
  it('converts whole dollars', () => {
    expect(dollarsToCents(10)).toBe(1000)
  })
  it('rounds fractional dollars to nearest cent', () => {
    expect(dollarsToCents(10.999)).toBe(1100)
  })
})

describe('centsToDollars', () => {
  it('converts cents to dollars', () => {
    expect(centsToDollars(1050)).toBe(10.5)
  })
})

describe('applyMarkup', () => {
  it('applies zero markup unchanged', () => {
    expect(applyMarkup(1000, 0)).toBe(1000)
  })
  it('applies 20% markup and rounds', () => {
    expect(applyMarkup(1000, 20)).toBe(1200)
  })
  it('rounds fractional cents', () => {
    expect(applyMarkup(333, 10)).toBe(366)
  })
})

describe('lineItemTotal', () => {
  it('calculates qty * price with no markup', () => {
    expect(lineItemTotal(3, 5000, 0)).toBe(15000)
  })
  it('applies markup to each unit before multiplying by qty', () => {
    expect(lineItemTotal(2, 1000, 20)).toBe(2400)
  })
  it('handles fractional quantity', () => {
    expect(lineItemTotal(1.5, 200, 0)).toBe(300)
  })
  it('rounds fractional cents', () => {
    expect(lineItemTotal(3, 333, 10)).toBe(1099)
  })
})

describe('formatCents', () => {
  it('formats USD cents as dollar string', () => {
    expect(formatCents(150050)).toBe('$1,500.50')
  })
  it('formats zero', () => {
    expect(formatCents(0)).toBe('$0.00')
  })
})
