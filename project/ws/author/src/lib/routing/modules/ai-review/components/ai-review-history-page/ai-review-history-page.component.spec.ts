import { HttpErrorResponse } from '@angular/common/http'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { IAiReviewPastReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { AiReviewHistoryPageComponent, competencyChip, competencyInFull, levelsWords } from './ai-review-history-page.component'

const entry = (over: Partial<IAiReviewPastReview> = {}): IAiReviewPastReview => ({
  id: 'r1',
  source: 'course',
  courseId: 'do_1',
  name: 'Pregnancy identification',
  status: 'done',
  requestedBy: { id: 'u1', name: 'Asha' },
  progress: { done: 3, total: 3 },
  summary: {
    reviewed: 3,
    failed: 0,
    skipped: [],
    addie: { scorePct: 86, band: 'green', bandMessage: '', yes: 118, applicable: 138 },
    domain: { yes: 6, applicable: 24, scorePct: 25 },
    coverage: [],
    commonGaps: [],
    costUsd: 0.5,
  },
  createdAt: '2026-11-11T06:22:00Z',
  finishedAt: '2026-11-11T06:27:00Z',
  ...over,
})

describe('AiReviewHistoryPageComponent', () => {
  let fixture: ComponentFixture<AiReviewHistoryPageComponent>
  let c: AiReviewHistoryPageComponent
  let api: { pastReviews: jest.Mock }
  let router: { navigate: jest.Mock }
  const el = () => fixture.nativeElement as HTMLElement

  const start = (list: IAiReviewPastReview[] | HttpErrorResponse) => {
    api = { pastReviews: jest.fn().mockReturnValue(Array.isArray(list) ? of(list) : throwError(() => list)) }
    router = { navigate: jest.fn().mockResolvedValue(true) }
    TestBed.configureTestingModule({
      declarations: [AiReviewHistoryPageComponent],
      providers: [
        { provide: AiReviewService, useValue: api },
        { provide: Router, useValue: router },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    fixture = TestBed.createComponent(AiReviewHistoryPageComponent)
    c = fixture.componentInstance
    fixture.detectChanges()
  }

  it('lists every review the account started, courses and files, with their scores', () => {
    start([entry(), entry({ id: 'r2', source: 'upload', courseId: null, name: 'BP drafts', summary: null })])
    expect(c.loading()).toBe(false)
    expect(c.counts()).toEqual({ all: 2, course: 1, upload: 1 })
    const rows = Array.from(el().querySelectorAll('button.air-past-row')).map(b => b.textContent!.replace(/\s+/g, ' '))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('Pregnancy identification')
    expect(rows[0]).toContain('CBP 86%')
    expect(rows[0]).toContain('Domain 6/24')
    expect(rows[1]).toContain('BP drafts')
    expect(rows[1]).toContain('Files')
    expect(rows[0]).toContain('Open report')
  })

  it('says when the list is full, so older reviews are not taken as gone', () => {
    start([entry()])
    expect(el().textContent).not.toContain('Showing your latest')
    TestBed.resetTestingModule()
    start(Array.from({ length: 50 }, (_, i) => entry({ id: `r${i}` })))
    expect(el().textContent).toContain('Showing your latest 50 reviews.')
  })

  it('filters by kind and finds by name', () => {
    start([entry(), entry({ id: 'r2', source: 'upload', courseId: null, name: 'BP drafts' }), entry({ id: 'r3', name: 'Newborn care' })])
    c.filter.set('upload')
    expect(c.shown().map(r => r.id)).toEqual(['r2'])
    c.filter.set('course')
    expect(c.shown().map(r => r.id)).toEqual(['r1', 'r3'])
    c.query.set('newborn')
    expect(c.shown().map(r => r.id)).toEqual(['r3'])
    c.query.set('nothing like this')
    fixture.detectChanges()
    expect(el().textContent).toContain('No reviews match')
    expect(c.countOf('all')).toBe(3)
  })

  it('shows the competency code and level each review was judged against, and finds by them', () => {
    const basket = { code: 'C18', label: 'Awareness on basket of choice', levels: [4], levelLabel: 'Screens client' }
    start([
      entry({ judgedAgainst: [basket] }),
      entry({
        id: 'r2',
        name: 'Newborn care',
        judgedAgainst: [{ code: 'C7', label: 'Newborn care', levels: [1, 2, 3], levelLabel: null }],
      }),
      // Checklist only, and an older service that sends no field.
      entry({ id: 'r3', name: 'No competency', judgedAgainst: [] }),
      entry({ id: 'r4', name: 'Older service' }),
    ])
    const chips = Array.from(el().querySelectorAll('.air-mini--competency'))
    expect(chips.map(x => x.textContent!.trim())).toEqual(['C18 · Level 4', 'C7 · Levels 1–3'])
    expect(chips[0].getAttribute('title')).toBe('C18 Awareness on basket of choice, Level 4: Screens client')
    const row = el().querySelector('button.air-past-row')!
    expect(row.getAttribute('aria-label')).toBe(
      'Open the AI review of Pregnancy identification, judged against C18 Awareness on basket of choice, Level 4: Screens client',
    )
    expect(el().querySelectorAll('button.air-past-row')[3].getAttribute('aria-label')).toBe('Open the AI review of Older service')
    c.query.set('c18')
    expect(c.shown().map(r => r.id)).toEqual(['r1'])
    c.query.set('basket of choice')
    expect(c.shown().map(r => r.id)).toEqual(['r1'])
  })

  it('words levels and competencies', () => {
    expect(levelsWords([])).toBe('')
    expect(levelsWords([5])).toBe('Level 5')
    expect(levelsWords([3, 1, 2])).toBe('Levels 1–3')
    expect(levelsWords([1, 3])).toBe('Levels 1, 3')
    expect(competencyChip({ code: '', label: 'Basket', levels: [2], levelLabel: null })).toBe('Basket · Level 2')
    expect(competencyInFull({ code: 'C7', label: 'ANC', levels: [1, 3], levelLabel: null })).toBe('C7 ANC, Levels 1, 3')
  })

  it("opens a course review on its course's page, and a file review on the files page", () => {
    start([entry(), entry({ id: 'r2', source: 'upload', courseId: null })])
    c.open(c.reviews()[0]!)
    expect(router.navigate).toHaveBeenLastCalledWith(['/author/ai-review/courses', 'do_1'], { queryParams: { review: 'r1' } })
    c.open(c.reviews()[1]!)
    expect(router.navigate).toHaveBeenLastCalledWith(['/author/ai-review/new'], { queryParams: { review: 'r2' } })
    ;(el().querySelector('button.air-past-row') as HTMLButtonElement).click()
    expect(router.navigate).toHaveBeenLastCalledWith(['/author/ai-review/courses', 'do_1'], { queryParams: { review: 'r1' } })
  })

  it('shows the count, New review at the top, and each course as the course list does', () => {
    start([
      entry({ thumbnail: 'https://bucket/c.png' }),
      entry({ id: 'r2', source: 'upload', courseId: null, name: 'BP drafts', thumbnail: null }),
    ])
    expect(el().querySelector('.air-past-count')!.textContent!.trim()).toBe('2')
    expect(c.newReviewLink).toBe('/author/ai-review/new')
    expect(el().querySelector('a.air-past-new')).not.toBeNull()
    const [course, files] = Array.from(el().querySelectorAll('button.air-past-row'))
    expect(course!.querySelector('img')!.getAttribute('src')).toBe('https://bucket/c.png')
    expect(course!.querySelector('.air-past-meta')!.textContent!.replace(/\s+/g, ' ')).toContain('Course·3 resources')
    expect(course!.textContent).toContain('By Asha')
    // A review of files has no picture: a grey tile of the same shape, so titles line up.
    expect(files!.querySelector('img')).toBeNull()
    expect(files!.querySelector('.air-past-thumb--files')!.getAttribute('aria-hidden')).toBe('true')
    expect(course!.querySelector('.air-past-thumb:not(.air-past-thumb--files) img')).not.toBeNull()
  })

  it('shows the icon instead of a course picture that will not load', () => {
    start([entry({ thumbnail: 'https://bucket/missing.png' })])
    c.thumbFailed('r1')
    fixture.detectChanges()
    expect(el().querySelector('button.air-past-row img')).toBeNull()
  })

  it('marks a review still running', () => {
    start([entry({ status: 'running', summary: null })])
    expect(el().querySelector('.air-past-live')).not.toBeNull()
  })

  it('goes back to My Workspace', () => {
    start([])
    c.back()
    // With the Drafts status, so the list loads (without it, it showed a count and no courses).
    expect(router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'draft' } })
  })

  it('says how to start one when there are none', () => {
    start([])
    expect(el().textContent).toContain('No AI reviews yet')
    expect(el().textContent).toContain('choose AI Review')
  })

  it('says so when the list cannot be read, and tries again', () => {
    start(new HttpErrorResponse({ status: 500 }))
    expect(c.error()).toBeTruthy()
    expect(el().querySelector('[role="alert"]')).not.toBeNull()
    api.pastReviews.mockReturnValue(of([entry()]))
    ;(el().querySelector('[role="alert"] button') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(c.error()).toBe('')
    expect(c.reviews()).toHaveLength(1)
  })
})
