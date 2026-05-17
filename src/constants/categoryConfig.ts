export type CategoryId =
  | 'creative_services'
  | 'information_technology'
  | 'business_finance'
  | 'consulting'
  | 'specialized_trades'
  | 'general_contracting'
  | 'education_training'
  | 'logistics_delivery'
  | 'real_estate'
  | 'wellness_personal_care'

export interface CategoryPromptConfig {
  id: CategoryId
  label: string
  subtitle: string
  questionsPromptContext: string
  draftPromptContext: string
}

export const CATEGORY_PROMPT_MAP: Record<CategoryId, CategoryPromptConfig> = {
  creative_services: {
    id: 'creative_services',
    label: 'Creative Services',
    subtitle: 'Designers, writers, videographers',
    questionsPromptContext:
      'Ask about deliverables (logo, video, copy, photos), format and specifications, number of revision rounds, timeline, existing brand guidelines, and intended platform or use.',
    draftPromptContext:
      'Use sections like Creative Brief & Strategy, Design or Production, Revisions & Feedback, and Licensing & Usage Rights. Line items use units like "hr", "project", "round", "asset". No material markup. Professional service rates typically $50–$200/hr.',
  },
  information_technology: {
    id: 'information_technology',
    label: 'Information Technology',
    subtitle: 'Developers, cybersecurity, UX/UI',
    questionsPromptContext:
      'Ask about project type (new build vs maintenance), technology stack preferences, team or user count, access and environment requirements, security or compliance needs, and timeline.',
    draftPromptContext:
      'Use sections like Discovery & Architecture, Development, Testing & QA, and Deployment & Support. Line items use units like "hr", "sprint", "day", "license". No material markup. Rates typically $75–$250/hr.',
  },
  business_finance: {
    id: 'business_finance',
    label: 'Business & Finance',
    subtitle: 'Accountants, bookkeepers, advisors',
    questionsPromptContext:
      'Ask about business entity type (LLC, S-Corp, sole proprietor), fiscal year, approximate number of accounts and transactions per month, filing type needed, and whether books are currently up to date.',
    draftPromptContext:
      'Use sections like Assessment & Setup, Monthly Bookkeeping, Filings & Compliance, and Advisory Services. Line items use units like "hr", "month", "return", "account". No material markup. Rates typically $50–$350/hr depending on specialization.',
  },
  consulting: {
    id: 'consulting',
    label: 'Consulting',
    subtitle: 'Management, marketing, HR consultants',
    questionsPromptContext:
      'Ask about the specific business challenge being addressed, current team size, desired outcomes and success metrics, expected project timeline, and whether implementation support beyond recommendations is needed.',
    draftPromptContext:
      'Use sections like Discovery & Assessment, Strategy & Planning, Implementation Support, and Final Report & Recommendations. Line items use units like "hr", "day", "project", "deliverable". No material markup. Rates typically $75–$300/hr.',
  },
  specialized_trades: {
    id: 'specialized_trades',
    label: 'Specialized Trades',
    subtitle: 'Plumbers, electricians, HVAC, masons',
    questionsPromptContext:
      'Ask about the specific trade type, whether the work is new installation or repair, materials preference (standard or premium), site access conditions, permit requirements, and desired timeline.',
    draftPromptContext:
      'Use sections like Labor, Materials, Equipment & Tool Rental, Permits & Inspections, and Cleanup & Disposal. Line items use units like "hr", "each", "linear ft", "sq ft", "day". Apply material markup of 15–30%. Labor rates typically $60–$150/hr.',
  },
  general_contracting: {
    id: 'general_contracting',
    label: 'General Contracting',
    subtitle: 'Residential/commercial project managers',
    questionsPromptContext:
      'Ask about project scope (new construction vs renovation), total square footage, site conditions and access, which subcontractors are required (electrical, plumbing, HVAC), permit status, and project timeline.',
    draftPromptContext:
      'Use sections like Site Preparation, Framing & Structure, Mechanical/Electrical/Plumbing, Finishes, and Project Management & Overhead. Line items use units like "sq ft", "hr", "day", "allowance". Apply material markup of 10–20%. General contractor overhead typically 15–25% of project cost.',
  },
  education_training: {
    id: 'education_training',
    label: 'Education & Training',
    subtitle: 'Tutors, coaches, corporate trainers',
    questionsPromptContext:
      'Ask about learning objectives, number of participants, session length and frequency, in-person or remote delivery, whether curriculum development is needed, and any assessments or printed materials required.',
    draftPromptContext:
      'Use sections like Curriculum Development, Instruction & Sessions, Materials & Resources, and Assessment & Follow-up. Line items use units like "hr", "session", "participant", "day". No material markup. Rates typically $40–$200/hr or $150–$2,000/day for corporate engagements.',
  },
  logistics_delivery: {
    id: 'logistics_delivery',
    label: 'Logistics & Delivery',
    subtitle: 'Couriers, freight, rideshare operators',
    questionsPromptContext:
      'Ask about pickup and delivery locations, cargo type and approximate weight or dimensions, required timeline, any special handling requirements (fragile, temperature-sensitive), and whether this is a one-time or recurring engagement.',
    draftPromptContext:
      'Use sections like Base Delivery Fee, Distance & Fuel Surcharge, Special Handling, and Insurance & Liability. Line items use units like "mile", "item", "pallet", "hr", "trip". No material markup. Base rates typically $25–$200 per trip plus per-mile charges.',
  },
  real_estate: {
    id: 'real_estate',
    label: 'Real Estate',
    subtitle: 'Independent agents, property managers',
    questionsPromptContext:
      'Ask about property type (residential or commercial), transaction type (buy, sell, lease, or property management), property size and location, and specific scope of services needed.',
    draftPromptContext:
      'Use sections like Listing & Marketing, Showings & Negotiations, Transaction Coordination, and Property Management Services if applicable. Line items use units like "%", "month", "property", "hr". Commission-based pricing typically 2.5–6% of sale price; property management typically $100–$300/month per unit.',
  },
  wellness_personal_care: {
    id: 'wellness_personal_care',
    label: 'Wellness & Personal Care',
    subtitle: 'Massage therapists, stylists, estheticians',
    questionsPromptContext:
      'Ask about the specific service type, session duration, number of sessions or package size, whether services are in-studio or mobile, and any specialty products or equipment needed.',
    draftPromptContext:
      'Use sections like Service Fee, Products & Supplies, Travel & Mobile Fee if applicable, and Package or Membership Discount. Line items use units like "session", "hr", "treatment", "visit". Apply product markup of 20–40%. Service rates typically $60–$200/hr depending on specialty.',
  },
}

export const CATEGORY_PROMPT_CONFIGS: CategoryPromptConfig[] = Object.values(CATEGORY_PROMPT_MAP)
