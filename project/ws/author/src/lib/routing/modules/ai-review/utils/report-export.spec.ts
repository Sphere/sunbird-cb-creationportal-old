import { IAiReview, IAiReviewItem } from '../models/ai-review.model'
import {
  buildReportHtml,
  buildWorkbookSheets,
  esc,
  judgedAgainst,
  packageLine,
  levelText,
  buildReportPage,
  openReportTab,
  reportFileName,
  reportWords,
  roleSummary,
  xlsxApi,
} from './report-export'

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
  const ctx = (level: number, levelLabel: string, label = 'Eclampsia') => ({
    competencyId: 'C',
    label,
    level,
    levelLabel,
    levelDescription: '',
    cadre: '',
  })

  it('always shows the level number', () => {
    expect(levelText(ctx(3, 'Proficient'))).toBe('Level 3 · Proficient')
    expect(levelText(ctx(3, ''))).toBe('Level 3')
    expect(levelText(ctx(2, 'Levels 1, 2'))).toBe('Levels 1, 2')
    expect(judgedAgainst({ competency: ctx(3, 'Proficient') } as never)).toBe('Eclampsia · Level 3 · Proficient')
    expect(judgedAgainst({ competency: null } as never)).toBe('')
  })

  it('says each part was judged at its own level, and the level for parts without one', () => {
    const options = { levelMode: 'perResource', competency: ctx(1, 'Aware'), levels: { '2': ctx(2, 'Plans'), '1': ctx(1, 'Aware') } }
    expect(judgedAgainst(options as never)).toBe(
      'Eclampsia · Each part at its own level (Levels 1, 2); parts without one at Level 1 · Aware',
    )
    expect(judgedAgainst({ ...options, competency: null } as never)).toBe('Eclampsia · Each part at its own level (Levels 1, 2)')
  })
})

