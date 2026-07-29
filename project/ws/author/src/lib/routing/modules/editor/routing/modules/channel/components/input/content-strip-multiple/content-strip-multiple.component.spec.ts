import { FormBuilder, FormGroup, AbstractControl } from '@angular/forms'
import { ContentStripMultipleComponent } from './content-strip-multiple.component'

describe('ContentStripMultipleComponent', () => {
  let component: ContentStripMultipleComponent

  const build = (content: any = {}) => {
    const c = new ContentStripMultipleComponent(new FormBuilder())
    c.content = { title: 'Strip', ...content } as any
    c.identifier = 'do_1'
    return c
  }

  beforeEach(() => {
    component = build()
  })

  it('should be created with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.dataType).toBe('authoring')
    expect(component.isAddingContent).toBe(false)
    expect(component.selectedContentIds.size).toBe(0)
  })

  describe('ngOnInit request-type detection', () => {
    it('seeds the picker filters and preselection defaults', () => {
      component.ngOnInit()
      expect(component.pickerContentData.enablePreselected).toBe(true)
      expect(component.pickerContentData.availableFilters).toContain('contentType')
      expect((component.pickerContentData.preselected as Set<string>).size).toBe(0)
      expect(component.form instanceof FormGroup).toBe(true)
    })

    it('leaves requestType undefined without a request', () => {
      component.ngOnInit()
      expect(component.requestType).toBeUndefined()
    })

    it('preselects the configured content ids', () => {
      const c = build({ request: { ids: ['do_2', 'do_3'] } })
      c.ngOnInit()
      expect(c.requestType).toBe('ids')
      expect(Array.from(c.pickerContentData.preselected as Set<string>)).toEqual(['do_2', 'do_3'])
    })

    it('detects a searchV6 strip', () => {
      const c = build({ request: { searchV6: {} } })
      c.ngOnInit()
      expect(c.requestType).toBe('searchV6')
    })

    it('detects a plain search strip', () => {
      const c = build({ request: { search: {} } })
      c.ngOnInit()
      expect(c.requestType).toBe('search')
    })

    it('detects an api-backed strip', () => {
      const c = build({ request: { api: '/apis/x' } })
      c.ngOnInit()
      expect(c.requestType).toBe('api')
    })

    it('detects a region-recommendation strip', () => {
      const c = build({ request: { searchRegionRecommendation: {} } })
      c.ngOnInit()
      expect(c.requestType).toBe('searchRegionRecommendation')
    })

    it('falls back to ids for an empty request object', () => {
      const c = build({ request: {} })
      c.ngOnInit()
      expect(c.requestType).toBe('ids')
    })

    it('applies the title, cardSubType and stripConfig defaults', () => {
      component.ngOnInit()
      expect(component.form.controls.title.value).toBe('Strip')
      const stripConfig = component.form.controls.stripConfig as FormGroup
      expect(stripConfig.controls.cardSubType.value).toBe('standard')
      expect(stripConfig.controls.postCardForSearch.value).toBe(false)
    })

    it('reads existing stripConfig values', () => {
      const c = build({
        loader: true,
        stripConfig: { cardSubType: 'compact', intranetMode: true, deletedMode: false, postCardForSearch: true },
      })
      c.ngOnInit()
      const stripConfig = c.form.controls.stripConfig as FormGroup
      expect(stripConfig.controls.cardSubType.value).toBe('compact')
      expect(stripConfig.controls.postCardForSearch.value).toBe(true)
      expect(c.form.controls.loader.value).toBe(true)
    })

    it('mirrors the selected ids back into the picker on ids valueChanges', () => {
      component.ngOnInit()
      ;(component.form.controls.request.get('ids') as AbstractControl).setValue(['do_5', 'do_6'])
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_5', 'do_6'])
    })

    it('emits the strip and its validity when the form settles', () => {
      jest.useFakeTimers()
      const emitted: any[] = []
      component.ngOnInit()
      component.data.subscribe(v => emitted.push(v))
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(emitted.length).toBe(1)
      expect(emitted[0].content.title).toBe('New title')
      expect(emitted[0].isValid).toBe(true)
      jest.useRealTimers()
    })
  })

  describe('update', () => {
    beforeEach(() => component.ngOnInit())

    it('writes a value onto the named request control', () => {
      component.update('api', { path: '/apis/x' })
      expect((component.form.controls.request.get('api') as AbstractControl).value).toEqual({ path: '/apis/x' })
    })
  })

  describe('onContentSelectionChanged', () => {
    beforeEach(() => component.ngOnInit())

    it('adds a checked content to the ids and preselection', () => {
      ;(component.form.controls.request as FormGroup).controls.ids.setValue([])
      component.onContentSelectionChanged({ content: { identifier: 'do_5' }, checked: true } as any)
      expect((component.form.controls.request as FormGroup).controls.ids.value).toEqual(['do_5'])
      expect((component.pickerContentData.preselected as Set<string>).has('do_5')).toBe(true)
    })

    it('removes an unchecked content from the ids and preselection', () => {
      ;(component.form.controls.request as FormGroup).controls.ids.setValue(['do_5'])
      ;(component.pickerContentData.preselected as Set<string>).add('do_5')
      component.onContentSelectionChanged({ content: { identifier: 'do_5' }, checked: false } as any)
      expect((component.form.controls.request as FormGroup).controls.ids.value).toEqual([])
      expect((component.pickerContentData.preselected as Set<string>).has('do_5')).toBe(false)
    })

    it('handles a null ids control by starting from an empty list', () => {
      ;(component.form.controls.request as FormGroup).controls.ids.setValue(null)
      component.onContentSelectionChanged({ content: { identifier: 'do_7' }, checked: true } as any)
      expect((component.form.controls.request as FormGroup).controls.ids.value).toEqual(['do_7'])
    })
  })

  describe('getUniqueId', () => {
    it('produces a distinct id each call', () => {
      const first = (component as any).getUniqueId()
      const second = (component as any).getUniqueId()
      expect(first).not.toBe(second)
      expect(typeof first).toBe('string')
    })

    it('is used as the form key when the content has none', () => {
      component.ngOnInit()
      expect(component.form.controls.key.value).toBeTruthy()
    })

    it('keeps an existing content key', () => {
      const c = build({ key: 'existing-key' })
      c.ngOnInit()
      expect(c.form.controls.key.value).toBe('existing-key')
    })
  })
})
