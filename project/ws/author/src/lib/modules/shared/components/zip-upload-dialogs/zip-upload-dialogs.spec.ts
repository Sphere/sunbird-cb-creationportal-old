import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ZipGuidelinesComponent } from './zip-guidelines.component'
import { ZipEntryFileComponent } from './zip-entry-file.component'
import { ZipInvalidNamesComponent } from './zip-invalid-names.component'
import { IZipUploadConditions } from './zip-upload-conditions.model'

/**
 * These three dialog bodies were duplicated between the module creation and
 * file upload screens. The behaviour that differed between those copies is now
 * carried by inputs, so the tests below pin both variants.
 */
const conditions = (over: Partial<IZipUploadConditions> = {}): IZipUploadConditions => ({
  fileName: false,
  eval: false,
  externalReference: false,
  iframe: false,
  isSubmitPressed: false,
  preview: false,
  url: '',
  ...over,
})

const allTicked = (): IZipUploadConditions =>
  conditions({ fileName: true, eval: true, externalReference: true, iframe: true, preview: true })

describe('ZipGuidelinesComponent', () => {
  let component: ZipGuidelinesComponent

  beforeEach(() => {
    component = new ZipGuidelinesComponent()
    component.condition = conditions()
  })

  it('does not consider a partly ticked checklist accepted', () => {
    component.condition = conditions({ fileName: true, eval: true })
    expect(component.allAccepted).toBe(false)
  })

  it('considers every box ticked accepted', () => {
    component.condition = allTicked()
    expect(component.allAccepted).toBe(true)
  })

  it('tolerates a missing condition object rather than throwing', () => {
    component.condition = undefined as any
    expect(component.allAccepted).toBe(false)
  })

  it('marks the form submitted but stays open while boxes are unticked', () => {
    const accepted = jest.fn()
    component.accepted.subscribe(accepted)
    component.agree()
    // This is the file-upload behaviour: pressing the button reveals the
    // per-item "Accept the declaration" errors instead of closing.
    expect(component.condition.isSubmitPressed).toBe(true)
    expect(accepted).not.toHaveBeenCalled()
  })

  it('emits acceptance once every box is ticked', () => {
    const accepted = jest.fn()
    component.condition = allTicked()
    component.accepted.subscribe(accepted)
    component.agree()
    expect(component.condition.isSubmitPressed).toBe(true)
    expect(accepted).toHaveBeenCalledTimes(1)
  })

  it('leaves the button enabled unless the host asks for gating', () => {
    expect(component.disableUntilAccepted).toBe(false)
  })
})

describe('ZipEntryFileComponent', () => {
  let component: ZipEntryFileComponent

  beforeEach(() => {
    component = new ZipEntryFileComponent()
    component.condition = conditions()
  })

  it('starts with an empty file list', () => {
    expect(component.fileList).toEqual([])
  })

  it('reports the chosen entry point to the host', () => {
    const selected = jest.fn()
    component.entryPointSelected.subscribe(selected)
    component.entryPointSelected.emit('story_content/index.html')
    expect(selected).toHaveBeenCalledWith('story_content/index.html')
  })
})

describe('ZipInvalidNamesComponent', () => {
  let component: ZipInvalidNamesComponent

  beforeEach(() => {
    component = new ZipInvalidNamesComponent()
  })

  it('starts with an empty name list', () => {
    expect(component.names).toEqual([])
  })

  it('tells the host the warning was acknowledged', () => {
    const acknowledged = jest.fn()
    component.acknowledged.subscribe(acknowledged)
    component.acknowledged.emit()
    expect(acknowledged).toHaveBeenCalledTimes(1)
  })
})

/**
 * The three dialogs share one header / scrolling body / footer shell. The body
 * is the only scroll container: when the dialog surface scrolled instead, the
 * title scrolled out of view and a long list overflowed its wrapper and painted
 * over the action button.
 */
describe('zip dialog layout', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ZipGuidelinesComponent, ZipEntryFileComponent, ZipInvalidNamesComponent],
      // No FormsModule: these assert the dialog's DOM shape, and without it the
      // ngModel bindings on the Material controls fall to NO_ERRORS_SCHEMA
      // instead of demanding a value accessor the stubs cannot supply.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()
  })

  const shellOf = (fixture: ComponentFixture<unknown>) => {
    fixture.detectChanges()
    const el: HTMLElement = fixture.nativeElement
    return {
      header: el.querySelector('.zip-dialog-header'),
      body: el.querySelector('.zip-dialog-body'),
      footer: el.querySelector('.zip-dialog-footer'),
    }
  }

  it('gives the guidelines dialog a header, a body and a footer', () => {
    const fixture = TestBed.createComponent(ZipGuidelinesComponent)
    fixture.componentInstance.condition = conditions()
    const { header, body, footer } = shellOf(fixture)
    expect(header).toBeTruthy()
    expect(body).toBeTruthy()
    expect(footer).toBeTruthy()
    // The close button belongs to the header, which stays put while the body
    // scrolls -- it used to sit in the flow underneath the title.
    expect(header!.querySelector('.zip-dialog-close')).toBeTruthy()
    expect(header!.querySelector('h3')).toBeTruthy()
    expect(body!.querySelector('.zip-dialog-close')).toBeNull()
  })

  it('renders one row per entry file inside the scrolling body', () => {
    const fixture = TestBed.createComponent(ZipEntryFileComponent)
    fixture.componentInstance.condition = conditions()
    fixture.componentInstance.fileList = ['story_content/index.html', 'mobile/a.png', 'mobile/b.png']
    const { body, footer } = shellOf(fixture)
    expect(body!.querySelectorAll('mat-radio-button').length).toBe(3)
    // The Done button must be a sibling of the list, not inside it, or a long
    // list scrolls over the top of it.
    expect(footer!.querySelector('button')).toBeTruthy()
    expect(body!.querySelector('.zip-dialog-footer')).toBeNull()
  })

  it('keeps the errorFiles id on the invalid-names body', () => {
    const fixture = TestBed.createComponent(ZipInvalidNamesComponent)
    fixture.componentInstance.names = ['bad name.png', 'another bad.png']
    const { body } = shellOf(fixture)
    // Load-bearing: both hosts look this element up by id and rewrite its
    // children to highlight the offending characters.
    expect(body!.id).toBe('errorFiles')
    expect(body!.querySelectorAll('div').length).toBe(2)
  })
})
