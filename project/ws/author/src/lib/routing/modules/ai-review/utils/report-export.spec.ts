import { IAiReview, IAiReviewItem } from '../models/ai-review.model'
import { buildReportHtml, buildWorkbookSheets, esc, judgedAgainst, levelText, openPrintableReport, reportFileName, roleSummary, xlsxApi } from './report-export'

const score = {
  areas: [
    {
      area: 'Content Quality',
      items: [
        { id: 'C1', text: 'Accurate', verdict: 'yes' as const, note: '' },
        { id: 'C2', text: 'Cuff placement', verdict: 'no' as const, note: 'Over clothing', fix: 'Bare arm' },
      ],
      yes: 1,
      applicable: 2,
      scorePct: 50,
    },
  ],
  yes: 1,
  applicable: 2,
  naCount: 0,
  total: 2,
  scorePct: 50,
  band: 'red' as const,
  bandMessage: 'Needs significant revision',
  failedIds: ['C2'],
}

const item = (over: Partial<IAiReviewItem> = {}): IAiReviewItem => ({
  contentId: 'do_v',
  name: 'BP video',
  kind: 'video',
  mimeType: 'video/mp4',
  status: 'done',
  stage: null,
  skipReason: null,
  error: null,
  result: {
    contentId: 'do_v',
    name: 'BP video',
    kind: 'video',
    durationSec: 36,
    transcriptChars: 1,
    transcriptEngine: null,
    watched: null,
    addie: { model: 'g', score, summary: 'Clear.', costUsd: 0 },
    domain: { error: 'timed out' },
    costUsd: 0,
    cached: false,
  },
  ...over,
})

const review = (over: Partial<IAiReview> = {}): IAiReview =>
  ({
    id: 'r1',
    courseId: 'do_1',
    courseName: 'एक्लेम्पसिया <care>',
    status: 'done',
    requestedBy: { id: 'u1', name: 'Asha' },
    options: { competency: { competencyId: 'C', label: 'Eclampsia', level: 2, levelLabel: 'Level 2', levelDescription: '', cadre: '' } },
    progress: { done: 2, total: 2 },
    queuePosition: 0,
    latestLog: '',
    log: [],
    items: [
      item(),
      item({
        contentId: 'do_a',
        name: 'Final assessment',
        kind: 'assessment',
        mimeType: 'application/json',
        result: {
          ...item().result!,
          kind: 'assessment',
          addie: null,
          domain: null,
          questions: [
            { n: 1, question: 'Dose?', verdict: 'issue', issues: ['Key marks 4 mg'], fix: 'Mark 4 g' },
            { n: 2, question: 'Refer where?', verdict: 'ok', issues: [] },
          ],
        },
      }),
      item({ contentId: 'do_h', name: 'Case study', kind: null, status: 'skipped', result: null }),
    ],
    result: {
      reviewed: 2,
      failed: 0,
      skipped: [{ contentId: 'do_h', name: 'Case study', reason: 'Later' }],
      addie: { scorePct: 50, band: 'red', bandMessage: 'Needs significant revision', yes: 1, applicable: 2 },
      domain: { yes: 3, applicable: 6, scorePct: 50 },
      coverage: [{ component: 'Proteinuria', status: 'missing', coveredBy: [] }],
      commonGaps: [{ id: 'C2', text: 'Cuff placement', count: 1 }],
      costUsd: 0.1,
    },
    error: null,
    costUsd: 0.1,
    estimateUsd: 0.1,
    createdAt: '2026-10-31T10:00:00Z',
    finishedAt: '2026-10-31T10:04:00Z',
    ...over,
  }) as IAiReview

describe('what a review was judged against', () => {
  const ctx = (level: number, levelLabel: string, label = 'Eclampsia') => ({ competencyId: 'C', label, level, levelLabel, levelDescription: '', cadre: '' })

  it('always shows the level number', () => {
    expect(levelText(ctx(3, 'Proficient'))).toBe('Level 3 · Proficient')
    expect(levelText(ctx(3, ''))).toBe('Level 3')
    expect(levelText(ctx(2, 'Levels 1, 2'))).toBe('Levels 1, 2')
    expect(judgedAgainst({ competency: ctx(3, 'Proficient') } as never)).toBe('Eclampsia · Level 3 · Proficient')
    expect(judgedAgainst({ competency: null } as never)).toBe('')
  })

  it('says each part was judged at its own level, and the level for parts without one', () => {
    const options = { levelMode: 'perResource', competency: ctx(1, 'Aware'), levels: { '2': ctx(2, 'Plans'), '1': ctx(1, 'Aware') } }
    expect(judgedAgainst(options as never)).toBe('Eclampsia · Each part at its own level (Levels 1, 2); parts without one at Level 1 · Aware')
    expect(judgedAgainst({ ...options, competency: null } as never)).toBe('Eclampsia · Each part at its own level (Levels 1, 2)')
  })
})

