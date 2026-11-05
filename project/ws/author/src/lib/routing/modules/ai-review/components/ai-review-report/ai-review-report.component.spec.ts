import { CommonModule } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { of, throwError } from 'rxjs'
import { AiReviewService } from '../../services/ai-review.service'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { IAiReview, IAiReviewItem, IAiReviewScore } from '../../models/ai-review.model'
import { AirEvidenceComponent } from '../air-evidence/air-evidence.component'
import { AirIconComponent } from '../air-icon/air-icon.component'
import { AiReviewReportComponent, locateText, notMet, toReportRow } from './ai-review-report.component'

const score = (): IAiReviewScore => ({
  areas: [
    {
      area: 'Content Quality',
      items: [
        { id: 'C1', text: 'Accurate content', verdict: 'yes', note: '' },
        {
          id: 'C2',
          text: 'Cuff placement shown correctly',
          verdict: 'no',
          note: 'Cuff over clothing',
          fix: 'Place the cuff on bare skin',
          borderline: true,
        },
      ],
      yes: 1,
      applicable: 2,
      scorePct: 50,
    },
    {
      area: 'Technical Design',
      items: [{ id: 'T1', text: 'Captions', verdict: 'na', note: '' }],
      yes: 0,
      applicable: 0,
      scorePct: null,
    },
  ],
  yes: 1,
  applicable: 2,
  naCount: 1,
  total: 3,
  scorePct: 50,
  band: 'red',
  bandMessage: 'Needs significant revision',
  failedIds: ['C2'],
})

/** Reads the review again for fresh file links. */
const reviewApi = { get: jest.fn() }

const item = (over: Partial<IAiReviewItem> = {}): IAiReviewItem => ({
  contentId: 'do_v',
  name: 'BP video',
  kind: 'video',
  status: 'done',
  stage: null,
  skipReason: null,
  error: null,
  result: {
    contentId: 'do_v',
    name: 'BP video',
    kind: 'video',
    durationSec: 36,
    transcriptChars: 400,
    transcriptEngine: 'scribe',
    watched: null,
    addie: { model: 'g', score: score(), summary: 'Clear but the cuff is misplaced.', costUsd: 0.05 },
    domain: {
      model: 'c',
      style: 'plain',
      score: { ...score(), yes: 3, applicable: 6 },
      coverage: [
        { component: 'Proteinuria check', status: 'missing', evidence: '' },
        { component: 'BP measurement', status: 'covered', evidence: 'Shown at 0:10' },
      ],
      levelFit: { verdict: 'below', bestFitLevel: 1, rationale: 'Basic only' },
      summary: 'Misses danger signs.',
      costUsd: 0.06,
    },
    costUsd: 0.11,
    cached: true,
  },
  ...over,
})

const review = (over: Partial<IAiReview> = {}): IAiReview =>
  ({
    id: 'r1',
    courseId: 'do_1',
    courseName: 'Eclampsia care',
    status: 'partial',
    requestedBy: { id: 'u1', name: 'Asha' },
    options: {
      competency: { competencyId: 'C1', label: 'Eclampsia', level: 2, levelLabel: 'Level 2', levelDescription: '', cadre: 'ANM' },
    },
    progress: { done: 2, total: 2 },
    queuePosition: 0,
    latestLog: '',
    log: [],
    items: [
      item(),
      item({ contentId: 'do_x', name: 'Broken video', status: 'failed', error: 'Download timed out', result: null }),
      item({ contentId: 'do_s', name: 'Skipped', status: 'skipped', result: null }),
    ],
    result: {
      reviewed: 1,
      failed: 1,
      skipped: [{ contentId: 'do_s', name: 'Notes', reason: 'PDFs come next' }],
      addie: { scorePct: 50, band: 'red', bandMessage: 'Needs significant revision', yes: 1, applicable: 2 },
      domain: { yes: 3, applicable: 6, scorePct: 50 },
      coverage: [{ component: 'Proteinuria check', status: 'missing', coveredBy: [] }],
      commonGaps: [{ id: 'C2', text: 'Cuff placement shown correctly', count: 1 }],
      costUsd: 0.11,
    },
    error: null,
    costUsd: 0.11,
    estimateUsd: 0.12,
    createdAt: '2026-10-31T10:00:00Z',
    finishedAt: '2026-10-31T10:04:00Z',
    ...over,
  }) as IAiReview

