import { IAiReview, IAiReviewUsageLine } from '../models/ai-review.model'

/**
 * The review's AI spend, call by call: shown while the service sends detailed costs (for demos
 * and for checking the bill), so each provider, model and step can be verified.
 */

const PROVIDERS: Record<string, string> = { gemini: 'Gemini', anthropic: 'Claude', elevenlabs: 'ElevenLabs' }

/** What a call did, in words: "CBP checklist", "Domain review — JSON repair", … */
export function stepLabel(step: string): string {
  const repair = /\(repair\)/.test(step)
  const base = step.replace(/\s*\(repair\)/, '').trim()
  const names: [RegExp, string][] = [
    [/checklist/, 'CBP checklist'],
    [/watch/, 'Watching the video'],
    [/stt/, 'Speech to text'],
    [/course alignment/, 'Course alignment (whole course)'],
    [/alignment/, 'Course alignment (this resource)'],
    [/domain \(combine parts\)/, 'Domain review (combining PDF parts)'],
    [/domain/, 'Domain review'],
    [/questions/, 'Question check'],
    [/second opinion/, 'Second opinion on clinical claims'],
  ]
  const name = names.find(([re]) => re.test(base))?.[1] || base
  const fallback = /fallback/.test(base) ? ' (fallback model)' : ''
  const again = /left out/.test(base) ? ' — asked again for what it left out' : ''
  return `${name}${fallback}${again}${repair ? ' — JSON repair' : ''}`
}

export const providerLabel = (p: string): string => PROVIDERS[p] || p

/** "12.4k in · 1.1k out (3.2k cached)" or "2 min 13 s of audio". */
export function tokensLabel(l: Pick<IAiReviewUsageLine, 'inputTokens' | 'outputTokens' | 'cachedTokens' | 'audioSec'>): string {
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
  if (l.audioSec && !l.inputTokens && !l.outputTokens) {
    return `${Math.floor(l.audioSec / 60)} min ${l.audioSec % 60} s of audio`
  }
  return `${k(l.inputTokens)} in · ${k(l.outputTokens)} out${l.cachedTokens ? ` (${k(l.cachedTokens)} cached)` : ''}`
}

export interface CostBreakdown {
  /** Each resource's calls, then the course-level ones. */
  groups: { name: string; lines: IAiReviewUsageLine[]; totalUsd: number; reused: boolean }[]
  /** Spend per provider, largest first. */
  byProvider: { provider: string; label: string; costUsd: number; calls: number }[]
  totalUsd: number
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6

/** The breakdown, or null when the service sent no call-level data (detailed costs off, or an older review). */
export function costBreakdown(review: Pick<IAiReview, 'items' | 'result'>): CostBreakdown | null {
  const groups: CostBreakdown['groups'] = []
  for (const i of review.items || []) {
    if (i.result?.cached) {
      groups.push({ name: i.name, lines: [], totalUsd: 0, reused: true })
    } else if (i.result?.usage) {
      groups.push({ name: i.name, lines: i.result.usage, totalUsd: r6(i.result.usage.reduce((s, l) => s + l.costUsd, 0)), reused: false })
    }
  }
  const course = review.result?.usage
  if (course?.length) {
    groups.push({ name: 'The course as a whole', lines: course, totalUsd: r6(course.reduce((s, l) => s + l.costUsd, 0)), reused: false })
  }
  if (!groups.some(g => g.lines.length)) {
    return null
  }
  const providers = new Map<string, { costUsd: number; calls: number }>()
  groups.forEach(g =>
    g.lines.forEach(l => {
      const p = providers.get(l.provider) || { costUsd: 0, calls: 0 }
      providers.set(l.provider, { costUsd: r6(p.costUsd + l.costUsd), calls: p.calls + l.calls })
    }),
  )
  return {
    groups,
    byProvider: [...providers.entries()]
      .map(([provider, v]) => ({ provider, label: providerLabel(provider), ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    totalUsd: r6(groups.reduce((s, g) => s + g.totalUsd, 0)),
  }
}

/** "$0.0472": enough digits to see small calls. */
export const usd = (n: number): string => `$${n > 0 && n < 0.01 ? n.toFixed(4) : n.toFixed(3)}`
