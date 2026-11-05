import { NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { analyseHtmlPackage, IHtmlPackageReport } from './html-package-check'
import { HtmlPackageCheckDialogComponent } from './html-package-check-dialog.component'

describe('HtmlPackageCheckDialogComponent', () => {
  let close: jest.Mock

  function create(report: IHtmlPackageReport) {
    close = jest.fn()
    TestBed.configureTestingModule({
      declarations: [HtmlPackageCheckDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { report, fileName: 'lesson.zip' } },
        { provide: MatDialogRef, useValue: { close } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(HtmlPackageCheckDialogComponent)
    fixture.detectChanges()
    return fixture
  }

  afterEach(() => TestBed.resetTestingModule())

  it('stops the upload when something must be fixed, offering only another file', () => {
    const fixture = create(analyseHtmlPackage(['index.html', 'movie.swf'], { 'index.html': '' }))
    const el: HTMLElement = fixture.nativeElement
    expect(el.querySelector('.pkg-title')!.textContent).toContain('1 problem stops this upload')
    expect(el.querySelector('.pkg-item.is-block')!.textContent).toContain('It uses Flash')
    expect(el.textContent).not.toContain('Upload anyway')

    fixture.componentInstance.upload()
    expect(close).not.toHaveBeenCalled()
    fixture.componentInstance.chooseAnother()
    expect(close).toHaveBeenCalledWith(false)
  })

  it('lets the author upload anyway when there are only things to check, showing the fix and files', () => {
    const fixture = create(analyseHtmlPackage(['index.html'], { 'index.html': '<img src="pics/a.png">' }))
    const el: HTMLElement = fixture.nativeElement
    expect(el.querySelector('.pkg-title')!.textContent).toContain('things to check before uploading')
    const warnings = Array.from(el.querySelectorAll('.pkg-item.is-warn')).map(li => li.textContent)
    expect(warnings.some(t => t!.includes('Does not report learner progress') && t!.includes('How to fix'))).toBe(true)
    expect(el.querySelector('.pkg-files')!.textContent).toContain('index.html → pics/a.png')

    const upload = Array.from(el.querySelectorAll('button')).find(b => b.textContent!.includes('Upload anyway'))!
    upload.click()
    expect(close).toHaveBeenCalledWith(true)
  })

  it('keeps what passed folded away until asked', () => {
    const fixture = create(analyseHtmlPackage(['index.html'], { 'index.html': '' }))
    const el: HTMLElement = fixture.nativeElement
    expect(el.querySelector('.pkg-item.is-pass')).toBeNull()
    ;(el.querySelector('.pkg-passed-toggle') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(el.querySelector('.pkg-item.is-pass')!.textContent).toContain('index.html is at the top of the zip')
  })
})