describe('AiReviewReportComponent', () => {
  describe('helpers', () => {
    it('lists the indicators not met, in order', () => {
      expect(notMet(score()).map(i => i.id)).toEqual(['C2'])
    })

    it('splits a pass error from a report', () => {
      const base = item()
      const row = toReportRow({ ...base, result: { ...base.result!, addie: { error: 'Gemini timed out' }, domain: null } })
      expect(row.addie).toBeNull()
      expect(row.addieError).toBe('Gemini timed out')
      expect(row.domain).toBeNull()
      expect(row.domainError).toBe('')

      const ok = toReportRow(item())
      expect(ok.addie?.score.scorePct).toBe(50)
      expect(ok.domain?.coverage.length).toBe(2)
    })

    it('reads a time or page from free text', () => {
      expect(locateText('Shown at 0:10')).toEqual({ at: '0:10', atSec: 10 })
      expect(locateText('Covered on page 2')).toEqual({ at: 'page 2', page: 2 })
      expect(locateText('BP 160/110 threshold')).toEqual({})
    })

    it('handles an item with no result', () => {
      const row = toReportRow(item({ result: null }))
      expect(row.addie).toBeNull()
      expect(row.domain).toBeNull()
    })
  })

  describe('rendered', () => {
    let fixture: ComponentFixture<AiReviewReportComponent>
    let el: HTMLElement

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [CommonModule],
        declarations: [AiReviewReportComponent, AirEvidenceComponent, AirIconComponent],
        providers: [{ provide: AiReviewService, useValue: reviewApi }],
        schemas: [NO_ERRORS_SCHEMA],
      })
      fixture = TestBed.createComponent(AiReviewReportComponent)
      fixture.componentRef.setInput('review', review())
      fixture.detectChanges()
      el = fixture.nativeElement
    })

    it('puts the course summary first', () => {
      const text = el.textContent || ''
      expect(text).toContain('Course summary')
      expect(text).toContain('Needs significant revision')
      expect(text).toContain('Eclampsia · Level 2')
      expect(text.indexOf('Course summary')).toBeLessThan(text.indexOf('BP video'))
    })

    it('tallies coverage of the level', () => {
      expect(fixture.componentInstance.coverageCounts()).toEqual({ covered: 0, partial: 0, missing: 1 })
      fixture.componentRef.setInput('review', review({ result: { ...review().result!, coverage: [] } }))
      expect(fixture.componentInstance.coverageCounts()).toBeNull()
    })

    it('shows coverage, recurring gaps and what was not reviewed', () => {
      const text = el.textContent || ''
      expect(text).toContain('Proteinuria check')
      expect(text).toContain('Cuff placement shown correctly')
      expect(text).toContain('PDFs come next')
    })

    it('shows each resource with its fixes, and a failed resource with its error', () => {
      const text = el.textContent || ''
      expect(text).toContain('Fix: Place the cuff on bare skin')
      expect(text).toContain('Borderline')
      expect(text).toContain('Pitched below the level')
      expect(text).toContain('Download timed out')
      expect(text).toContain('Reused')
      expect(text).not.toContain('Skipped')
    })

    it('labels each resource with its kind and format', () => {
      expect(el.textContent).toContain('Video')
      expect(fixture.componentInstance.kindOf({ kind: null, mimeType: 'application/pdf' })).toBe('pdf')
    })

    it("lists a quiz's questions that need attention, or says they all check out", () => {
      const quiz = item({
        contentId: 'do_q',
        name: 'Practice quiz',
        kind: 'quiz',
        mimeType: 'application/json',
        result: {
          ...item().result!,
          kind: 'quiz',
          questions: [
            { n: 1, question: 'Severe range?', verdict: 'ok', issues: [] },
            { n: 3, question: 'When to refer?', verdict: 'issue', issues: ['Two options are correct'], fix: 'Change option C' },
          ],
        },
      })
      fixture.componentRef.setInput('review', review({ items: [quiz] }))
      fixture.detectChanges()
      const text = el.textContent || ''
      expect(text).toContain('1 / 2')
      expect(text).toContain('Q3')
      expect(text).toContain('Two options are correct')
      expect(text).toContain('Fix: Change option C')
      expect(text).not.toContain('Severe range?')
      expect(fixture.componentInstance.questionIssues(quiz).map(q => q.n)).toEqual([3])

      const clean = {
        ...quiz,
        result: { ...quiz.result!, questions: [{ n: 1, question: 'Severe range?', verdict: 'ok' as const, issues: [] }] },
      }
      fixture.componentRef.setInput('review', review({ items: [clean] }))
      fixture.detectChanges()
      expect(el.textContent).toContain('Every question checks out')
    })

    it('shows what an HTML package holds, and warns when it does not report progress', () => {
      const pkg = (reportsProgress: boolean, savesState: boolean) =>
        item({
          kind: 'html',
          mimeType: 'application/vnd.ekstep.html-archive',
          result: {
            ...item().result!,
            kind: 'html',
            durationSec: 190,
            htmlPackage: {
              files: 12,
              pages: 6,
              videos: [
                { path: 'a.mp4', durationSec: 120 },
                { path: 'b.mp4', durationSec: 70 },
              ],
              images: 9,
              stills: 24,
              questions: 8,
              reportsProgress,
              savesState,
            },
          },
        })
      fixture.componentRef.setInput('review', review({ items: [pkg(false, true)] }))
      fixture.detectChanges()
      const row = el.querySelector('.air-package')!
      expect(row.textContent!.replace(/\s+/g, ' ')).toContain('6 pages · 2 videos (3 min 10 s) · 9 images · 8 questions')
      expect(row.querySelector('.air-package-flag--warn')!.textContent).toContain('Does not report progress, so completion is not recorded')
      expect(row.textContent).toContain('Saves where the learner left off')

      fixture.componentRef.setInput('review', review({ items: [pkg(true, false)] }))
      fixture.detectChanges()
      const ok = el.querySelector('.air-package')!
      expect(ok.querySelector('.air-package-flag--ok')!.textContent).toContain('Reports learner progress')
      expect(ok.textContent).toContain('Learners start from the beginning each time')
    })

    it('opens an issue in place, at its moment', () => {
      const issue = Array.from(el.querySelectorAll('button.air-indicator--open')).find(b =>
        /Cuff placement/.test(b.textContent || ''),
      ) as HTMLButtonElement
      issue.click()
      fixture.detectChanges()
      const dialog = el.querySelector('dialog')!
      expect(dialog.hasAttribute('open')).toBe(true)
      expect(dialog.textContent).toContain('Cuff placement shown correctly')
      expect(dialog.textContent).toContain('Place the cuff on bare skin')
    })

    it('gets a fresh link for a file whose link expired, and keeps it for later issues', () => {
      const fresh = 'https://bucket.s3.amazonaws.com/v.mp4?X-Amz-Signature=new'
      reviewApi.get.mockReturnValue(of(review({ items: [item({ artifactUrl: fresh })] })))
      fixture.componentRef.setInput(
        'review',
        review({ items: [item({ artifactUrl: 'https://bucket.s3.amazonaws.com/v.mp4?X-Amz-Signature=old' })] }),
      )
      fixture.detectChanges()
      const issue = Array.from(el.querySelectorAll('button.air-indicator--open')).find(b =>
        /Cuff placement/.test(b.textContent || ''),
      ) as HTMLButtonElement
      issue.click()
      fixture.detectChanges()
      el.querySelector('video')!.dispatchEvent(new Event('error'))
      fixture.detectChanges()
      const button = Array.from(el.querySelectorAll('dialog button')).find(b =>
        /Get a fresh link/.test(b.textContent || ''),
      ) as HTMLButtonElement
      button.click()
      fixture.detectChanges()
      expect(reviewApi.get).toHaveBeenCalledWith('r1')
      expect(el.querySelector('video')!.getAttribute('src')).toContain('X-Amz-Signature=new')
      // The next issue opened uses the fresh link too.
      fixture.componentInstance.openCoverage(item(), { component: 'Proteinuria', status: 'missing', evidence: 'at 0:05' })
      fixture.detectChanges()
      expect(el.querySelector('video')!.getAttribute('src')).toContain('X-Amz-Signature=new')
    })

    it('says so when a fresh link cannot be fetched', () => {
      reviewApi.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })))
      fixture.componentRef.setInput(
        'review',
        review({ items: [item({ artifactUrl: 'https://bucket.s3.amazonaws.com/v.mp4?X-Amz-Signature=old' })] }),
      )
      fixture.detectChanges()
      const issue = Array.from(el.querySelectorAll('button.air-indicator--open')).find(b =>
        /Cuff placement/.test(b.textContent || ''),
      ) as HTMLButtonElement
      issue.click()
      fixture.detectChanges()
      el.querySelector('video')!.dispatchEvent(new Event('error'))
      fixture.detectChanges()
      ;(
        Array.from(el.querySelectorAll('dialog button')).find(b => /Get a fresh link/.test(b.textContent || '')) as HTMLButtonElement
      ).click()
      fixture.detectChanges()
      expect(el.querySelector('dialog')!.textContent).toMatch(/Could not reach the AI review service|connection/)
    })

    it('opens a coverage line and a question too', () => {
      ;(el.querySelector('button.air-cov-row') as HTMLButtonElement).click()
      fixture.detectChanges()
      expect(el.querySelector('dialog')!.textContent).toContain('Domain review · coverage of the level')
    })

    it('expands every indicator on request', () => {
      expect(el.textContent).not.toContain('Captions')
      const toggle = Array.from(el.querySelectorAll('button')).find(b => /Show all/.test(b.textContent || ''))!
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
      toggle.click()
      fixture.detectChanges()
      expect(el.textContent).toContain('Captions')
      expect(el.textContent).toContain('N/A')

      fixture.componentInstance.toggle('do_v')
      fixture.detectChanges()
      expect(el.textContent).not.toContain('Captions')
    })
  })

  it('labels verdicts, coverage and level fit', () => {
    TestBed.configureTestingModule({ providers: [{ provide: AiReviewService, useValue: reviewApi }] })
    const c = TestBed.runInInjectionContext(() => new AiReviewReportComponent())
    expect(c.verdictLabel('yes')).toBe('Met')
    expect(c.verdictLabel('no')).toBe('Not met')
    expect(c.verdictLabel('na')).toBe('N/A')
    expect(c.coverageIcon('covered')).toBe('checkCircle')
    expect(c.coverageIcon('partial')).toBe('partial')
    expect(c.coverageIcon('missing')).toBe('cancelCircle')
    expect(c.levelFitLabel('above')).toBe('Pitched above the level')
    expect(c.levelFitLabel('odd')).toBe('odd')
  })
})
