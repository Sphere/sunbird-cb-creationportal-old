import { HttpErrorResponse } from '@angular/common/http'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { IAiReviewAdminPage, IAiReviewAdminRow, IAiReviewAdminSummary } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import {
  AiReviewReportsPageComponent,
  csvField,
  initials,
  isoDay,
  personName,
  rangeOf,
  reviewsCsv,
  usdText,
} from './ai-review-reports-page.component'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { saveAs } = require('file-saver') as { saveAs: jest.Mock }

const row = (over: Partial<IAiReviewAdminRow> = {}): IAiReviewAdminRow => ({
  id: 'r1',
  source: 'course',
  courseId: 'do_1',
  name: 'BP care',
  requestedBy: { id: 'u1', name: 'Asha' },
  status: 'done',
  progress: { done: 3, total: 3 },
  costUsd: 0.81,
  estimateUsd: 0.9,
  scorePct: 86,
  verdict: { band: 'green', message: 'Ready to publish' },
  competency: { label: 'C18 Antenatal care' },
  createdAt: '2026-11-12T10:00:00Z',
  finishedAt: '2026-11-12T10:05:00Z',
  ...over,
})

const pageOf = (rows: IAiReviewAdminRow[], total = rows.length, offset = 0): IAiReviewAdminPage => ({
  reviews: rows,
  page: { total, limit: 50, offset },
  costUsd: rows.reduce((n, r) => n + r.costUsd, 0),
})

const summary = (): IAiReviewAdminSummary => ({
  totals: { reviews: 4, costUsd: 2.5, people: 2, courses: 3, files: 1 },
  byPerson: [{ userId: 'u1', name: 'Asha', reviews: 3, costUsd: 2, lastAt: '2026-11-12T10:00:00Z' }],
  byCourse: [{ courseId: 'do_1', name: 'BP care', reviews: 2, costUsd: 1.5, lastAt: '2026-11-12T10:00:00Z' }],
  byDay: [{ day: '2026-11-12', reviews: 4, costUsd: 2.5 }],
  month: { spentUsd: 170, budgetUsd: 200 },
})

