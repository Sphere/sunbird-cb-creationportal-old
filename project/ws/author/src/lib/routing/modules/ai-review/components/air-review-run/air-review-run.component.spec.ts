import { HttpErrorResponse } from '@angular/common/http'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { saveAs } from 'file-saver'
import { of, throwError } from 'rxjs'
import { IAiReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { AirReviewRunComponent } from './air-review-run.component'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))
jest.mock('xlsx', () => ({
  utils: { book_new: jest.fn(() => ({ SheetNames: [] })), aoa_to_sheet: jest.fn(rows => ({ rows })), book_append_sheet: jest.fn() },
  write: jest.fn(() => new ArrayBuffer(8)),
}))

const review = (over: Partial<IAiReview> = {}): IAiReview =>
  ({
    id: 'r1',
    courseId: 'do_1',
    courseName: 'Eclampsia care',
    status: 'running',
    requestedBy: { id: 'u1', name: 'Asha' },
    options: {} as IAiReview['options'],
    progress: { done: 1, total: 3 },
    queuePosition: 0,
    latestLog: 'Watching the video…',
    log: [],
    items: [],
    result: null,
    error: null,
    costUsd: 0,
    estimateUsd: 0.12,
    createdAt: '2026-10-31T10:00:00Z',
    finishedAt: null,
    ...over,
  }) as IAiReview

describe('AirReviewRunComponent', () => {
  let fixture: ComponentFixture<AirReviewRunComponent>
  let c: AirReviewRunComponent
  let api: { cancel: jest.Mock }
  const el = () => fixture.nativeElement as HTMLElement

  const show = (r: IAiReview, unit: 'resources' | 'files' = 'resources') => {
    fixture.componentRef.setInput('review', r)
    fixture.componentRef.setInput('unit', unit)
    fixture.detectChanges()
  }

  beforeEach(() => {
    api = { cancel: jest.fn().mockReturnValue(of({ cancelled: true })) }
    TestBed.configureTestingModule({
      declarations: [AirReviewRunComponent],
      providers: [{ provide: AiReviewService, useValue: api }],
      schemas: [NO_ERRORS_SCHEMA],
    })
    fixture = TestBed.createComponent(AirReviewRunComponent)
    c = fixture.componentInstance
    ;(saveAs as unknown as jest.Mock).mockClear()
  })

  describe('while it runs', () => {
    it('shows progress, the latest step, and what is reviewed apart from what is left out', () => {
      show(
        review({
          items: [
            {
              contentId: 'a',
              name: 'BP video',
              kind: 'video',
              status: 'running',
              stage: 'Watching…',
              skipReason: null,
              error: null,
              result: null,
            },
            {
              contentId: 'b',
              name: 'Old notes',
              kind: 'pdf',
              status: 'skipped',
              stage: null,
              skipReason: 'Too long',
              error: null,
              result: null,
            },
          ],
        }),
      )
      expect(c.isRunning()).toBe(true)
      expect(c.progressPct()).toBe(33)
      expect(c.runningItems().map(i => i.contentId)).toEqual(['a'])
      expect(c.skippedItems().map(i => i.contentId)).toEqual(['b'])
      const text = el().textContent || ''
      expect(text).toContain('Reviewing the course')
      expect(text).toContain('Watching the video…')
      expect(text).toContain('1 of 3 resources finished')
      expect(el().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('33')
    })

    it('words a file review as files, for screen readers too', () => {
      show(review({ status: 'partial' as IAiReview['status'] }), 'files')
      expect(c.statusLabel('partial')).toBe('Done — some files could not be reviewed')
      show(review(), 'files')
      expect(c.runningHeading()).toBe('Reviewing your files')
      expect(c.progressText()).toBe('1 of 3 files reviewed · Reviewing')
    })

    it('says how many reviews are ahead in the queue', () => {
      show(review({ status: 'queued', queuePosition: 2 }))
      expect(el().textContent).toContain('2 reviews are ahead of this one')
    })

    it('cancels, then tells the page to read the review again', () => {
      const cancelled = jest.fn()
      c.cancelled.subscribe(cancelled)
      show(review())
      ;(el().querySelector('.air-btn--danger') as HTMLButtonElement).click()
      expect(api.cancel).toHaveBeenCalledWith('r1')
      expect(cancelled).toHaveBeenCalledWith('r1')
      expect(c.cancelling()).toBe(false)
    })

    it('says so when cancelling fails, and does not tell the page it was cancelled', () => {
      const cancelled = jest.fn()
      c.cancelled.subscribe(cancelled)
      api.cancel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })))
      show(review())
      c.cancel()
      fixture.detectChanges()
      expect(c.cancelError()).toBe('Could not cancel the review.')
      expect(el().querySelector('[role="alert"]')?.textContent).toContain('Could not cancel the review.')
      expect(cancelled).not.toHaveBeenCalled()
    })
  })

  describe('once it ends', () => {
    it('heads the report by how the review ended', () => {
      show(review({ status: 'done' }))
      expect(c.isFinished()).toBe(true)
      expect(c.reportHeading()).toBe('Report ready')
      show(review({ status: 'failed', error: 'All files failed.' }))
      expect(c.reportHeading()).toBe('Review failed')
      expect(el().textContent).toContain('All files failed.')
      show(review({ status: 'cancelled' }))
      expect(c.reportHeading()).toBe('Review cancelled')
      expect(el().querySelector('.air-btn--primary')).toBeNull()
    })

    it('opens the report as a print-ready page for Save as PDF', () => {
      jest.useFakeTimers()
      const doc = { open: jest.fn(), write: jest.fn(), close: jest.fn() }
      const fake = { document: doc, focus: jest.fn(), print: jest.fn() }
      const open = jest.spyOn(window, 'open').mockReturnValue(fake as unknown as Window)
      show(review({ status: 'done' }))
      c.downloadPdf()
      expect(open).toHaveBeenCalledWith('', '_blank')
      expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('Eclampsia care'))
      jest.advanceTimersByTime(300)
      expect(fake.print).toHaveBeenCalled()
      expect(c.exportError()).toBe('')
      open.mockRestore()
      jest.useRealTimers()
    })

    it('says so when the browser blocks the report window', () => {
      const open = jest.spyOn(window, 'open').mockReturnValue(null)
      show(review({ status: 'done' }))
      c.downloadPdf()
      expect(c.exportError()).toMatch(/blocked the report window/)
      open.mockRestore()
    })

    it('exports to Excel under the review name, once at a time', async () => {
      show(review({ status: 'done' }))
      const first = c.downloadExcel()
      await c.downloadExcel() // ignored while the first runs
      await first
      expect(saveAs).toHaveBeenCalledTimes(1)
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'AI-review-Eclampsia_care.xlsx')
      expect(c.exporting()).toBeNull()
    })

    it('asks the page for the setup form on Review again', () => {
      const again = jest.fn()
      c.again.subscribe(again)
      show(review({ status: 'done' }))
      ;(el().querySelector('.air-btn--soft') as HTMLButtonElement).click()
      expect(again).toHaveBeenCalled()
    })
  })
})
