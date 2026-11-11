import { IAiReview, IAiReviewItem } from '../models/ai-review.model'
import { coverageSources, gapSources, locateText, placeLabel, placeLink } from './report-detail'
import { scopeCss } from './report-pdf'

const item = (over: Partial<IAiReviewItem> = {}): IAiReviewItem =>
  ({
    contentId: 'do_v',
    name: 'BP video',
    kind: 'video',
    status: 'done',
    artifactUrl: 'https://cdn.example/v.mp4',
    result: {
      addie: {
        score: {
          areas: [
            { area: 'Content', items: [{ id: 'C2', text: 'Accurate', verdict: 'no', note: 'Wrong cuff', fix: 'Bare arm', atSec: 12 }] },
          ],
        },
      },
      domain: { score: { areas: [] }, coverage: [{ component: 'Identifies HRP', status: 'partial', evidence: 'Shown at 1:05' }] },
    },
    ...over,
  }) as unknown as IAiReviewItem

describe('where a finding is', () => {
  it('reads a time or page from free text, and words it', () => {
    expect(locateText('Shown at 1:05')).toEqual({ at: '1:05', atSec: 65 })
    expect(locateText('on page 4')).toEqual({ at: 'page 4', page: 4 })
    expect(placeLabel({ atSec: 65 })).toBe('1:05')
    expect(placeLabel({ page: 4 })).toBe('page 4')
  })

  it('links to the resource at the moment or page, and never to an unsafe address', () => {
    expect(placeLink(item(), { atSec: 65.4 })).toBe('https://cdn.example/v.mp4#t=65')
    expect(placeLink(item({ artifactUrl: 'https://cdn.example/n.pdf' }), { page: 4 })).toBe('https://cdn.example/n.pdf#page=4')
    expect(placeLink(item({ artifactUrl: 'javascript:alert(1)' }))).toBeNull()
    expect(placeLink(item({ artifactUrl: null }))).toBeNull()
  })

  it("finds each resource's evidence for a course-level component, whatever its punctuation", () => {
    const review = { items: [item()] } as IAiReview
    expect(coverageSources(review, 'identifies  HRP!')).toEqual([
      { item: review.items[0], row: expect.objectContaining({ status: 'partial' }) },
    ])
  })

  it('finds the resources that did not meet a repeated gap, with their finding', () => {
    const review = { items: [item(), item({ contentId: 'do_q', result: null })] } as IAiReview
    const sources = gapSources(review, 'C2')
    expect(sources).toHaveLength(1)
    expect(sources[0].indicator).toMatchObject({ note: 'Wrong cuff', fix: 'Bare arm' })
  })
})

describe('the PDF report styles', () => {
  it('scope every rule to the report, strongly enough to win over the portal, and drop the print-only ones', () => {
    const css = scopeCss(
      'body{margin:0}*{box-sizing:border-box}h2,h3{font-size:15px}@page{size:A4}@media print{.tip{display:none}body{padding:0}}',
    )
    expect(css).toContain('.air-pdf-root.air-pdf-root{margin:0}')
    expect(css).toContain('.air-pdf-root.air-pdf-root, .air-pdf-root.air-pdf-root *{box-sizing:border-box}')
    expect(css).toContain('.air-pdf-root.air-pdf-root h2, .air-pdf-root.air-pdf-root h3{font-size:15px}')
    expect(css).not.toContain('@page')
    expect(css).not.toContain('.tip')
  })
})