describe('the FRAC role in exports', () => {
  const role = {
    positionCode: 'ANM',
    positionName: 'ANM',
    totalActivities: 12,
    activities: [{ role: 'R', activity: 'Identify pregnancy', description: '', competency: 'E', levels: [1] }],
  }

  it('names the position and the activities checked, or why none were', () => {
    expect(roleSummary({ domain: true, domainStyle: 'frac', role } as never)).toBe(
      'ANM: 1 FRAC activity needs the competency judged: Identify pregnancy',
    )
    expect(roleSummary({ domain: true, domainStyle: 'frac', role: null, roleNote: 'No position was picked' } as never)).toBe(
      'No position was picked',
    )
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
    expect(reportFileName({ courseName: '' }, 'pdf')).toBe('AI-review-review.pdf')
  })

  describe('the PDF document', () => {
    const html = buildReportHtml(review(), new Date('2026-10-31T11:00:00Z'))

    it('carries the summary, the score by resource, coverage and each resource', () => {
      expect(html).toContain('Needs significant revision')
      expect(html).toContain('Eclampsia · Level 2')
      expect(html).toContain('<ul class="inshort">')
      expect(html).toContain('<h2>Score by resource</h2>')
      expect(html).toContain('<td><b>Total</b></td>')
      expect(html).toContain('<h2>Is the competency level taught?</h2>')
      expect(html).toContain('Proteinuria')
      // Each finding once, in its resource's "To fix" list; no separate repeated-gaps section.
      expect(html).not.toContain('Checklist gaps that repeat')
      expect(html).toContain('Fix: Bare arm')
      expect(html).toContain('<h4 class="tofix">To fix')
      expect(html).toContain('The CBP checklist has 47 points.')
      expect(html).toContain('Domain review could not run: timed out')
      expect(html).toContain('Questions that need attention <span class="muted">· 1 of 2</span>')
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

  it('says why a doubted finding needs checking by hand', () => {
    const r = review()
    r.items = [
      item({
        result: {
          ...item().result!,
          addie: {
            model: 'g',
            score: {
              ...score,
              areas: [
                {
                  ...score.areas[0]!,
                  items: [{ ...score.areas[0]!.items[1]!, borderline: true, check: 'It quotes words that are not in the transcript.' }],
                },
              ],
            },
            summary: '',
            costUsd: 0,
          },
        },
      }),
    ]
    expect(buildReportHtml(r)).toContain('<span class="check">Check by hand: It quotes words that are not in the transcript.</span>')
  })

  it('says which level the content really fits, as FRAC judged it', () => {
    const r = review()
    r.items = [
      item({
        result: {
          ...item().result!,
          domain: {
            model: 'c',
            style: 'frac',
            score: { ...score, yes: 3, applicable: 6 },
            coverage: [],
            levelFit: { verdict: 'below', bestFitLevel: 2, rationale: 'Recall only' },
            summary: 'Basic.',
            costUsd: 0,
          },
        },
      }),
    ]
    expect(buildReportHtml(r)).toContain('<b>Pitched below the level</b> · best fits Level 2 — Recall only')
  })

  it('says near the top which videos had no sound and were reviewed on what they show', () => {
    const r = review()
    r.items = [...r.items, item({ contentId: 'do_m', name: 'Silent demo', result: { ...item().result!, noSound: true } })]
    const html = buildReportHtml(r)
    expect(html).toContain('<div class="nosound"><b>1 video has no sound.</b><p>It was reviewed on what it shows')
    expect(html).toContain('<li>Silent demo</li>')
    expect(html.indexOf('class="nosound"')).toBeLessThan(html.indexOf('<h2>Each'))
    expect(buildReportHtml(review())).not.toContain('class="nosound"')
  })

  it('opens the web page in a new tab, or reports a blocked tab', () => {
    const doc = { open: jest.fn(), write: jest.fn(), close: jest.fn() }
    const win = { document: doc, focus: jest.fn(), print: jest.fn() }
    expect(openReportTab(review(), { open: () => win as unknown as Window })).toBe(true)
    expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('<main class="page">'))
    expect(win.print).not.toHaveBeenCalled()
    expect(openReportTab(review(), { open: () => null })).toBe(false)
  })

  it('makes the web page a readable, responsive sheet with the same content as the PDF', () => {
    const at = new Date('2026-10-31T11:00:00Z')
    const page = buildReportPage(review(), at)
    expect(page).toContain('name="viewport"')
    expect(page).toContain('<body class="web"><main class="page">')
    expect(page).toContain('@media (max-width:760px)')
    // Nothing about a print dialog any more.
    expect(page).not.toContain('Save as PDF')
    const body = (html: string) => html.slice(html.indexOf('<body'), html.indexOf('</body>')).replace(/<body[^>]*>|<\/?main[^>]*>/g, '')
    expect(body(page)).toBe(body(buildReportHtml(review(), at)))
  })

  it('builds one sheet per view, with every checklist verdict and question', () => {
    const sheets = buildWorkbookSheets(review())
    expect(Object.keys(sheets)).toEqual(['Summary', 'Checklist', 'Coverage', 'Questions'])
    expect(sheets['Summary']).toContainEqual(['CBP checklist %', 50])
    expect(sheets['Checklist']).toContainEqual([
      'BP video',
      'Video',
      'Content Quality',
      'C2',
      'Cuff placement',
      'Not met',
      'Over clothing',
      'Bare arm',
    ])
    expect(sheets['Coverage']).toContainEqual(['Proteinuria', 'missing', ''])
    expect(sheets['Questions']).toContainEqual(['Final assessment', 1, 'Dose?', 'Needs attention', 'Key marks 4 mg', 'Mark 4 g'])
  })

  it('shows the course verdict, which weighs both reviews, in place of the checklist-only band', () => {
    const base = review()
    const judged = review({
      result: { ...base.result!, verdict: { band: 'red', message: 'Does not yet teach the competency level as required.' } },
    })
    const sheets = buildWorkbookSheets(judged)
    expect(sheets['Summary']).toContainEqual(['Verdict', 'Does not yet teach the competency level as required.'])
    expect(sheets['Summary']).not.toContainEqual(['Band', 'Needs significant revision'])
    const html = buildReportHtml(judged)
    expect(html).toContain('Does not yet teach the competency level as required.')
    expect(html).not.toContain('<div class="muted">Needs significant revision</div>')
    // A review from before the verdict existed keeps its band.
    expect(buildWorkbookSheets(base)['Summary']).toContainEqual(['Band', 'Needs significant revision'])
  })

  it('leaves the questions sheet out when there are none', () => {
    const sheets = buildWorkbookSheets(review({ items: [item()], result: null }))
    expect(Object.keys(sheets)).toEqual(['Summary', 'Checklist', 'Coverage'])
  })

  describe('a review of uploaded files', () => {
    const files = review({ source: 'upload', courseId: null, courseName: 'BP drafts', title: 'BP drafts' })

    it('is worded for files, not a course', () => {
      expect(reportWords(files)).toMatchObject({ summary: 'Summary', one: 'file', Many: 'Files', nameLabel: 'Review' })
      expect(reportWords(review())).toMatchObject({ summary: 'Course summary', one: 'resource', Many: 'Resources', nameLabel: 'Course' })
      const html = buildReportHtml(files, new Date('2026-10-31T11:00:00Z'))
      expect(html).toContain('AI File Review · advisory')
      expect(html).toContain('<h2>Each file</h2>')
      expect(html).toContain('<h2>Score by file</h2>')
      expect(html).toContain('<th>File</th>')
      expect(html).toContain('it changes nothing in CBP')
      expect(html).not.toContain('Each resource')
      expect(html).not.toContain('does not change the course')
    })

    it('labels the Excel sheets for files too', () => {
      const sheets = buildWorkbookSheets(files)
      expect(sheets['Summary'][0]).toEqual(['Review', 'BP drafts'])
      expect(sheets['Summary']).toContainEqual(['Files reviewed', 2])
      expect(sheets['Checklist'][0][0]).toBe('File')
      expect(sheets['Questions'][0][0]).toBe('File')
    })

    it('says a failed file could not be reviewed', () => {
      const failed = review({ source: 'upload', items: [item({ status: 'failed', error: null, result: null })] })
      expect(buildReportHtml(failed)).toContain('This file could not be reviewed.')
    })
  })
})

describe('HTML packages in the exports', () => {
  const pkg = {
    files: 9,
    pages: 4,
    videos: [{ path: 'a.mp4', durationSec: 90 }],
    images: 3,
    stills: 8,
    questions: 30,
    reportsProgress: false,
    savesState: true,
  }
  const withPackage = () =>
    review({
      items: [
        item({
          contentId: 'do_z',
          name: 'ASHA module',
          kind: 'html',
          mimeType: 'application/vnd.ekstep.html-archive',
          result: { ...item().result!, kind: 'html', durationSec: 90, htmlPackage: pkg },
        }),
      ],
    })

  it('says what a package holds and whether it reports progress, in one line', () => {
    expect(packageLine(pkg, 90)).toBe(
      '4 pages · 1 video (1 min 30 s) · 3 images · 30 questions. Reports learner progress: no (completion is not recorded). Saves where the learner left off: yes.',
    )
    expect(packageLine({ ...pkg, pages: 1, videos: [], images: 0, questions: 0, reportsProgress: true, savesState: false })).toBe(
      '1 page. Reports learner progress: yes. Saves where the learner left off: no.',
    )
  })

  it('puts it in the PDF under the package, as a warning when progress is not reported', () => {
    const html = buildReportHtml(withPackage())
    expect(html).toContain('<p class="pkg warn">4 pages · 1 video')
  })

  it('gives packages their own Excel sheet, only when there are any', () => {
    const sheets = buildWorkbookSheets(withPackage())
    expect(sheets['HTML packages']).toEqual([
      ['Resource', 'Pages', 'Videos', 'Video time', 'Images', 'Questions', 'Reports progress', 'Saves the learner’s place'],
      ['ASHA module', 4, 1, '1 min 30 s', 3, 30, 'No — completion is not recorded', 'Yes'],
    ])
    expect(buildWorkbookSheets(review())['HTML packages']).toBeUndefined()
  })
})

describe('course alignment in the exports', () => {
  const aligned = () =>
    review({
      result: {
        ...review().result!,
        alignment: {
          model: 'c',
          verdict: 'does_not',
          nameFits: false,
          nameNote: 'Says pregnancy, teaches nutrition.',
          promises: [{ promise: 'Danger signs', status: 'missing', coveredBy: [] }],
          offTopic: [{ name: 'Diet', why: 'Nutrition' }],
          fixes: ['Add danger signs'],
          summary: 'Off target.',
          costUsd: 0,
        },
      },
      items: [
        item({
          result: {
            ...item().result!,
            alignment: {
              model: 'g',
              verdict: 'off_topic',
              teaches: ['Diet'],
              serves: [],
              note: 'Nutrition only.',
              fix: 'Move it',
              costUsd: 0,
            },
          },
        }),
      ],
    })

  it('puts the verdict, the promises and each resource fit in the PDF', () => {
    const html = buildReportHtml(aligned())
    expect(html).toContain('Does not deliver what its description promises.')
    expect(html).toContain('<td>Danger signs</td>')
    expect(html).toContain('Off topic for this course')
    expect(html).toContain('→ Move it')
  })

  it('gives it its own Excel sheet', () => {
    const sheet = buildWorkbookSheets(aligned())['Course alignment']
    expect(sheet[0]).toEqual(['Course verdict', 'Does not deliver what its description promises'])
    expect(sheet).toContainEqual(['Danger signs', 'missing', ''])
    expect(sheet).toContainEqual(['BP video', 'Off topic for this course', 'Diet', 'Nutrition only.', 'Move it'])
    expect(buildWorkbookSheets(review())['Course alignment']).toBeUndefined()
  })
})

describe('the HTML and PDF report, on unusual reviews', () => {
  const line = (step: string, costUsd: number) => ({
    provider: 'gemini' as const,
    model: 'm',
    step,
    calls: 1,
    inputTokens: 10,
    outputTokens: 5,
    cachedTokens: 0,
    audioSec: 0,
    costUsd,
  })
  const domain = (over: Record<string, unknown> = {}) => ({
    model: 'c',
    style: 'frac' as const,
    score: { ...score, yes: 3, applicable: 6 },
    coverage: [],
    levelFit: { verdict: 'mixed' as const, bestFitLevel: null, rationale: '' },
    summary: 'Expert words.',
    costUsd: 0,
    ...over,
  })

  it('handles every resource state: errors, reuse, packages, silence, fit and a clean quiz', () => {
    const r = review({
      options: {
        competency: null,
        levelMode: 'perResource',
        levels: { '2': { competencyId: 'C', label: 'BP', level: 2, levelLabel: '', levelDescription: '', cadre: '' } },
        domainStyle: 'frac',
        domain: true,
        role: { positionName: 'ANM', activities: [{ role: 'ANC', activity: 'Detect HRP', competency: 'BP', levels: [2] }] },
      } as never,
      items: [
        // Every pass failed, and the result was reused from an earlier review with no date.
        item({
          contentId: 'e',
          name: 'Errors',
          result: {
            ...item().result!,
            addie: { error: 'checklist down' },
            domain: { error: 'expert down' },
            alignment: { error: 'fit down' },
            questionsError: 'quiz down',
            cached: true,
          } as never,
        }),
        // A package that reports progress; off topic for the course; a level fit with no rationale.
        item({
          contentId: 'p',
          name: 'Package',
          kind: 'html',
          result: {
            ...item().result!,
            kind: 'html',
            domain: domain(),
            alignment: { model: 'g', verdict: 'off_topic', teaches: [], serves: [], note: '', costUsd: 0 },
            htmlPackage: { files: 1, pages: 1, videos: [], images: 0, stills: 0, questions: 0, reportsProgress: true, savesState: true },
          } as never,
        }),
        // Two silent videos.
        item({ contentId: 's1', name: 'Silent one', result: { ...item().result!, noSound: true } }),
        item({ contentId: 's2', name: 'Silent two', result: { ...item().result!, noSound: true } }),
        // A quiz whose every question checks out.
        item({
          contentId: 'q',
          name: 'Clean quiz',
          kind: 'quiz',
          result: {
            ...item().result!,
            kind: 'quiz',
            addie: null,
            domain: null,
            questions: [{ n: 1, question: 'Q', verdict: 'ok', issues: [] }],
          } as never,
        }),
        // A resource that failed with no reason given.
        item({ contentId: 'f', name: 'Failed', status: 'failed', error: null, result: null }),
      ],
      result: {
        reviewed: 5,
        failed: 1,
        skipped: [],
        addie: null,
        domain: { yes: 3, applicable: 6, scorePct: 50 },
        coverage: [{ component: 'BP', status: 'covered', coveredBy: ['Package'] }],
        commonGaps: [],
        alignment: { error: 'course fit down' },
        costUsd: 0.2,
        usage: [line('claude course alignment', 0.05)],
      } as never,
    })
    r.items[1]!.result!.usage = [line('gemini checklist', 0.02)]
    const html = buildReportHtml(r)
    expect(html).toContain('Checklist could not run: checklist down')
    expect(html).toContain('Domain review could not run: expert down')
    expect(html).toContain('The course alignment check could not run: fit down')
    expect(html).toContain('Question check could not run: quiz down')
    expect(html).toContain('Unchanged since an earlier review')
    expect(html).toContain('<p class="pkg">')
    expect(html).toContain('Off topic for this course')
    expect(html).toContain('<b>Pitched at mixed levels</b></p>')
    expect(html).toContain('2 videos have no sound.')
    expect(html).toContain('Every question checks out')
    expect(html).toContain('This resource could not be reviewed.')
    expect(html).toContain('Each part at its own level')
    expect(html).toContain('ANM: 1 FRAC activity needs the competency judged: Detect HRP')
    // Judged per part, with no single competency: the coverage says so in general words.
    expect(html).toContain('<h2>Is the competency level taught?</h2>')
    // The cost table: a reused resource costs nothing, and the course-level call has its own group.
    expect(html).toContain('reused · $0')
    expect(html).toContain('The course as a whole')
    // No checklist: no checklist card, no checklist column.
    expect(html).not.toContain('<th class="num">CBP checklist</th>')
  })

  it('has no summary before the review has one, and names what it was judged against only when it can', () => {
    const html = buildReportHtml(review({ result: null }))
    expect(html).not.toContain('<h2>Score by')
    expect(judgedAgainst(null)).toBe('')
    expect(judgedAgainst({ levelMode: 'perResource', levels: {} } as never)).toBe('Each part at its own level')
    expect(roleSummary({ domainStyle: 'frac', domain: true, role: null, roleNote: 'No activities.' } as never)).toBe('No activities.')
    expect(roleSummary({ domainStyle: 'frac', domain: true } as never)).toBe('')
  })
})