describe('report helpers', () => {
  it('turns a period into from and to days, counted back from today', () => {
    const today = new Date(2026, 10, 13)
    expect(rangeOf('month', today)).toEqual({ from: '2026-11-01', to: '2026-11-13' })
    expect(rangeOf('30d', today)).toEqual({ from: '2026-10-15', to: '2026-11-13' })
    expect(rangeOf('year', today)).toEqual({ from: '2026-01-01', to: '2026-11-13' })
    expect(rangeOf('all', today)).toEqual({})
    expect(rangeOf('custom', today, { from: '2026-10-01', to: '' })).toEqual({ from: '2026-10-01' })
    expect(isoDay(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('never shows a small spend as $0.00', () => {
    expect(usdText(0)).toBe('$0.00')
    expect(usdText(0.0042)).toBe('$0.0042')
    expect(usdText(12.345)).toBe('$12.35')
  })

  it('writes CSV a spreadsheet cannot run as a formula, Hindi included', () => {
    expect(csvField('a "quoted" name')).toBe('"a ""quoted"" name"')
    expect(csvField('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    expect(csvField('+1')).toBe('"\'+1"')
    const csv = reviewsCsv([
      row({ name: 'आशा प्रशिक्षण' }),
      row({ id: 'r2', source: 'upload', courseId: null, verdict: null, scorePct: null }),
    ])
    const lines = csv.split('\r\n')
    expect(lines[0]).toContain('"Run by"')
    expect(lines[1]).toContain('"आशा प्रशिक्षण"')
    expect(lines[1]).toContain('"0.8100"')
    expect(lines[2]).toContain('"Files"')
  })
})

describe('AiReviewReportsPageComponent', () => {
  let fixture: ComponentFixture<AiReviewReportsPageComponent>
  let c: AiReviewReportsPageComponent
  let api: { adminReviews: jest.Mock; adminSummary: jest.Mock }
  let router: { navigate: jest.Mock }
  const el = () => fixture.nativeElement as HTMLElement

  const start = () => {
    TestBed.configureTestingModule({
      declarations: [AiReviewReportsPageComponent],
      providers: [
        { provide: AiReviewService, useValue: api },
        { provide: Router, useValue: router },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    fixture = TestBed.createComponent(AiReviewReportsPageComponent)
    c = fixture.componentInstance
    fixture.detectChanges()
  }

  beforeEach(() => {
    jest.useFakeTimers()
    api = {
      adminReviews: jest
        .fn()
        .mockReturnValue(of(pageOf([row(), row({ id: 'r2', source: 'upload', courseId: null, name: 'BP drafts' })], 120))),
      adminSummary: jest.fn().mockReturnValue(of(summary())),
    }
    router = { navigate: jest.fn() }
    saveAs.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    TestBed.resetTestingModule()
  })

  it("loads this month's spend and reviews, and shows who spent what and on which course", () => {
    start()
    const month = rangeOf('month', new Date())
    expect(api.adminSummary).toHaveBeenCalledWith(month)
    expect(api.adminReviews).toHaveBeenCalledWith(month, 50, 0)
    const text = el().textContent || ''
    expect(text).toContain('$2.50')
    // This month is the period, so the budget shows what is left rather than repeating the spend.
    expect(text).toContain('$200.00')
    expect(text).toContain('$30.00')
    expect(c.budgetLeft()).toBe(30)
    expect(text).toContain('this month')
    expect(text).toContain('Cost is what the AI providers')
    expect(c.budgetPct()).toBe(85)
    expect(el().querySelector('.rp-ring--high')).toBeTruthy()
    expect(c.perReview()).toBeCloseTo(0.625)
    expect(text).toContain('Asha')
    expect(text).toContain('BP care')
    expect(text).toContain('BP drafts')
    expect(text).toContain('Ready to publish')
    expect(c.pageText()).toBe('1–2 of 120')
    expect(c.pages()).toBe(3)
    expect(c.pageNo()).toBe(1)
  })

  it('switches between every review, the spend by person and by course, and opens a person’s reviews', () => {
    start()
    c.tab.set('people')
    fixture.detectChanges()
    expect(el().querySelector('table')!.textContent).toContain('Asha')
    expect(el().querySelector('table')!.textContent).toContain('$2.00')
    c.tab.set('courses')
    fixture.detectChanges()
    expect(el().querySelector('table')!.textContent).toContain('BP care')
    expect(el().querySelector('table')!.textContent).toContain('$1.50')
    c.showPerson('u1')
    expect(c.tab()).toBe('reviews')
    expect(api.adminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 'u1' }), 50, 0)
  })

  it('says under each review what it covered, and how far a running one has got', () => {
    start()
    expect(c.metaOf(row())).toBe('3 resources · C18 Antenatal care')
    expect(c.metaOf(row({ source: 'upload', competency: null, progress: { done: 1, total: 1 } }))).toBe('1 file')
    expect(c.metaOf(row({ status: 'running', competency: null, progress: { done: 1, total: 4 } }))).toBe('4 resources · 1 of 4 done')
    c.setPeriod('all')
    expect(c.periodText()).toBe('since the first review')
  })

  it("gives each person's or course's share of the spend, and how long a review took", () => {
    start()
    expect(c.sharePct(2)).toBe(80)
    expect(c.sharePct(0)).toBe(0)
    expect(c.durationText('2026-11-12T10:00:00Z', '2026-11-12T10:00:40Z')).toBe('40 s')
    expect(c.durationText('2026-11-12T10:00:00Z', '2026-11-12T10:04:20Z')).toBe('4 min')
    expect(c.durationText('2026-11-12T10:00:00Z', '2026-11-12T11:05:00Z')).toBe('1 h 5 min')
    c.tab.set('people')
    fixture.detectChanges()
    expect(el().querySelector('.rp-share')!.textContent).toContain('80%')
  })

  it('names a person saved without a name by a short id, with initials for the avatar', () => {
    expect(personName('f56a13ed-04be-4018', '')).toBe('User f56a13ed')
    expect(personName('x', ' Asha Kumari ')).toBe('Asha Kumari')
    expect(initials('Asha Kumari')).toBe('AK')
    expect(initials('Asha')).toBe('AS')
    expect(initials('')).toBe('?')
  })

  it('reloads for each filter, with the search waiting for a pause in typing', () => {
    start()
    api.adminSummary.mockClear()
    api.adminReviews.mockClear()
    c.setSource('upload')
    expect(api.adminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'upload' }), 50, 0)
    c.setPerson('u1')
    expect(api.adminSummary).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'upload', userId: 'u1' }))
    c.setPeriod('all')
    expect(api.adminReviews).toHaveBeenLastCalledWith({ source: 'upload', userId: 'u1' }, 50, 0)
    const calls = api.adminReviews.mock.calls.length
    c.setQuery('B')
    c.setQuery('BP')
    expect(api.adminReviews.mock.calls.length).toBe(calls)
    jest.advanceTimersByTime(400)
    expect(api.adminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'BP' }), 50, 0)
    c.clearFilters()
    // Everything back to the start, the period included.
    expect(c.period()).toBe('month')
    expect(api.adminReviews).toHaveBeenLastCalledWith(rangeOf('month', new Date()), 50, 0)
  })

  it('shows each filter in use as a chip that removes just that one, and Clear all', () => {
    start()
    expect(c.activeFilters()).toEqual([])
    expect(el().querySelector('.rp-chips')).toBeNull()
    c.setPeriod('all')
    c.setPerson('u1')
    c.setSource('upload')
    c.setStatus('done')
    c.setQuery('BP')
    jest.advanceTimersByTime(400)
    fixture.detectChanges()
    expect(c.activeFilters().map(f => `${f.label}: ${f.value}`)).toEqual([
      'Period: All time',
      'Run by: Asha',
      'Type: Files',
      'Status: Done',
      'Search: “BP”',
    ])
    const chips = Array.from(el().querySelectorAll('.rp-fchip')).map(x => x.textContent!.replace(/\s+/g, ' ').trim())
    expect(chips).toHaveLength(5)
    expect(el().textContent).toContain('Clear all')
    // Removing one keeps the others.
    c.removeFilter('status')
    expect(c.status()).toBe('')
    expect(api.adminReviews).toHaveBeenLastCalledWith({ userId: 'u1', source: 'upload', q: 'BP' }, 50, 0)
    c.removeFilter('period')
    expect(c.period()).toBe('month')
    c.removeFilter('query')
    c.removeFilter('person')
    c.removeFilter('source')
    expect(c.activeFilters()).toEqual([])
  })

  it('does not ask for a custom period that ends before it starts', () => {
    start()
    c.setPeriod('custom')
    api.adminReviews.mockClear()
    c.setCustom('from', '2026-11-10')
    c.setCustom('to', '2026-11-01')
    expect(c.customInvalid()).toBe(true)
    expect(api.adminReviews).toHaveBeenCalledTimes(1) // only for "from"
    fixture.detectChanges()
    expect(el().textContent).toContain('The "From" date is after the "To" date.')
  })

  it('pages through the reviews', () => {
    start()
    expect(c.hasPrev()).toBe(false)
    expect(c.hasNext()).toBe(true)
    c.next()
    expect(api.adminReviews).toHaveBeenLastCalledWith(expect.anything(), 50, 50)
    c.prev()
    expect(api.adminReviews).toHaveBeenLastCalledWith(expect.anything(), 50, 0)
  })

  it('opens a course review on its course page, and a file review on the file review page', () => {
    start()
    c.open(row())
    expect(router.navigate).toHaveBeenLastCalledWith(['/author/ai-review/courses', 'do_1'], { queryParams: { review: 'r1' } })
    c.open(row({ id: 'r2', source: 'upload', courseId: null }))
    expect(router.navigate).toHaveBeenLastCalledWith(['/author/ai-review/new'], { queryParams: { review: 'r2' } })
  })

  it('downloads every matching review as CSV, a page of 200 at a time', async () => {
    start()
    api.adminReviews.mockReset()
    api.adminReviews
      .mockReturnValueOnce(
        of(
          pageOf(
            Array.from({ length: 200 }, (_, i) => row({ id: `a${i}` })),
            250,
          ),
        ),
      )
      .mockReturnValueOnce(
        of(
          pageOf(
            Array.from({ length: 50 }, (_, i) => row({ id: `b${i}` })),
            250,
            200,
          ),
        ),
      )
    await c.download()
    expect(api.adminReviews).toHaveBeenNthCalledWith(1, expect.anything(), 200, 0)
    expect(api.adminReviews).toHaveBeenNthCalledWith(2, expect.anything(), 200, 200)
    expect(saveAs).toHaveBeenCalledTimes(1)
    const [blob, name] = saveAs.mock.calls[0]
    expect(name).toMatch(/^AI-review-report-\d{4}-\d{2}-01-to-\d{4}-\d{2}-\d{2}\.csv$/)
    expect((blob as Blob).type).toBe('text/csv;charset=utf-8')
    expect(c.downloading()).toBe(false)
  })

  it('says why the report could not load, and tries again', () => {
    api.adminSummary.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { error: { code: 'FORBIDDEN', message: 'Only AI review administrators can see this.' } },
          }),
      ),
    )
    start()
    fixture.detectChanges()
    expect(el().textContent).toContain('Only AI review administrators can see this.')
    api.adminSummary.mockReturnValue(of(summary()))
    c.reload()
    expect(c.error()).toBe('')
    expect(c.summary()).not.toBeNull()
  })

  it('handles the edges: a custom period, no budget, no data yet, a review with nothing to show', () => {
    expect(rangeOf('custom', new Date(2026, 10, 13), { from: '', to: '2026-11-10' })).toEqual({ to: '2026-11-10' })
    expect(rangeOf('custom', new Date(2026, 10, 13))).toEqual({})
    expect(csvField(null)).toBe('""')
    expect(personName('', '')).toBe('User ')
    const csv = reviewsCsv([row({ finishedAt: null, costUsd: 0 })])
    expect(csv).toContain('"0.0000"')

    api.adminSummary.mockReturnValue(
      of({ ...summary(), month: { spentUsd: 3, budgetUsd: 0 }, totals: { reviews: 0, costUsd: 0, people: 7, courses: 0, files: 0 } }),
    )
    api.adminReviews.mockReturnValue(of(pageOf([], 0)))
    start()
    expect(c.budgetPct()).toBe(0)
    expect(c.budgetLeft()).toBe(0)
    expect(c.perReview()).toBe(0)
    expect(c.sharePct(1)).toBe(0)
    expect(c.pageText()).toBe('')
    expect(c.faces().more).toBe(2)

    c.setPeriod('custom')
    expect(c.periodText()).toBe('all time')
    c.setCustom('from', '2026-11-01')
    expect(c.periodText()).toBe('from 2026-11-01 to today')
    expect(c.activeFilters()[0]).toEqual({ key: 'period', label: 'Period', value: 'from 2026-11-01 to today' })
    c.setSource('course')
    c.setPerson('someone-unknown')
    expect(c.activeFilters().map(f => f.value)).toEqual(['from 2026-11-01 to today', 'User someone-', 'Courses'])

    expect(c.metaOf(row({ progress: undefined as never, competency: null }))).toBe('')
    expect(c.metaOf(row({ progress: { done: 0, total: 1 }, competency: null }))).toBe('1 resource')
    expect(c.metaOf(row({ source: 'upload', progress: { done: 0, total: 2 }, competency: null }))).toBe('2 files')
    expect(c.outcome(row({ verdict: null, scorePct: 81.6 }))).toBe('CBP 82%')
    expect(c.outcome(row({ verdict: null, scorePct: null }))).toBe('')
    expect(c.outcome(row({ verdict: { band: 'red' }, scorePct: undefined as never }))).toBe('')
  })

  it('says why a download failed, and runs one download at a time', async () => {
    start()
    api.adminReviews.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
    const first = c.download()
    await c.download()
    await first
    expect(saveAs).not.toHaveBeenCalled()
    expect(c.downloadError()).toBeTruthy()
    expect(c.downloading()).toBe(false)
  })

  it('names the custom period in the downloaded file', async () => {
    start()
    c.setPeriod('custom')
    c.setCustom('to', '2026-11-10')
    api.adminReviews.mockReturnValue(of(pageOf([row()])))
    await c.download()
    expect(saveAs.mock.calls[0][1]).toBe('AI-review-report-start-to-2026-11-10.csv')
  })

  it('says why the list could not load', () => {
    api.adminReviews.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 502 })))
    start()
    expect(c.error()).toMatch(/not available right now/)
    expect(c.loadingPage()).toBe(false)
  })

  it('offers a way out when nothing matches', () => {
    api.adminReviews.mockReturnValue(of(pageOf([])))
    start()
    fixture.detectChanges()
    expect(el().textContent).toContain('No reviews match.')
    expect(el().textContent).toContain('Show all time')
  })
})
