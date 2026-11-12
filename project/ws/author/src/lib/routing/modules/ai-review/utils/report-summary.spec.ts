import type ExcelJSType from 'exceljs'
import { IAiReview, IAiReviewItem, IAiReviewScore } from '../models/ai-review.model'
import { buildExcelWorkbook } from './report-excel'
import {
  borderlineCountOf,
  checklistTotalOf,
  coverageCountsOf,
  fixCountOf,
  fixGroupsOf,
  inShortOf,
  scoreNote,
  scoreRowsOf,
} from './report-summary'

// The self-contained browser bundle: the package's entry pulls in an ESM-only uuid jsdom cannot load.
const ExcelJS = jest.requireActual<typeof ExcelJSType>('exceljs/dist/exceljs.min.js')

const score = (yes: number, applicable: number, total = 47): IAiReviewScore => ({
  areas: [
    {
      area: 'Content Quality',
      items: [
        { id: 'C1', text: 'Accurate', verdict: 'yes', note: '' },
        { id: 'C2', text: 'Cuff placement', verdict: 'no', note: 'Over clothing', fix: 'Bare arm', borderline: true },
      ],
      yes,
      applicable,
      scorePct: Math.round((yes / applicable) * 100),
    },
  ],
  yes,
  applicable,
  naCount: total - applicable,
  total,
  scorePct: Math.round((yes / applicable) * 100),
  band: 'green',
  bandMessage: 'Meets the CBP standard.',
  failedIds: ['C2'],
})

const item = (contentId: string, over: Partial<IAiReviewItem> = {}): IAiReviewItem => ({
  contentId,
  name: `Resource ${contentId}`,
  kind: 'video',
  mimeType: 'video/mp4',
  status: 'done',
  stage: null,
  skipReason: null,
  error: null,
  result: {
    contentId,
    name: `Resource ${contentId}`,
    kind: 'video',
    durationSec: 60,
    transcriptChars: 1,
    transcriptEngine: null,
    watched: null,
    addie: { model: 'g', score: score(40, 41), summary: 'Clear.', costUsd: 0 },
    domain: {
      model: 'c',
      style: 'plain',
      score: {
        ...score(3, 6, 6),
        areas: [
          {
            area: 'Domain',
            items: [{ id: 'D3', text: 'Nothing skipped', verdict: 'no', note: 'Skips EDD', fix: 'Add EDD' }],
            yes: 3,
            applicable: 6,
            scorePct: 50,
          },
        ],
      },
      coverage: [{ component: 'EDD', status: 'missing', evidence: '' }],
      levelFit: null,
      summary: 'Misses EDD.',
      costUsd: 0,
    },
    costUsd: 0,
    cached: false,
  },
  ...over,
})

const review = (): IAiReview =>
  ({
    id: 'r1',
    courseId: 'do_1',
    courseName: 'Pregnancy',
    status: 'done',
    requestedBy: { id: 'u1', name: 'Asha' },
    options: {
      competency: { competencyId: 'C1', label: 'Pregnancy', level: 4, levelLabel: 'Level 4', levelDescription: '', cadre: 'ANM' },
    },
    progress: { done: 3, total: 3 },
    queuePosition: 0,
    latestLog: '',
    log: [],
    items: [
      item('do_a', { result: { ...item('do_a').result!, noSound: true } }),
      item('do_b'),
      item('do_x', { status: 'failed', error: 'Download timed out', result: null }),
      item('do_s', { status: 'skipped', result: null }),
    ],
    result: {
      reviewed: 2,
      failed: 1,
      skipped: [{ contentId: 'do_s', name: 'Link', reason: 'Links are not reviewed' }],
      addie: { scorePct: 98, band: 'green', bandMessage: 'Meets the CBP standard — ship it.', yes: 80, applicable: 82 },
      domain: { yes: 6, applicable: 12, scorePct: 50 },
      coverage: [
        { component: 'EDD', status: 'missing', coveredBy: [] },
        { component: 'HRP', status: 'covered', coveredBy: ['Resource do_b'] },
        { component: 'Fundal height', status: 'partial', coveredBy: [] },
      ],
      commonGaps: [],
      costUsd: 0.5,
    },
    error: null,
    costUsd: 0.5,
    estimateUsd: 0.6,
    createdAt: '2026-11-06T10:00:00Z',
    finishedAt: '2026-11-06T10:05:00Z',
  }) as IAiReview

