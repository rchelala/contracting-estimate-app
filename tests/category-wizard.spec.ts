import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'

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
  await page.goto(`${BASE_URL}/auth`)
  await page.fill('input[type="email"]', process.env['TEST_USER_EMAIL'] ?? '')
  await page.fill('input[type="password"]', process.env['TEST_USER_PASSWORD'] ?? '')
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15000 })
}

async function selectCategoryAndProceed(
  page: import('@playwright/test').Page,
  categoryLabel: string,
) {
  await page.goto(`${BASE_URL}/estimates/wizard`)
  // Step 0: category selection
  await expect(page.getByText('What type of work?')).toBeVisible({ timeout: 5000 })
  await page.getByText(categoryLabel).click()
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
  const categoryLabel = categoryId
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  test(`${categoryLabel}: Q&A questions are category-relevant`, async ({ page }) => {
    test.setTimeout(90000)
    await loginAsTestUser(page)
    await selectCategoryAndProceed(page, categoryLabel)

    // Step 5: wait for AI-generated questions to appear
    await page.waitForSelector('[data-testid="qa-question"], .qa-question, [class*="question"]', {
      timeout: 30000,
    }).catch(() => {
      // Fallback: wait for any text that looks like a question
    })
    await page.waitForTimeout(2000)

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
    await selectCategoryAndProceed(page, categoryLabel)

    // Step 5: wait for questions then skip/generate
    await page.waitForTimeout(5000)
    // Try to click the last button (Generate / Continue / Skip to generate)
    const buttons = page.getByRole('button')
    const buttonCount = await buttons.count()
    if (buttonCount > 0) {
      await buttons.last().click()
    }

    // Generating screen → estimate editor
    await page.waitForURL(/\/estimates\/[a-f0-9-]+/, { timeout: 60000 })
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
