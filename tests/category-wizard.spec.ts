import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

// Labels must match exactly what WizardStep0Category renders from CATEGORY_PROMPT_CONFIGS
const CATEGORY_LABELS: Record<string, string> = {
  creative_services: 'Creative Services',
  information_technology: 'Information Technology',
  business_finance: 'Business & Finance',
  consulting: 'Consulting',
  specialized_trades: 'Specialized Trades',
  general_contracting: 'General Contracting',
  education_training: 'Education & Training',
  logistics_delivery: 'Logistics & Delivery',
  real_estate: 'Real Estate',
  wellness_personal_care: 'Wellness & Personal Care',
}

const CATEGORY_EXPECTATIONS: Record<string, { questionKeywords: string[]; sectionKeywords: string[] }> = {
  creative_services: {
    questionKeywords: ['deliverable', 'revision', 'brand', 'format', 'timeline', 'platform', 'style'],
    sectionKeywords: ['design', 'creative', 'production', 'revision', 'licensing', 'strategy'],
  },
  information_technology: {
    questionKeywords: ['stack', 'tech', 'timeline', 'access', 'security', 'compliance', 'team', 'maintenance'],
    sectionKeywords: ['development', 'testing', 'deployment', 'architecture', 'support', 'qa'],
  },
  business_finance: {
    questionKeywords: ['entity', 'account', 'transaction', 'fiscal', 'filing', 'tax', 'bookkeep'],
    sectionKeywords: ['bookkeeping', 'accounting', 'filing', 'advisory', 'compliance', 'setup'],
  },
  consulting: {
    questionKeywords: ['challenge', 'outcome', 'timeline', 'team', 'implementation', 'metric'],
    sectionKeywords: ['discovery', 'strategy', 'planning', 'recommendation', 'report', 'assessment'],
  },
  specialized_trades: {
    questionKeywords: ['install', 'repair', 'material', 'permit', 'access', 'site'],
    sectionKeywords: ['labor', 'material', 'permit', 'equipment', 'cleanup', 'inspection'],
  },
  general_contracting: {
    questionKeywords: ['scope', 'square', 'subcontract', 'permit', 'site', 'renovation', 'construction'],
    sectionKeywords: ['framing', 'site', 'mechanical', 'finish', 'management', 'structure'],
  },
  education_training: {
    questionKeywords: ['participant', 'session', 'objective', 'curriculum', 'remote', 'material'],
    sectionKeywords: ['curriculum', 'instruction', 'session', 'material', 'assessment', 'training'],
  },
  logistics_delivery: {
    questionKeywords: ['pickup', 'delivery', 'cargo', 'weight', 'handling', 'timeline', 'recurring'],
    sectionKeywords: ['delivery', 'distance', 'fuel', 'handling', 'insurance', 'surcharge'],
  },
  real_estate: {
    questionKeywords: ['property', 'transaction', 'listing', 'lease', 'commercial', 'residential'],
    sectionKeywords: ['listing', 'marketing', 'transaction', 'negotiation', 'coordination', 'management'],
  },
  wellness_personal_care: {
    questionKeywords: ['session', 'duration', 'mobile', 'product', 'treatment', 'package'],
    sectionKeywords: ['service', 'product', 'session', 'treatment', 'travel', 'package'],
  },
}

async function loginAsTestUser(page: import('@playwright/test').Page) {
  const email = process.env['TEST_USER_EMAIL']
  const password = process.env['TEST_USER_PASSWORD']
  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.local to run category wizard tests'
    )
  }
  await page.goto(`${BASE_URL}/auth`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15000 })
}

async function selectCategoryAndProceed(
  page: import('@playwright/test').Page,
  categoryId: string,
) {
  const label = CATEGORY_LABELS[categoryId]
  await page.goto(`${BASE_URL}/estimates/wizard`)
  // Step 0: category selection
  await expect(page.getByText('What type of work?')).toBeVisible({ timeout: 5000 })
  await page.getByText(label, { exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  // Step 1: skip client
  await expect(page.getByText("Who's the client?")).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  // Step 2: skip location
  await page.getByRole('button', { name: 'Skip' }).click()
  // Step 3: skip photos
  await page.getByRole('button', { name: 'Skip' }).click()
  // Step 4: add description and continue
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 5000 })
  await page.getByRole('textbox').first().fill('Standard project requiring professional service.')
  await page.getByRole('button', { name: 'Continue' }).click()
}

for (const [categoryId, expectations] of Object.entries(CATEGORY_EXPECTATIONS)) {
  const categoryLabel = CATEGORY_LABELS[categoryId]

  test(`${categoryLabel}: Q&A questions are category-relevant`, async ({ page }) => {
    test.setTimeout(90000)
    await loginAsTestUser(page)
    await selectCategoryAndProceed(page, categoryId)

    // Wait for AI-generated questions to load (real API call)
    await page.waitForTimeout(15000)

    const pageText = (await page.textContent('body') ?? '').toLowerCase()
    const hasRelevantQuestion = expectations.questionKeywords.some((kw) =>
      pageText.includes(kw.toLowerCase())
    )
    expect(
      hasRelevantQuestion,
      `Expected at least one keyword from [${expectations.questionKeywords.join(', ')}] in Q&A for ${categoryLabel}`
    ).toBe(true)
  })

  test(`${categoryLabel}: estimate draft has category-relevant sections`, async ({ page }) => {
    test.setTimeout(120000)
    await loginAsTestUser(page)
    await selectCategoryAndProceed(page, categoryId)

    // Wait for questions to load, then advance past Q&A step
    await page.waitForTimeout(10000)
    // Prefer the primary "Generate" action; fall back to "Continue" or "Skip" if not yet available
    const generateBtn = page.getByRole('button', { name: /generate/i })
    const hasGenerate = await generateBtn.count() > 0
    if (hasGenerate) {
      await generateBtn.first().click()
    } else {
      await page.getByRole('button', { name: /continue|skip/i }).first().click()
    }

    // Wait for generating screen to complete and navigate to estimate editor
    await page.waitForURL(/\/estimates\/[a-f0-9-]{36}/, { timeout: 60000 })
    await page.waitForTimeout(2000)

    const pageText = (await page.textContent('body') ?? '').toLowerCase()
    const hasRelevantSection = expectations.sectionKeywords.some((kw) =>
      pageText.includes(kw.toLowerCase())
    )
    expect(
      hasRelevantSection,
      `Expected at least one section keyword from [${expectations.sectionKeywords.join(', ')}] in estimate for ${categoryLabel}`
    ).toBe(true)
  })
}