describe('report summary', () => {
  it("groups each resource's findings once, in a fixed order, leaving level coverage out", () => {
    const groups = fixGroupsOf(review())
    expect(groups.get('do_a')!.map(g => g.source)).toEqual(['noSound', 'checklist', 'domain'])
    expect(groups.get('do_a')![1]).toMatchObject({ label: 'CBP checklist · not met' })
    expect(groups.get('do_a')![1].issues[0]).toMatchObject({ id: 'C2', borderline: true })
    expect(groups.get('do_b')!.map(g => g.source)).toEqual(['checklist', 'domain'])
    // A failed resource shows its error instead; nothing is listed twice.
    expect(groups.has('do_x')).toBe(false)
    expect(fixCountOf(groups, 'do_a')).toBe(3)
    expect(fixCountOf(groups, 'nope')).toBe(0)
  })

  it('scores each resource, with a failed one marked and the skipped one left out', () => {
    const rows = scoreRowsOf(review(), fixGroupsOf(review()))
    expect(rows.map(r => r.item.contentId)).toEqual(['do_a', 'do_b', 'do_x'])
    expect(rows[0]).toMatchObject({
      addie: { yes: 40, applicable: 41, pct: 98, band: 'green' },
      domain: { yes: 3, applicable: 6 },
      fixes: 3,
      failed: false,
    })
    expect(rows[2]).toMatchObject({ addie: null, domain: null, fixes: 0, failed: true })
  })

  it('tells a check that could not run from one that was not asked for', () => {
    const r = review()
    r.items[1] = { ...r.items[1], result: { ...r.items[1].result!, addie: { error: 'timed out' }, domain: null } }
    const rows = scoreRowsOf(r, fixGroupsOf(r))
    expect(rows[1]).toMatchObject({ addie: null, addieFailed: true, domain: null, domainFailed: false })
    expect(rows[0]).toMatchObject({ addieFailed: false, domainFailed: false })
  })

  it('reads the full checklist length and the coverage counts', () => {
    expect(checklistTotalOf(review())).toBe(47)
    expect(checklistTotalOf({ items: [] })).toBe(0)
    expect(coverageCountsOf(review())).toEqual({ covered: 1, partial: 1, missing: 1 })
    expect(coverageCountsOf({ result: null })).toBeNull()
  })

  it('sums the report up in plain sentences', () => {
    expect(inShortOf(review(), { one: 'resource', many: 'resources' }, 5)).toEqual([
      '2 resources reviewed; 1 could not be reviewed; 1 left out (listed below).',
      'CBP checklist: 98% — 80 of the 82 checks that apply are met (Meets the CBP standard — ship it).',
      'Competency level: 1 of 3 parts fully taught, 1 partly, 1 missing.',
      '5 things to fix, listed under each resource below.',
      '2 findings are marked Borderline: the reviewer was not sure, or could not prove them from the material. Check them by hand before acting.',
    ])
    expect(inShortOf({ ...review(), result: null }, { one: 'file', many: 'files' }, 0)).toEqual([])
  })

  it('leads with the course verdict, which weighs both reviews, and drops the checklist-only message', () => {
    const r = review()
    const withVerdict = {
      ...r,
      result: { ...r.result!, verdict: { band: 'red' as const, message: 'Does not yet teach the competency level as required.' } },
    }
    const lines = inShortOf(withVerdict, { one: 'resource', many: 'resources' }, 5)
    expect(lines[0]).toBe('Does not yet teach the competency level as required.')
    expect(lines[2]).toBe('CBP checklist: 98% — 80 of the 82 checks that apply are met.')
    expect(lines.join(' ')).not.toContain('ship it')
  })

  it('explains why a resource is scored on fewer points than the checklist has', () => {
    expect(scoreNote(47, 'file')).toContain('The CBP checklist has 47 points.')
    expect(scoreNote(47, 'file')).toContain('a quiz has no visuals or narration to judge')
    expect(scoreNote(47, 'file')).toContain('So a file is scored on fewer than 47.')
  })

  it('names the full 47-point checklist even when the first resource is a quiz (only 17 points fit a quiz)', () => {
    const r = review()
    const quiz = item('do_q', { kind: 'quiz', mimeType: 'application/json' })
    quiz.result = { ...quiz.result!, addie: { model: 'g', score: score(10, 15, 17), summary: '', costUsd: 0 } }
    expect(checklistTotalOf({ items: [quiz, ...r.items] })).toBe(47)
  })
})

describe('the Excel workbook', () => {
  it('has a "To fix" sheet with each finding once, and the score by resource with its total', async () => {
    const buffer = await buildExcelWorkbook(review(), ExcelJS, new Date('2026-11-06T11:00:00Z'))
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    const names = wb.worksheets.map(w => w.name)
    expect(names).toContain('To fix')
    expect(names).not.toContain('Issues to fix')

    const values = (name: string) => {
      const out: string[] = []
      wb.getWorksheet(name)!.eachRow(row =>
        out.push(
          (row.values as unknown[])
            .map(v => (v && typeof v === 'object' && 'text' in v ? (v as { text: string }).text : String(v ?? '')))
            .join('|'),
        ),
      )
      return out
    }
    const fix = values('To fix')
    // 3 for do_a (no sound, C2, D3) + 2 for do_b; no coverage rows.
    expect(fix.length - 1).toBe(5)
    expect(fix.some(r => r.includes('Cuff placement (borderline)'))).toBe(true)
    expect(fix.some(r => r.includes('EDD|missing'))).toBe(false)

    const summary = values('Summary')
    expect(summary.some(r => r.includes('In short'))).toBe(true)
    expect(summary.some(r => r.includes('Score by resource'))).toBe(true)
    expect(summary.some(r => r.startsWith('|Total|') && r.includes('80 of 82'))).toBe(true)
    expect(summary.some(r => r.includes('Resource do_a') && r.includes('40 of 41'))).toBe(true)
    expect(summary.some(r => r.includes('The CBP checklist has 47 points.'))).toBe(true)
    expect(summary.some(r => r.includes('Left out of the review') && r.includes('Links are not reviewed'))).toBe(true)
    expect(summary.some(r => r.includes('not included'))).toBe(false)
  })
})

