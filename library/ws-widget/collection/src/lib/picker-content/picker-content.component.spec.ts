import { of, throwError } from 'rxjs'
import { PickerContentComponent } from './picker-content.component'

describe('PickerContentComponent', () => {
  let component: PickerContentComponent
  let snackBar: any
  let configSvc: any
  let pickerContentSvc: any
  let searchServSvc: any

  const result = (identifier: string, name = identifier) => ({
    identifier,
    name,
    contentType: 'Resource',
  })

  const searchResponse = (over: any = {}) => ({
    totalHits: 2,
    result: [result('do_1', 'First'), result('do_2', 'Second')],
    filters: [
      {
        type: 'contentType',
        content: [{ type: 'Resource' }, { type: 'Channel' }],
      },
      { type: 'locale', content: [] },
    ],
    ...over,
  })

  const build = (widgetData: any = {}) => {
    const c = new PickerContentComponent(snackBar, configSvc, pickerContentSvc, searchServSvc)
    c.widgetData = { availableFilters: ['contentType'], ...widgetData }
    return c
  }

  const flush = async () => {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve()
    }
  }

  /**
   * ngOnInit, let the search-config promises settle, then push a debounced search.
   * The pipeline only emits for a `true` push (a `false` push selects EMPTY as the
   * debounce duration, which never fires), so drive it the way the search box does.
   */
  const init = async (c: PickerContentComponent) => {
    c.ngOnInit()
    await flush()
    c.debounceSubject.next(true)
    jest.advanceTimersByTime(500)
    await flush()
  }

  beforeEach(() => {
    jest.useFakeTimers()
    snackBar = { open: jest.fn() }
    configSvc = {
      activeLocale: { locals: ['hi'] },
      instanceConfig: { logos: { defaultContent: 'default.png' } },
    }
    pickerContentSvc = {
      getSearchConfigs: jest.fn().mockResolvedValue({ search: { languageSearch: ['EN', 'HI'] } }),
      removeSubset: jest.fn().mockReturnValue(of({ goal_message: [], suggested_time: 60, resource_list: ['do_1'] })),
    }
    searchServSvc = {
      getApplyPhraseSearch: jest.fn().mockResolvedValue(true),
      getSearchConfig: jest.fn().mockResolvedValue({ search: { tabs: [{ isStandAlone: true }] } }),
      searchV6Wrapper: jest.fn().mockReturnValue(of(searchResponse())),
    }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created from the active locale and instance config', () => {
    expect(component).toBeTruthy()
    expect(component.language).toBe('hi')
    expect(component.defaultThumbnail).toBe('default.png')
    expect(component.selectionType).toBe('checkbox')
    expect(component.searchFetchStatus).toBe('none')
  })

  it('falls back to English without an active locale', () => {
    configSvc.activeLocale = null

    expect(build().language).toBe('en')
  })

  it('leaves the thumbnail unset without an instance config', () => {
    configSvc.instanceConfig = null

    expect(build().defaultThumbnail).toBe('')
  })

  describe('ngOnInit', () => {
    it('loads the searchable languages', async () => {
      await init(component)

      expect(component.availableLanguages).toEqual(['en', 'hi'])
    })

    it('carries over the preselected content', async () => {
      const c = build({ preselected: new Set(['do_1']) })

      await init(c)

      expect(Array.from(c.preSelected)).toEqual(['do_1'])
    })

    it('starts with nothing preselected when the widget names none', async () => {
      await init(component)

      expect(component.preSelected.size).toBe(0)
    })

    it('runs the initial search and records the results', async () => {
      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(
        expect.objectContaining({ query: '*', locale: ['hi'], isStandAlone: true }),
      )
      expect(component.searchFetchStatus).toBe('done')
      expect(component.searchResults.map(r => r.identifier)).toEqual(['do_1', 'do_2'])
    })

    it('keeps only the filters the widget asked for, and only allowed content types', async () => {
      await init(component)

      expect(component.displayFilters!.map(f => f.type)).toEqual(['contentType'])
      expect(component.displayFilters![0].content.map((c: any) => c.type)).toEqual(['Resource'])
    })

    it('defaults the filter list to content type', async () => {
      const c = build({})

      await init(c)

      expect(c.displayFilters!.map(f => f.type)).toEqual(['contentType'])
    })

    it('records the result names into the chip hash', async () => {
      const chipNamesHash: any = {}
      const c = build({ chipNamesHash })

      await init(c)

      expect(chipNamesHash).toEqual({ do_1: 'First', do_2: 'Second' })
    })

    it('quotes a multi-word query when phrase search is on', async () => {
      component.query = 'angular basics'

      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ query: '"angular basics"' }))
    })

    it('retries unquoted when a phrase search finds nothing', async () => {
      searchServSvc.searchV6Wrapper
        .mockReturnValueOnce(of(searchResponse({ totalHits: 0, result: [] })))
        .mockReturnValue(of(searchResponse()))
      component.query = 'angular basics'

      await init(component)
      // The retry re-subscribes, so the replayed push needs a second debounce window.
      jest.advanceTimersByTime(500)
      await flush()

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledTimes(2)
      expect(searchServSvc.searchV6Wrapper).toHaveBeenLastCalledWith(expect.objectContaining({ query: 'angular basics' }))
    })

    it('leaves a single-word query unquoted', async () => {
      component.query = 'angular'

      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ query: 'angular' }))
    })

    it('does not quote when phrase search is off', async () => {
      searchServSvc.getApplyPhraseSearch.mockResolvedValue(false)
      component.query = 'angular basics'

      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ query: 'angular basics' }))
    })

    it('applies the custom filters when the host supplies them', async () => {
      component.customSearchFilters = { contentType: ['Course'] }

      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ filters: { contentType: ['Course'] } }))
    })

    it('treats an unspecified standalone config as standalone', async () => {
      searchServSvc.getSearchConfig.mockResolvedValue({ search: { tabs: [{}] } })

      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ isStandAlone: true }))
    })

    it('omits the standalone flag when the config turns it off', async () => {
      searchServSvc.getSearchConfig.mockResolvedValue({
        search: { tabs: [{ isStandAlone: false }] },
      })

      await init(component)

      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ isStandAlone: undefined }))
    })

    it('flags a failed search', async () => {
      searchServSvc.searchV6Wrapper.mockReturnValue(throwError(() => new Error('boom')))

      await init(component)

      expect(component.searchFetchStatus).toBe('error')
    })
  })

  describe('ngOnChanges', () => {
    it('adopts the preselected content as the current selection', () => {
      const c = build({ preselected: new Set(['do_1', 'do_2']) })

      c.ngOnChanges()

      expect(Array.from(c.selectedContentIds)).toEqual(['do_1', 'do_2'])
    })

    it('leaves the selection alone when nothing is preselected', () => {
      component.ngOnChanges()

      expect(component.selectedContentIds.size).toBe(0)
    })
  })

  describe('setCurrentLanguage', () => {
    it('re-runs the search in the chosen language', async () => {
      await init(component)
      searchServSvc.searchV6Wrapper.mockClear()

      component.setCurrentLanguage('ta')
      await flush()
      jest.advanceTimersByTime(500)
      await flush()

      expect(component.language).toBe('ta')
      expect(searchServSvc.searchV6Wrapper).toHaveBeenCalledWith(expect.objectContaining({ locale: ['ta'] }))
    })
  })

  describe('selectedContentChanged', () => {
    beforeEach(async () => {
      await init(component)
    })

    it('adds a ticked item and reports it with its metadata', () => {
      const spy = jest.fn()
      component.change.subscribe(spy)

      component.selectedContentChanged('do_1', true)

      expect(Array.from(component.selectedContentIds)).toEqual(['do_1'])
      expect(spy).toHaveBeenCalledWith({ checked: true, content: component.searchResults[0] })
    })

    it('reports a bare identifier for content outside the results', () => {
      const spy = jest.fn()
      component.change.subscribe(spy)

      component.selectedContentChanged('do_other', true)

      expect(spy).toHaveBeenCalledWith({ checked: true, content: { identifier: 'do_other' } })
    })

    it('replaces the selection in radio mode', () => {
      component.selectionType = 'radio'
      component.selectedContentChanged('do_1', true)

      component.selectedContentChanged('do_2', true)

      expect(Array.from(component.selectedContentIds)).toEqual(['do_2'])
    })

    it('removes an unticked item', () => {
      component.selectedContentChanged('do_1', true)

      component.selectedContentChanged('do_1', false)

      expect(component.selectedContentIds.size).toBe(0)
    })

    it('prunes the selection through the subset service', () => {
      component.removeSubset = true

      component.selectedContentChanged('do_1', true)

      expect(pickerContentSvc.removeSubset).toHaveBeenCalledWith(['do_1'])
      expect(Array.from(component.selectedContentIds)).toEqual(['do_1'])
    })

    it('reports the suggested duration returned by the subset service', () => {
      component.removeSubset = true
      const spy = jest.fn()
      component.suggestedDurationChange.subscribe(spy)

      component.selectedContentChanged('do_1', true)

      expect(spy).toHaveBeenCalledWith(60)
    })

    it('undoes a selection the subset service rejects', () => {
      pickerContentSvc.removeSubset.mockReturnValue(of({ goal_message: ['Already covered'], suggested_time: 0, resource_list: [] }))
      component.removeSubset = true
      const spy = jest.fn()
      component.change.subscribe(spy)

      component.selectedContentChanged('do_1', true)

      expect(snackBar.open).toHaveBeenCalledWith('Already covered', 'X')
      expect(spy).toHaveBeenCalledWith({ checked: false, content: component.searchResults[0] })
      expect(component.selectedContentIds.size).toBe(0)
    })

    it('does not consult the subset service when the feature is off', () => {
      component.selectedContentChanged('do_1', true)

      expect(pickerContentSvc.removeSubset).not.toHaveBeenCalled()
    })
  })

  describe('filterChanged', () => {
    it('adds a ticked content type', async () => {
      await init(component)
      component.selectedContentTypes = ['Resource'] as any

      component.filterChanged('Course' as any, true)

      expect(component.selectedContentTypes).toEqual(['Resource', 'Course'])
    })

    it('removes an unticked content type', async () => {
      await init(component)
      component.selectedContentTypes = ['Resource', 'Course'] as any

      component.filterChanged('Course' as any, false)

      expect(component.selectedContentTypes).toEqual(['Resource'])
    })
  })

  describe('ngOnDestroy', () => {
    it('stops the search subscription', async () => {
      await init(component)

      component.ngOnDestroy()
      searchServSvc.searchV6Wrapper.mockClear()
      component.debounceSubject.next(true)
      jest.advanceTimersByTime(500)
      await flush()

      expect(searchServSvc.searchV6Wrapper).not.toHaveBeenCalled()
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
