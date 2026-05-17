import {
  PaintBrush, Code, Calculator, ChartLine, Wrench,
  Buildings, GraduationCap, Truck, House, Heart,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useWizardStore } from '../../stores/wizardStore'
import { CATEGORY_PROMPT_CONFIGS } from '../../constants/categoryConfig'
import type { CategoryId } from '../../constants/categoryConfig'
import { WizardShell } from './WizardShell'

const CATEGORY_ICONS: Record<CategoryId, Icon> = {
  creative_services: PaintBrush,
  information_technology: Code,
  business_finance: Calculator,
  consulting: ChartLine,
  specialized_trades: Wrench,
  general_contracting: Buildings,
  education_training: GraduationCap,
  logistics_delivery: Truck,
  real_estate: House,
  wellness_personal_care: Heart,
}

export function WizardStep0Category() {
  const { category, setCategory, setStep } = useWizardStore()

  return (
    <WizardShell
      step={0}
      totalSteps={6}
      title="What type of work?"
      subtitle="Select your contracting category"
    >
      <div className="grid grid-cols-2 gap-2 mb-6">
        {CATEGORY_PROMPT_CONFIGS.map((cat) => {
          const IconComponent = CATEGORY_ICONS[cat.id]
          const isSelected = category === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <IconComponent
                size={24}
                weight="bold"
                className={isSelected ? 'text-orange-500' : 'text-stone-500'}
                aria-hidden="true"
              />
              <div>
                <div className={`text-sm font-semibold leading-tight ${isSelected ? 'text-orange-700' : 'text-stone-900'}`}>
                  {cat.label}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 leading-snug">{cat.subtitle}</div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => setStep(1)}
        disabled={category === null}
        className="w-full bg-linear-to-br from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-40 shadow-sm"
      >
        Continue
      </button>
    </WizardShell>
  )
}