describe('findings to check by hand', () => {
  it('are counted and said in the summary, and not when there are none', () => {
    // The fixture's C2 is marked borderline in every scored resource.
    const r = review()
    expect(borderlineCountOf(r)).toBe(2)
    const lines = inShortOf(r, { one: 'resource', many: 'resources' }, 5)
    expect(lines.at(-1)).toBe(
      '2 findings are marked Borderline: the reviewer was not sure, or could not prove them from the material. Check them by hand before acting.',
    )
    const clean = { ...r, items: [] }
    expect(inShortOf(clean, { one: 'resource', many: 'resources' }, 0).some(l => l.includes('Borderline'))).toBe(false)
  })
})

describe('the Excel workbook, in full', () => {
  it('adds the cost sheet when the service sends each call, and says what was judged and for whom', async () => {
    const line = (step: string, provider: 'gemini' | 'anthropic', costUsd: number) => ({
      provider,
      model: 'm',
      step,
      calls: 1,
      inputTokens: 1000,
      outputTokens: 100,
      cachedTokens: 0,
      audioSec: 0,
      costUsd,
    })
    const r = review()
    r.items[0]!.result = {
      ...r.items[0]!.result!,
      usage: [line('gemini checklist', 'gemini', 0.04), line('claude domain', 'anthropic', 0.08)],
    }
    r.items[1]!.result = { ...r.items[1]!.result!, cached: true }
    r.options = {
      ...r.options,
      audience: 'ANM',
      domainStyle: 'frac',
      role: { positionName: 'ANM-BIHAR', activities: [{ role: 'ANC', activity: 'Detect HRP', competency: 'Pregnancy', levels: [4] }] },
    } as never
    r.result = {
      ...r.result!,
      alignment: {
        model: 'c',
        verdict: 'partly',
        nameFits: true,
        nameNote: '',
        promises: [],
        offTopic: [],
        fixes: [],
        summary: 'Covers most of it.',
        costUsd: 0,
      },
      usage: [line('claude course alignment', 'anthropic', 0.05)],
    } as never
    const buffer = await buildExcelWorkbook(r, ExcelJS, new Date('2026-11-06T11:00:00Z'))
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    expect(wb.worksheets.map(w => w.name)).toContain('Costs')
    const rows: string[] = []
    wb.getWorksheet('Summary')!.eachRow(row =>
      rows.push(
        (row.values as unknown[])
          .map(v => String(v && typeof v === 'object' && 'text' in v ? (v as { text: string }).text : (v ?? '')))
          .join('|'),
      ),
    )
    expect(rows.some(x => x.includes('Audience|ANM'))).toBe(true)
    expect(rows.some(x => x.includes('Course alignment') && x.includes('Partly delivers'))).toBe(true)
    const costs: string[] = []
    wb.getWorksheet('Costs')!.eachRow(row => costs.push((row.values as unknown[]).join('|')))
    expect(costs.some(x => x.includes('Unchanged since an earlier review'))).toBe(true)
    expect(costs.some(x => x.startsWith('|Total|'))).toBe(true)
  })
})

describe('the Excel workbook, when something could not run', () => {
  it('says which check could not run and why, on the resource and in the summary', async () => {
    const r = review()
    r.items[1] = {
      ...r.items[1],
      result: { ...r.items[1].result!, addie: { error: 'Gemini timed out' }, transcriptError: 'elevenlabs: 429' },
    }
    const buffer = await buildExcelWorkbook(r, ExcelJS, new Date('2026-11-06T11:00:00Z'))
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    const text = (name: string) => {
      const out: string[] = []
      wb.getWorksheet(name)!.eachRow(row =>
        out.push(
          (row.values as unknown[])
            .map(v => (v && typeof v === 'object' && 'text' in v ? (v as { text: string }).text : String(v ?? '')))
            .join('|'),
        ),
      )
      return out
    }
    const resources = text('Resources')
    expect(resources[0]).toContain('Could not run')
    const row = resources.find(x => x.includes(r.items[1].name))!
    expect(row).toContain('Checklist: Gemini timed out')
    expect(row).toContain('The speech could not be transcribed (elevenlabs: 429)')
    expect(text('Summary').some(x => x.includes('Not fully reviewed') && x.includes('Gemini timed out'))).toBe(true)
  })
})
