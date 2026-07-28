import { FormBuilder } from '@angular/forms'
import { of, Subject } from 'rxjs'
import { ContentStripV2Component } from './content-strip-v2.component'

describe('ContentStripV2Component', () => {
  let component: ContentStripV2Component
  let interestSvc: any
  let dialog: any
  let afterClosed: Subject<any>

  const strip = (over: any = {}) => ({
    key: 'k1',
    title: 'Strip one',
    preWidgets: [],
    postWidgets: [],
    filters: [],
    request: { ids: [], search: undefined, searchV6: undefined, api: undefined },
    ...over,
  })

  const build = (content: any = { strips: [strip()] }) => {
    const c = new ContentStripV2Component(interestSvc, new FormBuilder(), dialog)
    c.content = content
    c.identifier = 'do_1'
    return c
  }

  beforeEach(() => {
    afterClosed = new Subject<any>()
    interestSvc = { fetchAutocompleteInterestsV2: jest.fn().mockReturnValue(of([])) }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('builds the strip form and loads the first strip', () => {
      component.ngOnInit()
      expect(component.form.controls.title.value).toBe('Strip one')
      expect(component.currentStrip).toBe(component.content.strips[0])
      expect(component.index).toBe(0)
    })

    it('seeds a first strip when the widget has none', () => {
      const c = build({ strips: [] })
      c.ngOnInit()
      expect(c.content.strips.length).toBe(1)
      expect(c.form.controls.key.value).toBeTruthy()
    })

    it('seeds a first strip when strips is absent entirely', () => {
      const c = build({} as any)
      c.ngOnInit()
      expect(c.content.strips.length).toBe(1)
    })

    it('mirrors the selected ids back into the picker', () => {
      component.ngOnInit()
      component.getPath('request', 'ids').setValue(['do_5'])
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_5'])
    })

    it('emits the widget and its validity when the form settles', () => {
      jest.useFakeTimers()
      const emitted: any[] = []
      component.ngOnInit()
      component.data.subscribe(v => emitted.push(v))
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(emitted.length).toBe(1)
      expect(emitted[0].isValid).toBe(true)
      expect(component.content.strips[0].title).toBe('New title')
      jest.useRealTimers()
    })

    it('records the search type on the strip for a knowledge board', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      component.requestType = 'KB'
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(component.content.strips[0].searchV6Type).toBe('KB')
      jest.useRealTimers()
    })

    it('clears the search type for a non-search strip', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      component.requestType = 'ids'
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(component.content.strips[0].searchV6Type).toBeNull()
      jest.useRealTimers()
    })
  })

  describe('initializeForm request-type detection', () => {
    beforeEach(() => component.ngOnInit())

    it('preselects the configured content ids', () => {
      component.initializeForm(strip({ request: { ids: ['do_2', 'do_3'] } }) as any)
      expect(component.requestType).toBe('ids')
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_2', 'do_3'])
    })

    it('reads the knowledge-board search settings', () => {
      component.initializeForm(
        strip({
          request: {
            searchV6: {
              locale: ['en'],
              sort: [{ lastUpdatedOn: 'desc' }],
              filters: [{ andFilters: [{ keywords: ['angular'], collectionsId: ['do_9'] }] }],
            },
          },
        }) as any,
      )
      expect(component.requestType).toBe('KB')
      expect(component.language).toEqual(['en'])
      expect(component.keywords).toEqual(['angular'])
      expect(component.filterBy).toBe('lastUpdatedOn')
      expect(component.collectionId).toEqual(['do_9'])
    })

    it('reads the collections search settings', () => {
      component.initializeForm(strip({ searchV6Type: 'Collections', request: { searchV6: { filters: [{ andFilters: [{}] }] } } }) as any)
      expect(component.requestType).toBe('Collections')
    })

    it('falls back to safe defaults for a malformed search body', () => {
      component.initializeForm(strip({ request: { searchV6: {} } }) as any)
      expect(component.keywords).toEqual([])
      expect(component.filterBy).toBe('viewCount')
      expect(component.collectionId).toEqual([])
    })

    it('detects a plain search strip', () => {
      component.initializeForm(strip({ request: { search: {} } }) as any)
      expect(component.requestType).toBe('search')
    })

    it('detects an api-backed strip', () => {
      component.initializeForm(strip({ request: { api: '/apis/x' } }) as any)
      expect(component.requestType).toBe('api')
    })

    it('falls back to ids for an empty request object', () => {
      component.initializeForm(strip({ request: {} }) as any)
      expect(component.requestType).toBe('ids')
    })

    it('generates a key for a strip that has none', () => {
      component.initializeForm(strip({ key: '' }) as any)
      expect(component.form.controls.key.value).toBeTruthy()
    })

    it('adopts the configured card subtype', () => {
      component.initializeForm(strip({ stripConfig: { cardSubType: 'minimal' } }) as any)
      expect(component.cardSubtype).toBe('minimal')
      expect(component.getPath('stripConfig', 'postCardForSearch').value).toBe('true')
    })

    it('falls back to the standard card subtype', () => {
      component.initializeForm(strip({ stripConfig: {} }) as any)
      expect(component.cardSubtype).toBe('standard')
    })

    it('remembers the request type so a cancelled change can revert', () => {
      component.initializeForm(strip({ request: { api: '/x' } }) as any)
      expect(component.backUpRequestType).toBe('api')
    })
  })

  describe('strip navigation', () => {
    beforeEach(() => component.ngOnInit())

    it('onIndexChange loads the strip at the index', () => {
      component.content.strips.push(strip({ key: 'k2', title: 'Strip two' }) as any)
      component.onIndexChange(1)
      expect(component.index).toBe(1)
      expect(component.form.controls.title.value).toBe('Strip two')
    })

    it('addfront prepends a strip and selects it', () => {
      component.addfront()
      expect(component.content.strips.length).toBe(2)
      expect(component.index).toBe(0)
      expect(component.form.controls.title.value).toBe('')
    })

    it('addEnd appends a strip and selects it', () => {
      component.addEnd()
      expect(component.content.strips.length).toBe(2)
      expect(component.index).toBe(1)
    })

    it('addEnd can append without moving the selection', () => {
      component.addEnd(false)
      expect(component.content.strips.length).toBe(2)
      expect(component.index).toBe(0)
    })

    it('addStrip returns a blank strip shell', () => {
      expect(component.addStrip()).toEqual({
        key: '',
        title: '',
        preWidgets: [],
        postWidgets: [],
        filters: [],
        request: {
          search: undefined,
          searchV6: undefined,
          searchRegionRecommendation: undefined,
          ids: [],
          api: undefined,
        },
      })
    })

    it('removeStrip seeds a fresh strip when the last one goes', () => {
      component.removeStrip()
      expect(component.content.strips.length).toBe(1)
      expect(component.index).toBe(0)
    })

    it('removeStrip steps back when the last strip in the list goes', () => {
      component.addEnd()
      component.removeStrip()
      expect(component.content.strips.length).toBe(1)
      expect(component.index).toBe(0)
    })

    it('removeStrip keeps the index when an earlier strip goes', () => {
      component.addEnd()
      component.onIndexChange(0)
      component.removeStrip()
      expect(component.content.strips.length).toBe(1)
      expect(component.index).toBe(0)
    })
  })

  describe('pre and post widgets', () => {
    beforeEach(() => component.ngOnInit())

    it('addPrePostWidgets returns a blank html widget', () => {
      const widget = component.addPrePostWidgets()
      expect(widget.widgetType).toBe('element')
      expect(widget.widgetSubType).toBe('elementHtml')
      expect(widget.widgetData.html).toBe('')
    })

    it('addPrePostWidgetEnd appends a pre widget', () => {
      component.addPrePostWidgetEnd('pre')
      expect(component.currentStrip.preWidgets!.length).toBe(1)
      expect(component.currPreWidget).toBe(0)
    })

    it('addPrePostWidgetEnd seeds the list when there is none', () => {
      component.currentStrip.preWidgets = undefined as any
      component.addPrePostWidgetEnd('pre')
      expect(component.currentStrip.preWidgets!.length).toBe(1)
    })

    it('addPrePostWidgetEnd appends a post widget and moves the cursor', () => {
      component.addPrePostWidgetEnd('post')
      component.addPrePostWidgetEnd('post')
      expect(component.currentStrip.postWidgets!.length).toBe(2)
      expect(component.currPostWidget).toBe(1)
    })

    it('addPrePostWidgetEnd seeds the post list when there is none', () => {
      component.currentStrip.postWidgets = undefined as any
      component.addPrePostWidgetEnd('post')
      expect(component.currentStrip.postWidgets!.length).toBe(1)
    })

    it('addPrePostWidgetFront prepends a pre widget', () => {
      component.addPrePostWidgetEnd('pre')
      component.addPrePostWidgetFront('pre')
      expect(component.currentStrip.preWidgets!.length).toBe(2)
      expect(component.currPreWidget).toBe(0)
    })

    it('addPrePostWidgetFront seeds the pre list when there is none', () => {
      component.currentStrip.preWidgets = undefined as any
      component.addPrePostWidgetFront('pre')
      expect(component.currentStrip.preWidgets!.length).toBe(1)
    })

    it('addPrePostWidgetFront prepends a post widget', () => {
      component.addPrePostWidgetEnd('post')
      component.addPrePostWidgetFront('post')
      expect(component.currentStrip.postWidgets!.length).toBe(2)
      expect(component.currPostWidget).toBe(0)
    })

    it('addPrePostWidgetFront seeds the post list when there is none', () => {
      component.currentStrip.postWidgets = undefined as any
      component.addPrePostWidgetFront('post')
      expect(component.currentStrip.postWidgets!.length).toBe(1)
    })

    it('updatePrePost writes the widget data', () => {
      component.addPrePostWidgetEnd('pre')
      const data: any = { html: '<p/>' }
      component.updatePrePost(data, 'pre', 0)
      expect((component.currentStrip.preWidgets as any)[0].widgetData).toBe(data)
    })

    it('updatePrePost removes a widget and steps the cursor back', () => {
      component.addPrePostWidgetEnd('pre')
      component.addPrePostWidgetEnd('pre')
      component.currPreWidget = 1
      component.updatePrePost({} as any, 'pre', 1, true)
      expect(component.currentStrip.preWidgets!.length).toBe(1)
      expect(component.currPreWidget).toBe(0)
    })

    it('updatePrePost keeps the cursor at zero when the first widget goes', () => {
      component.addPrePostWidgetEnd('post')
      component.currPostWidget = 0
      component.updatePrePost({} as any, 'post', 0, true)
      expect(component.currentStrip.postWidgets!.length).toBe(0)
      expect(component.currPostWidget).toBe(0)
    })

    it('addSticky pins the current pre widget', () => {
      component.addPrePostWidgetEnd('pre')
      component.addSticky()
      expect((component.currentStrip.preWidgets as any)[0].widgetHostClass).toContain('sticky-m')
    })

    it('addSticky unpins an already pinned widget', () => {
      component.addPrePostWidgetEnd('pre')
      component.addSticky()
      component.addSticky()
      expect((component.currentStrip.preWidgets as any)[0].widgetHostClass).not.toContain('sticky-m')
    })

    it('addSticky does nothing without pre widgets', () => {
      component.currentStrip.preWidgets = undefined as any
      expect(() => component.addSticky()).not.toThrow()
    })
  })

  describe('keywords and card subtype', () => {
    beforeEach(() => component.ngOnInit())

    it('optionSelected adds a keyword and refreshes the search body', () => {
      component.optionSelected('angular')
      expect(component.keywords).toEqual(['angular'])
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].keywords).toEqual(['angular'])
    })

    it('optionSelected ignores a duplicate keyword', () => {
      component.keywords = ['angular']
      component.optionSelected('angular')
      expect(component.keywords).toEqual(['angular'])
    })

    it('removeKeyword drops the keyword', () => {
      component.keywords = ['angular', 'rxjs']
      component.removeKeyword('angular')
      expect(component.keywords).toEqual(['rxjs'])
    })

    it('addKeyword clears the chip input', () => {
      const input = { value: 'angular' } as HTMLInputElement
      component.addKeyword({ input } as any)
      expect(input.value).toBe('')
    })

    it('addKeyword tolerates a missing input', () => {
      expect(() => component.addKeyword({ input: null } as any)).not.toThrow()
    })

    it('onCardChange writes the chosen card subtype', () => {
      component.cardSubtype = 'minimal'
      component.onCardChange()
      expect(component.getPath('stripConfig', 'cardSubType').value).toBe('minimal')
    })
  })

  describe('content selection', () => {
    beforeEach(() => component.ngOnInit())

    it('getPath walks nested control keys', () => {
      expect(component.getPath('request', 'ids')).toBe(component.form.get('request')!.get('ids'))
    })

    it('update writes a value onto the named request control', () => {
      component.update('api', '/apis/x')
      expect(component.getPath('request', 'api').value).toBe('/apis/x')
    })

    it('onIdChange replaces the selected ids', () => {
      component.onIdChange(['do_2'])
      expect(component.getPath('request', 'ids').value).toEqual(['do_2'])
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_2'])
    })

    it('onIdChange tolerates a null selection', () => {
      component.onIdChange(null as any)
      expect((component.pickerContentData.preselected as Set<string>).size).toBe(0)
    })

    it('onContentSelectionChanged adds a checked content', () => {
      component.getPath('request', 'ids').setValue([])
      component.onContentSelectionChanged({ content: { identifier: 'do_5' }, checked: true } as any)
      expect(component.getPath('request', 'ids').value).toEqual(['do_5'])
      expect((component.pickerContentData.preselected as Set<string>).has('do_5')).toBe(true)
    })

    it('onContentSelectionChanged removes an unchecked content', () => {
      component.getPath('request', 'ids').setValue(['do_5'])
      ;(component.pickerContentData.preselected as Set<string>).add('do_5')
      component.onContentSelectionChanged({ content: { identifier: 'do_5' }, checked: false } as any)
      expect(component.getPath('request', 'ids').value).toEqual([])
    })
  })

  describe('onSelectionChange', () => {
    beforeEach(() => component.ngOnInit())

    it('only clears the picker when no confirmation is needed', () => {
      component.onSelectionChange()
      expect(dialog.open).not.toHaveBeenCalled()
      expect((component.pickerContentData.preselected as Set<string>).size).toBe(0)
    })

    it('clears every request when the type change is confirmed', () => {
      component.keywords = ['angular']
      component.collectionId = ['do_9']
      component.language = ['en']
      component.requestType = 'api'
      component.onSelectionChange(true)
      afterClosed.next(true)
      expect(component.keywords).toEqual([])
      expect(component.collectionId).toEqual([])
      expect(component.language).toEqual([])
      expect(component.filterBy).toBe('viewCount')
      expect(component.getPath('request', 'ids').value).toBeNull()
      expect(component.getPath('stripConfig', 'cardSubType').value).toBe('standard')
      expect(component.backUpRequestType).toBe('api')
    })

    it('reverts the request type when the change is dismissed', () => {
      component.backUpRequestType = 'ids'
      component.requestType = 'api'
      component.onSelectionChange(true)
      afterClosed.next(false)
      expect(component.requestType).toBe('ids')
    })

    // Confirming the change clears the search body first, so the follow-up read of
    // its sort always falls into the catch and resets the filter to the default.
    it('resets the sort when a search strip change is confirmed', () => {
      component.requestType = 'KB'
      component.filterBy = 'lastUpdatedOn'
      component.onSelectionChange(true)
      afterClosed.next(true)
      expect(component.filterBy).toBe('viewCount')
      expect(component.getPath('request', 'searchV6').value).toBeNull()
    })

    it('restores the ids preselection when an ids change is confirmed', () => {
      component.requestType = 'ids'
      component.onSelectionChange(true)
      afterClosed.next(true)
      expect((component.pickerContentData.preselected as Set<string>).size).toBe(0)
    })
  })

  describe('onSearchV6Change', () => {
    beforeEach(() => component.ngOnInit())

    it('writes the locale and sort onto the search body', () => {
      component.language = ['en', 'hi']
      component.filterBy = 'lastUpdatedOn'
      component.onSearchV6Change()
      const body = component.getPath('request', 'searchV6').value
      expect(body.locale).toEqual(['en', 'hi'])
      expect(body.sort).toEqual([{ lastUpdatedOn: 'desc' }])
    })

    it('scopes the search to a checked collection', () => {
      component.onSearchV6Change({ content: { identifier: 'do_9' }, checked: true } as any)
      expect(component.collectionId).toEqual(['do_9'])
    })

    it('clears the collection scope when unchecked', () => {
      component.collectionId = ['do_9']
      component.onSearchV6Change({ content: { identifier: 'do_9' }, checked: false } as any)
      expect(component.collectionId).toEqual([])
    })

    it('accepts the collection list from the authoring chips', () => {
      component.onSearchV6Change({ content: { identifier: 'do_9' }, checked: true } as any, ['do_7'], true)
      expect(component.collectionId).toEqual(['do_9'])
    })

    it('carries the keywords onto the search body', () => {
      component.keywords = ['angular']
      component.onSearchV6Change()
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].keywords).toEqual(['angular'])
    })

    it('keeps the first collection already stored on the search body', () => {
      component.getPath('request', 'searchV6').setValue({
        filters: [{ andFilters: [{ collectionsId: ['do_1', 'do_2'] }] }],
      })
      component.collectionId = []
      component.onSearchV6Change()
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].collectionsId).toEqual(['do_1'])
    })
  })
})
