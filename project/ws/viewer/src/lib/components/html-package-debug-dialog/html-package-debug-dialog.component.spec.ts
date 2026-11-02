import { NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { HtmlPackageDebugService } from 'project/ws/viewer/src/lib/plugins/html/html-package-debug.service'
import { HtmlPackageDebugDialogComponent } from './html-package-debug-dialog.component'

describe('HtmlPackageDebugDialogComponent', () => {
  let debug: HtmlPackageDebugService
  let dialogRef: { close: jest.Mock }

  function create() {
    debug = new HtmlPackageDebugService()
    dialogRef = { close: jest.fn() }
    TestBed.configureTestingModule({
      declarations: [HtmlPackageDebugDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { contentId: 'do_h', name: 'html 2' } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: HtmlPackageDebugService, useValue: debug },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(HtmlPackageDebugDialogComponent)
    fixture.detectChanges()
    return fixture
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows the empty state before the package reports anything', () => {
    const fixture = create()
    const el: HTMLElement = fixture.nativeElement
    expect(el.textContent).toContain('No events received yet')
    expect(el.textContent).toContain('html 2')
  })

  it('updates live as the package reports events', () => {
    const fixture = create()
    debug.record('do_h', { type: 'PROGRESS', extra: { pct: 35, section: 's1', phase: 'video' } })
    debug.record('do_other', { type: 'PROGRESS', extra: { pct: 90 } })
    fixture.detectChanges()

    const el: HTMLElement = fixture.nativeElement
    expect(fixture.componentInstance.report().progress).toBe(35)
    expect(el.textContent).toContain('35%')
    expect(el.textContent).toContain('section s1 · phase video')
    expect(el.querySelectorAll('.debug-event').length).toBe(1)
  })

  it('clears the log and closes', () => {
    const fixture = create()
    debug.record('do_h', { type: 'VIDEO_START' })
    fixture.componentInstance.clear()
    expect(fixture.componentInstance.report().total).toBe(0)
    fixture.componentInstance.close()
    expect(dialogRef.close).toHaveBeenCalled()
  })

  it('copies the event log to the clipboard', async () => {
    const fixture = create()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    debug.record('do_h', { type: 'PROGRESS', extra: { pct: 10 } })

    fixture.componentInstance.copyLog()
    await Promise.resolve()

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"contentId": "do_h"'))
    expect(fixture.componentInstance.copied()).toBe(true)
  })
})
