import { NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'

import { NoFileComponent } from './no-file.component'

describe('NoFileComponent', () => {
  it('tells the author the file is missing and where to upload it', () => {
    TestBed.configureTestingModule({ declarations: [NoFileComponent], schemas: [NO_ERRORS_SCHEMA] })
    const fixture = TestBed.createComponent(NoFileComponent)
    fixture.detectChanges()
    const el: HTMLElement = fixture.nativeElement
    expect(el.querySelector('[aria-live="polite"]')).toBeTruthy()
    expect(el.textContent).toContain('File not uploaded')
    expect(el.textContent).toContain('Course Builder')
  })
})
