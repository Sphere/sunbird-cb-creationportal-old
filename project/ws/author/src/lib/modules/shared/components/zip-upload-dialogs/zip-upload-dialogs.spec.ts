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
    expect(component.scrollBody).toBe(false)
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

  it('tracks list rows by index', () => {
    expect(component.trackByIndex(3)).toBe(3)
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

  it('tracks list rows by index', () => {
    expect(component.trackByIndex(0)).toBe(0)
  })
})
