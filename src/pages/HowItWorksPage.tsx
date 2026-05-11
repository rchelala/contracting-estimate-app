import { Link } from 'react-router-dom'
import LogoBadge from '../components/ui/LogoBadge'

interface DocSectionProps {
  step: number
  title: string
  screenshot: string
  bullets: string[]
  flip?: boolean
}

function DocSection({ step, title, screenshot, bullets, flip = false }: DocSectionProps) {
  return (
    <section className="mt-20">
      <div className="flex items-center gap-3 mb-6">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-600 text-white text-sm font-bold shrink-0">
          {step}
        </span>
        <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">{title}</h2>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-start ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-white">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 border-b border-stone-200">
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
              <span key={c} style={{ background: c }} className="w-2.5 h-2.5 rounded-full inline-block" />
            ))}
          </div>
          <img
            src={`/screenshots/${screenshot}`}
            alt={title}
            className="w-full block"
            loading="lazy"
          />
        </div>
        <ul className="space-y-3 pt-1">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-stone-700 text-base leading-relaxed">
              <span className="mt-1 w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-orange-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const SECTIONS: DocSectionProps[] = [
  {
    step: 1,
    title: 'Dashboard Overview',
    screenshot: 'dashboard.png',
    bullets: [
      'See all your estimates at a glance — draft, sent, and approved',
      'Sort and search across your entire history',
      'Create a new estimate with one click',
    ],
  },
  {
    step: 2,
    title: 'Creating an Estimate',
    screenshot: 'editor-with-items.png',
    bullets: [
      'AI generates sections, line items, quantities, and pricing from your job description',
      'Review every suggestion before sending — you stay in control',
      'Drag sections and line items to reorder',
    ],
    flip: true,
  },
  {
    step: 3,
    title: 'Sending an Estimate',
    screenshot: 'send-modal.png',
    bullets: [
      'Send with one click to your client\'s email',
      'Client receives a professional link — no account needed',
      'Add a personal message to accompany the estimate',
    ],
  },
  {
    step: 4,
    title: 'Client Approves',
    screenshot: 'client-approved.png',
    bullets: [
      'Client sees a clean, mobile-friendly view of every line item',
      'One-tap approval — no login required',
      'You\'re notified the moment they approve',
    ],
    flip: true,
  },
]

export default function HowItWorksPage() {
  const videoUrl = import.meta.env.VITE_ONBOARDING_VIDEO_URL as string | undefined

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LogoBadge size={26} />
            <span className="text-lg font-extrabold text-stone-900 tracking-tight">EstimateFlow</span>
          </Link>
          <Link
            to="/auth"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-14">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            See EstimateFlow in Action
          </h1>
          <p className="mt-3 text-lg text-stone-500">
            Professional estimates for contractors — done in under 3 minutes.
          </p>
        </div>

        {/* Video */}
        {videoUrl ? (
          <div className="rounded-2xl overflow-hidden shadow-lg border border-stone-200 bg-black">
            <video
              src={videoUrl}
              poster="/screenshots/dashboard.png"
              controls
              preload="metadata"
              className="w-full block"
              style={{ aspectRatio: '16/9' }}
            />
          </div>
        ) : (
          <div
            className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-100 flex items-center justify-center text-stone-400 text-sm"
            style={{ aspectRatio: '16/9' }}
          >
            Video coming soon
          </div>
        )}

        {/* Doc sections */}
        {SECTIONS.map((s) => (
          <DocSection key={s.step} {...s} />
        ))}

        {/* CTA */}
        <div className="mt-20 rounded-2xl bg-linear-to-br from-orange-50 to-amber-50 border border-orange-100 p-10 text-center">
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight mb-2">
            Ready to send your first estimate?
          </h2>
          <p className="text-stone-500 mb-6">Free to get started. No credit card required.</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-xl text-base transition-colors shadow-sm"
          >
            Create your free account
          </Link>
        </div>
      </main>
    </div>
  )
}
