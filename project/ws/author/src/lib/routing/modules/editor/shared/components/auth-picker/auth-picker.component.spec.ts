import { of, throwError } from 'rxjs'
import { AuthPickerComponent } from './auth-picker.component'

describe('AuthPickerComponent', () => {
  let component: AuthPickerComponent
  let configSvc: any
  let apiService: any
  let dialogRef: any
  let accessService: any
  let data: any

  const build = (overrides: { config?: any; data?: any } = {}) => {
    const cfg = overrides.config !== undefined ? overrides.config : configSvc
    const d = overrides.data !== undefined ? overrides.data : data
    return new AuthPickerComponent(cfg, apiService, dialogRef, accessService, d)
  }

  beforeEach(() => {
    configSvc = {
      instanceConfig: { logos: { defaultContent: 'default-thumb.png' } },
      userProfile: { id: 'u1' },
    }
    apiService = {
      post: jest.fn().mockReturnValue(of({ result: [{ identifier: 'do_1' }] })),
    }
    dialogRef = { close: jest.fn() }
    accessService = { rootOrg: 'acme', userId: 'user-1' }
    data = { filter: { contentType: ['Course'] }, selectedIds: ['do_9'] }
    component = build()
  })

  it('should be created and read the default thumbnail from instance config', () => {
    expect(component).toBeTruthy()
    expect(component.defaultThumbnail).toBe('default-thumb.png')
  })

  it('leaves the default thumbnail empty when there is no instance config', () => {
    const c = build({ config: { userProfile: null } })
    expect(c.defaultThumbnail).toBe('')
  })

  describe('ngOnInit', () => {
    it('initializes the search subject and seeds the preselection', () => {
      component.ngOnInit()
      expect(Array.from(component.preSelected)).toEqual(['do_9'])
      expect(component.debounceSubscription).not.toBeNull()
    })

    it('tolerates a missing selectedIds list', () => {
      const c = build({ data: { filter: {}, selectedIds: undefined } })
      c.ngOnInit()
      expect(c.preSelected.size).toBe(0)
    })
  })

  describe('initializeSearchSubject', () => {
    // A `true` push runs the search after a 500ms debounce; a `false` push (the
    // BehaviorSubject seed) resolves to EMPTY and performs no search.
    const runSearch = (c: AuthPickerComponent) => {
      c.initializeSearchSubject()
      c.debounceSubject.next(true)
      jest.advanceTimersByTime(500)
    }

    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('runs a search and stores the results', () => {
      runSearch(component)
      expect(apiService.post).toHaveBeenCalled()
      expect(component.searchFetchStatus).toBe('done')
      expect(component.searchResults).toEqual([{ identifier: 'do_1' }])
    })

    it('does not search on the initial false seed emission', () => {
      component.initializeSearchSubject()
      jest.advanceTimersByTime(500)
      expect(apiService.post).not.toHaveBeenCalled()
    })

    it('builds a "mine" search query with creator and status filters', () => {
      component.showMine = true
      component.query = 'angular'
      runSearch(component)
      const body = apiService.post.mock.calls[0][1]
      const andFilter = body.filters[0].andFilters[0]
      expect(andFilter.creatorContacts).toEqual(['user-1'])
      expect(andFilter.contentType).toEqual(['Course'])
      expect(andFilter.status).toEqual(['Draft', 'InReview', 'QualityReview', 'Reviewed', 'Live'])
      expect(body.uuid).toBe('user-1')
      expect(body.sort).toBeUndefined()
    })

    it('omits the creator filter and keeps default sort when not showing mine', () => {
      component.showMine = false
      component.query = ''
      runSearch(component)
      const body = apiService.post.mock.calls[0][1]
      const andFilter = body.filters[0].andFilters[0]
      expect(andFilter.creatorContacts).toBeUndefined()
      expect(andFilter.status).toBeUndefined()
      expect(body.sort).toEqual([{ lastUpdatedOn: 'desc' }])
    })

    it('keeps an existing status filter instead of overriding it', () => {
      const c = build({ data: { filter: { status: ['Live'] }, selectedIds: [] } })
      c.showMine = true
      runSearch(c)
      const body = apiService.post.mock.calls[0][1]
      expect(body.filters[0].andFilters[0].status).toEqual(['Live'])
    })

    it('flags an error status when the search fails', () => {
      apiService.post.mockReturnValue(throwError(() => new Error('boom')))
      runSearch(component)
      expect(component.searchFetchStatus).toBe('error')
    })

    it('ignores a response without a result payload', () => {
      apiService.post.mockReturnValue(of({}))
      runSearch(component)
      expect(component.searchFetchStatus).toBe('done')
      expect(component.searchResults).toEqual([])
    })
  })

  describe('selectedContentChanged', () => {
    it('adds a checked content to the selection', () => {
      component.selectedContentChanged({ identifier: 'do_2' } as any, true)
      expect(component.selectedContentIds.has('do_2')).toBe(true)
      expect(component.selectedContents).toEqual([{ identifier: 'do_2' }])
    })

    it('removes an unchecked content from the selection', () => {
      component.selectedContentChanged({ identifier: 'do_2' } as any, true)
      component.selectedContentChanged({ identifier: 'do_2' } as any, false)
      expect(component.selectedContentIds.has('do_2')).toBe(false)
      expect(component.selectedContents).toEqual([])
    })
  })

  describe('close', () => {
    it('closes the dialog with the selected identifiers', () => {
      component.selectedContents = [{ identifier: 'do_2' }, { identifier: 'do_3' }] as any
      component.close()
      expect(dialogRef.close).toHaveBeenCalledWith(['do_2', 'do_3'])
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the debounce subscription', () => {
      component.initializeSearchSubject()
      const sub = component.debounceSubscription!
      const spy = jest.spyOn(sub, 'unsubscribe')
      component.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
    })

    it('is safe when there is no subscription', () => {
      component.debounceSubscription = null
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
