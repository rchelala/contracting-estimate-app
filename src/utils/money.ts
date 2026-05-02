export function add(a: number, b: number): number {
  return a + b
}

export function subtract(a: number, b: number): number {
  return a - b
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function applyMarkup(unitPriceCents: number, markupPct: number): number {
  return Math.round(unitPriceCents * (1 + markupPct / 100))
}

export function lineItemTotal(
  quantity: number,
  unitPriceCents: number,
  markupPct: number
): number {
  return Math.round(quantity * unitPriceCents * (1 + markupPct / 100))
}

export function formatCents(cents: number, currencyCode = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(cents / 100)
}