describe('the FRAC role in exports', () => {
  const role = { positionCode: 'ANM', positionName: 'ANM', totalActivities: 12, activities: [{ role: 'R', activity: 'Identify pregnancy', description: '', competency: 'E', levels: [1] }] }

  it('names the position and the activities checked, or why none were', () => {
    expect(roleSummary({ domain: true, domainStyle: 'frac', role } as never)).toBe('ANM: 1 FRAC activity needs the competency judged: Identify pregnancy')
    expect(roleSummary({ domain: true, domainStyle: 'frac', role: null, roleNote: 'No position was picked' } as never)).toBe('No position was picked')
    expect(roleSummary({ domain: true, domainStyle: 'plain', role } as never)).toBe('')
  })
})

describe('xlsxApi', () => {
  const api = { utils: { book_new: jest.fn() } }

  it('takes the API from the module, or from its default as the dev server serves it', () => {
    expect(xlsxApi(api)).toBe(api)
    expect(xlsxApi({ default: api })).toBe(api)
  })

  it('fails clearly when the library did not load', () => {
    expect(() => xlsxApi({})).toThrow('The Excel library did not load.')
    expect(() => xlsxApi(null)).toThrow('The Excel library did not load.')
  })
})

describe('report export', () => {
  it('escapes everything that could become markup', () => {
    expect(esc('<script>"x" & \'y\'</script>')).toBe('&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;')
    expect(esc(null)).toBe('')
  })

  it('makes a safe file name in any script', () => {
    expect(reportFileName({ courseName: 'Eclampsia care / ANM' }, 'pdf')).toBe('AI-review-Eclampsia_care_ANM.pdf')
    expect(reportFileName({ courseName: 'एक्लेम्पसिया' }, 'xlsx')).toMatch(/^AI-review-.+\.xlsx$/)
    expect(reportFileName({ courseName: '' }, 'pdf')).toBe('AI-review-course.pdf')
  })

  describe('the PDF document', () => {
    const html = buildReportHtml(review(), new Date('2026-10-31T11:00:00Z'))

    it('carries the summary, coverage, gaps and each resource', () => {
      expect(html).toContain('Needs significant revision')
      expect(html).toContain('Eclampsia · Level 2')
      expect(html).toContain('Proteinuria')
      expect(html).toContain('→ Bare arm')
      expect(html).toContain('Domain review could not run: timed out')
      expect(html).toContain('Questions (1 of 2 need attention)')
      expect(html).toContain('Key marks 4 mg')
      expect(html).not.toContain('Case study</h3>')
    })

    it('never lets review text become markup', () => {
      expect(html).toContain('एक्लेम्पसिया &lt;care&gt;')
      expect(html).not.toContain('<care>')
    })

    it('labels each resource with its kind and format', () => {
      expect(html).toContain('Video · MP4')
      expect(html).toContain('>Assessment<')
    })
  })

  it('opens the document and prints it, or reports a blocked window', () => {
    jest.useFakeTimers()
    const doc = { open: jest.fn(), write: jest.fn(), close: jest.fn() }
    const win = { document: doc, focus: jest.fn(), print: jest.fn() }
    expect(openPrintableReport(review(), { open: () => win as unknown as Window })).toBe(true)
    expect(doc.write).toHaveBeenCalled()
    jest.advanceTimersByTime(300)
    expect(win.print).toHaveBeenCalled()
    expect(openPrintableReport(review(), { open: () => null })).toBe(false)
    jest.useRealTimers()
  })

  it('builds one sheet per view, with every checklist verdict and question', () => {
    const sheets = buildWorkbookSheets(review())
    expect(Object.keys(sheets)).toEqual(['Summary', 'Checklist', 'Coverage', 'Questions'])
    expect(sheets['Summary']).toContainEqual(['ADDIE score %', 50])
    expect(sheets['Checklist']).toContainEqual(['BP video', 'Video', 'Content Quality', 'C2', 'Cuff placement', 'Not met', 'Over clothing', 'Bare arm'])
    expect(sheets['Coverage']).toContainEqual(['Proteinuria', 'missing', ''])
    expect(sheets['Questions']).toContainEqual(['Final assessment', 1, 'Dose?', 'Needs attention', 'Key marks 4 mg', 'Mark 4 g'])
  })

  it('leaves the questions sheet out when there are none', () => {
    const sheets = buildWorkbookSheets(review({ items: [item()], result: null }))
    expect(Object.keys(sheets)).toEqual(['Summary', 'Checklist', 'Coverage'])
  })
})
