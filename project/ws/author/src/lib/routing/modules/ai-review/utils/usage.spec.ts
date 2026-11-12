import { IAiReview } from '../models/ai-review.model'
import { costBreakdown, stepLabel, tokensLabel, usd } from './usage'

const line = (over: object) => ({
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  step: 'gemini checklist',
  calls: 1,
  inputTokens: 12400,
  outputTokens: 1100,
  cachedTokens: 0,
  audioSec: 0,
  costUsd: 0.0472,
  ...over,
})

describe('the cost breakdown', () => {
  it('names each step and its tokens plainly', () => {
    expect(stepLabel('gemini checklist')).toBe('CBP checklist')
    expect(stepLabel('claude domain (repair)')).toBe('Domain review — JSON repair')
    expect(stepLabel('gemini domain (fallback)')).toBe('Domain review (fallback model)')
    expect(stepLabel('claude course alignment')).toBe('Course alignment (whole course)')
    expect(tokensLabel(line({ cachedTokens: 3200 }))).toBe('12.4k in · 1.1k out (3.2k cached)')
    expect(tokensLabel(line({ inputTokens: 0, outputTokens: 0, audioSec: 133 }))).toBe('2 min 13 s of audio')
    expect(usd(0.0472)).toBe('$0.047')
    expect(usd(0.0031)).toBe('$0.0031')
  })

  it('totals by provider and by resource, and shows a reused result at no cost', () => {
    const review = {
      items: [
        {
          name: 'Video',
          result: { usage: [line({}), line({ provider: 'anthropic', model: 'claude-sonnet-5-5', step: 'claude domain', costUsd: 0.08 })] },
        },
        { name: 'Old PDF', result: { cached: true, usage: [] } },
      ],
      result: { usage: [line({ provider: 'anthropic', model: 'claude-sonnet-5-5', step: 'claude course alignment', costUsd: 0.04 })] },
    } as unknown as IAiReview
    const c = costBreakdown(review)!
    expect(c.totalUsd).toBeCloseTo(0.1672, 6)
    expect(c.byProvider.map(p => [p.label, p.calls])).toEqual([
      ['Claude', 2],
      ['Gemini', 1],
    ])
    expect(c.groups.map(g => [g.name, g.reused])).toEqual([
      ['Video', false],
      ['Old PDF', true],
      ['The course as a whole', false],
    ])
  })

  it('is absent when the service sends only totals', () => {
    expect(costBreakdown({ items: [{ result: { costUsd: 0.1 } }], result: null } as unknown as IAiReview)).toBeNull()
  })
})

describe("the guard's calls in the cost breakdown", () => {
  it('names the second opinion and a judge asked again for what it left out', () => {
    expect(stepLabel('gemini second opinion')).toBe('Second opinion on clinical claims')
    expect(stepLabel('gemini checklist (left out)')).toBe('CBP checklist — asked again for what it left out')
    expect(stepLabel('claude domain (left out)')).toBe('Domain review — asked again for what it left out')
  })
})
