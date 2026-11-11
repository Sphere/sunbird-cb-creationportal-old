import { HttpErrorResponse } from '@angular/common/http'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { saveAs } from 'file-saver'
import { of, throwError } from 'rxjs'
import { IAiReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { AIR_VIEWER } from '../../utils/review-run'
import { AirReviewRunComponent } from './air-review-run.component'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))
jest.mock('exceljs', () => ({ Workbook: jest.fn() }))
jest.mock('../../utils/report-excel', () => ({
  ...jest.requireActual('../../utils/report-excel'),
  buildExcelWorkbook: jest.fn(async () => new ArrayBuffer(8)),
}))
jest.mock('../../utils/report-pdf', () => ({ downloadReportPdf: jest.fn(async () => undefined) }))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { downloadReportPdf } = require('../../utils/report-pdf') as { downloadReportPdf: jest.Mock }

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

  describe('real progress', () => {
    const it_ = (contentId: string, status: string, stage: string | null = null) =>
      ({ contentId, name: contentId, kind: 'video', status, stage, skipReason: null, error: null, result: null }) as never

    it('moves with each step, not only when a whole resource ends, and holds under 100 until the review ends', () => {
      show(review({ status: 'running', items: [it_('a', 'running', 'Downloading the video…'), it_('b', 'queued')] } as Partial<IAiReview>))
      // a: download under way = 0.5/3; b: waiting = 0 -> 8%.
      expect(c.progressPct()).toBe(8)
      show(review({ status: 'running', items: [it_('a', 'done'), it_('b', 'running', 'Scoring the checklist…')] } as Partial<IAiReview>))
      // a: 1; b: scoring under way = 2.5/3 -> 92%.
      expect(c.progressPct()).toBe(92)
      show(review({ status: 'running', items: [it_('a', 'done'), it_('b', 'failed')] } as Partial<IAiReview>))
      // Every resource finished, the course part still being put together.
      expect(c.progressPct()).toBe(98)
      show(review({ status: 'done', items: [it_('a', 'done'), it_('b', 'failed')] } as Partial<IAiReview>))
      expect(c.progressPct()).toBe(100)
    })
  })

  describe('who started it', () => {
    it('names you from your profile on your own review when the request carried no name', () => {
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        declarations: [AirReviewRunComponent],
        providers: [
          { provide: AiReviewService, useValue: api },
          { provide: AIR_VIEWER, useValue: () => ({ id: 'u1', name: 'Asha Rao' }) },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      })
      fixture = TestBed.createComponent(AirReviewRunComponent)
      c = fixture.componentInstance
      show(review({ status: 'done', requestedBy: { id: 'u1', name: '' } }))
      expect(c.requester()).toBe('Asha Rao')
      expect(el().textContent).toContain('Started by Asha Rao on')
    })

    it("says 'a user' for someone else's review with no name", () => {
      show(review({ status: 'done', requestedBy: { id: 'u9', name: '' } }))
      expect(c.requester()).toBe('a user')
    })
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
      // Real progress: the one video is watching (step 2 of 3 under way): (1 + 0.5) / 3.
      expect(c.progressPct()).toBe(50)
      expect(c.runningItems().map(i => i.contentId)).toEqual(['a'])
      expect(c.skippedItems().map(i => i.contentId)).toEqual(['b'])
      const text = el().textContent || ''
      expect(text).toContain('Reviewing the course')
      expect(text).toContain('Watching · BP video') // what it is doing now, not the last log line
      expect(text).toContain('1 of 3 resources finished')
      expect(el().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('50')
      // The step under way turns, and the stage line shows it is working.
      expect(el().querySelector('.air-pstep--active .air-pstep-ring')).not.toBeNull()
      expect(el().querySelector('.air-pipeline-stage .air-typing')).not.toBeNull()
      expect(el().querySelector('.air-pipeline-status--running .air-live-dot')).not.toBeNull()
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

    it('says in the report which videos had no sound and were reviewed on what they show', () => {
      const silent = {
        contentId: 'm',
        name: 'Silent demo',
        kind: 'video',
        status: 'done',
        stage: null,
        skipReason: null,
        error: null,
        result: { noSound: true },
      }
      const other = {
        contentId: 'p',
        name: 'Old notes',
        kind: 'pdf',
        status: 'skipped',
        stage: null,
        skipReason: 'Too long',
        error: null,
        result: null,
      }
      show(review({ status: 'done', items: [silent, other] } as Partial<IAiReview>))
      expect(c.silentItems().map(i => i.contentId)).toEqual(['m'])
      const box = el().querySelector('.air-nosound')
      expect(box?.textContent).toContain('1 video has no sound')
      expect(box?.textContent).toMatch(/It was\s+reviewed on what it shows/)
      expect(box?.textContent).toContain('add a')
      expect(box?.textContent).toContain('Silent demo')
      expect(box?.textContent).not.toContain('Old notes')
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

  describe('the percentage beside the bar', () => {
    const at = (done: number) => review({ progress: { done, total: 4 } } as Partial<IAiReview>)
    afterEach(() => {
      delete (window as Partial<Window>).matchMedia
      jest.restoreAllMocks()
    })

    it('counts up to the new value frame by frame instead of jumping', () => {
      ;(window as Partial<Window>).matchMedia = jest.fn().mockReturnValue({ matches: false }) as never
      const frames: FrameRequestCallback[] = []
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => frames.push(cb))
      jest.spyOn(window.performance, 'now').mockReturnValue(0)
      show(at(2))
      expect(c.progressPct()).toBe(50)
      expect(c.shownPct()).toBe(0)
      // Run frames as a browser would, 100 ms apart, until none are left. (Angular's own
      // scheduler also asks for frames, so the queue is not only the count's.)
      const seen: number[] = []
      for (let now = 100; frames.length && now <= 2000; now += 100) {
        frames.shift()!(now)
        seen.push(c.shownPct())
      }
      expect(seen.some(v => v > 0 && v < 50)).toBe(true)
      expect(seen).toEqual([...seen].sort((x, y) => x - y)) // only ever counts up
      expect(c.shownPct()).toBe(50)
    })

    it('goes straight to the value for anyone who asked for less motion', () => {
      ;(window as Partial<Window>).matchMedia = jest.fn().mockReturnValue({ matches: true }) as never
      const raf = jest.spyOn(window, 'requestAnimationFrame')
      show(at(3))
      expect(c.shownPct()).toBe(75)
      expect(raf).not.toHaveBeenCalled()
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
      expect(el().querySelector('.air-actions .air-btn--primary')).toBeNull()
    })

    it('downloads the PDF as a file, once at a time, and says so if it fails', async () => {
      show(review({ status: 'done' }))
      const first = c.downloadPdf()
      expect(c.exporting()).toBe('pdf')
      await c.downloadPdf() // ignored while the first runs
      await first
      expect(downloadReportPdf).toHaveBeenCalledTimes(1)
      expect(c.exporting()).toBeNull()
      downloadReportPdf.mockRejectedValueOnce(new Error('canvas'))
      await c.downloadPdf()
      expect(c.exportError()).toMatch(/Could not create the PDF/)
    })

    it('opens the report as a web page in a new tab, without a print dialog', () => {
      const doc = { open: jest.fn(), write: jest.fn(), close: jest.fn() }
      const fake = { document: doc, focus: jest.fn(), print: jest.fn() }
      const open = jest.spyOn(window, 'open').mockReturnValue(fake as unknown as Window)
      show(review({ status: 'done' }))
      c.openReport()
      expect(open).toHaveBeenCalledWith('', '_blank')
      expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('Eclampsia care'))
      expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('<main class="page">'))
      expect(fake.print).not.toHaveBeenCalled()
      expect(c.exportError()).toBe('')
      open.mockRestore()
    })

    it('says so when the browser blocks the new tab', () => {
      const open = jest.spyOn(window, 'open').mockReturnValue(null)
      show(review({ status: 'done' }))
      c.openReport()
      expect(c.exportError()).toMatch(/blocked the new tab/)
      open.mockRestore()
    })

    it('saves the same web page as an HTML file under the review name', () => {
      show(review({ status: 'done' }))
      c.downloadHtml()
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'AI-review-Eclampsia_care.html')
      expect((jest.mocked(saveAs).mock.calls.at(-1)![0] as Blob).type).toBe('text/html;charset=utf-8')
    })

    it('offers Open report first, then one Download menu, then Review again', () => {
      show(review({ status: 'done' }))
      const labels = [...el().querySelectorAll('.air-actions > button, .air-actions .air-dl-trigger')].map(b =>
        b.textContent!.trim().replace(/\s+/g, ' '),
      )
      expect(labels).toEqual(['Open report', 'Download', 'Review again'])
      expect(el().querySelector('.air-dl-menu')).toBeNull()
      expect(el().querySelector('dialog')).toBeNull()
    })

    describe('the Download menu', () => {
      const trigger = () => el().querySelector('.air-dl-trigger') as HTMLButtonElement
      const items = () => [...el().querySelectorAll<HTMLButtonElement>('.air-dl-item')]
      const key = (target: Element, k: string) => {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
        fixture.detectChanges()
      }

      it('lists HTML, PDF and Excel with what each is for, and says it is open', () => {
        show(review({ status: 'done' }))
        trigger().click()
        fixture.detectChanges()
        expect(trigger().getAttribute('aria-expanded')).toBe('true')
        expect(items().map(b => b.querySelector('.air-dl-name')!.textContent)).toEqual(['HTML', 'PDF', 'Excel'])
        expect(items()[2]!.textContent).toContain('to track fixes')
        expect(el().querySelector('.air-dl-menu')!.getAttribute('role')).toBe('menu')
      })

      it('downloads the chosen format and closes', () => {
        show(review({ status: 'done' }))
        const html = jest.spyOn(c, 'downloadHtml').mockImplementation(() => undefined)
        trigger().click()
        fixture.detectChanges()
        items()[0]!.click()
        fixture.detectChanges()
        expect(html).toHaveBeenCalled()
        expect(c.downloadOpen()).toBe(false)
        expect(el().querySelector('.air-dl-menu')).toBeNull()
      })

      it('works from the keyboard: arrows move, Esc closes back to the button', () => {
        jest.useFakeTimers()
        show(review({ status: 'done' }))
        trigger().focus()
        key(trigger(), 'ArrowDown')
        jest.runOnlyPendingTimers()
        expect(c.downloadOpen()).toBe(true)
        expect(document.activeElement).toBe(items()[0])
        key(items()[0]!, 'ArrowDown')
        expect(document.activeElement).toBe(items()[1])
        key(items()[1]!, 'ArrowUp')
        key(items()[0]!, 'ArrowUp')
        expect(document.activeElement).toBe(items()[2])
        key(items()[2]!, 'Escape')
        expect(c.downloadOpen()).toBe(false)
        expect(document.activeElement).toBe(trigger())
        jest.useRealTimers()
      })

      it('jumps with Home and End, closes on Tab, and ignores other keys while closed', () => {
        jest.useFakeTimers()
        show(review({ status: 'done' }))
        key(trigger(), 'Enter')
        expect(c.downloadOpen()).toBe(false)
        trigger().click()
        fixture.detectChanges()
        jest.runOnlyPendingTimers()
        key(items()[0]!, 'End')
        expect(document.activeElement).toBe(items()[2])
        key(items()[2]!, 'Home')
        expect(document.activeElement).toBe(items()[0])
        key(items()[0]!, 'x')
        expect(c.downloadOpen()).toBe(true)
        key(items()[0]!, 'Tab')
        expect(c.downloadOpen()).toBe(false)
        // Closing what is already closed does nothing.
        c.closeDownloads(true)
        expect(c.downloadOpen()).toBe(false)
        jest.useRealTimers()
      })

      it('starts the PDF or the Excel download it is asked for', () => {
        show(review({ status: 'done' }))
        const pdf = jest.spyOn(c, 'downloadPdf').mockResolvedValue()
        const excel = jest.spyOn(c, 'downloadExcel').mockResolvedValue()
        c.chooseDownload('pdf')
        c.chooseDownload('excel')
        expect(pdf).toHaveBeenCalledTimes(1)
        expect(excel).toHaveBeenCalledTimes(1)
      })

      it('leaves a click outside alone when the menu is closed', () => {
        show(review({ status: 'done' }))
        document.body.click()
        expect(c.downloadOpen()).toBe(false)
      })

      it('closes on a click outside it', () => {
        show(review({ status: 'done' }))
        trigger().click()
        fixture.detectChanges()
        document.body.click()
        fixture.detectChanges()
        expect(c.downloadOpen()).toBe(false)
      })

      it('shows the file being made on the button, and cannot be opened meanwhile', () => {
        show(review({ status: 'done' }))
        c.exporting.set('pdf')
        fixture.detectChanges()
        expect(trigger().textContent).toContain('Preparing PDF…')
        expect(trigger().disabled).toBe(true)
      })
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

    it('says what it is doing now and how long it has run, not the last thing that finished', () => {
      show(
        review({
          createdAt: new Date(Date.now() - 125_000).toISOString(),
          latestLog: '"A": reviewed.',
          log: [{ at: new Date().toISOString(), msg: '"B": Scoring the checklist…' }],
          items: [
            { contentId: 'a', name: 'A', kind: 'video', status: 'done', stage: null, skipReason: null, error: null, result: null },
            {
              contentId: 'b',
              name: 'B',
              kind: 'video',
              status: 'running',
              stage: 'Scoring the checklist…',
              skipReason: null,
              error: null,
              result: null,
            },
          ] as IAiReview['items'],
        }),
      )
      expect(c.nowDoing()).toBe('Scoring the checklist · B')
      expect(c.elapsed()).toMatch(/^2 min 0\d s$/)
      expect(c.activity()[0].msg).toBe('"B": Scoring the checklist…')
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
