import { of, throwError } from 'rxjs'

import { MyContentComponent } from './my-content.component'

// MyContentComponent (home module) has a large template and 10 injected
// collaborators. Per the project house rule we instantiate it directly with
// jest.fn()-based mocks and exercise its deterministic methods, avoiding
// brittle full TestBed rendering under jsdom.
describe('MyContentComponent (home module)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(true)) }
    const mocks: any = {
      myContSvc: {
        getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
        fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
        fetchContent: jest.fn().mockReturnValue(of({ result: { content: [], count: 0 } })),
        deleteContent: jest.fn().mockReturnValue(of({})),
        restoreContent: jest.fn().mockReturnValue(of({})),
        createInAnotherLanguage: jest.fn().mockReturnValue(of('newId')),
        upPublishOrDraft: jest.fn().mockReturnValue(of({})),
        forwardBackward: jest.fn().mockReturnValue(of({})),
      },
      activatedRoute: {
        snapshot: { data: { courseTaken: { data: {} }, departmentData: null } },
        queryParams: of({ status: 'published' }),
      },
      router: { navigate: jest.fn(), navigateByUrl: jest.fn() },
      loadService: { changeLoad: { next: jest.fn() } },
      accessService: {
        userId: 'user-1',
        hasRole: jest.fn().mockReturnValue(false),
        authoringConfig: { newDesign: true },
      },
      snackBar: { openFromComponent: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue(dialogRef) },
      authInitService: { ordinals: { subTitles: [{ name: 'English', value: 'en' }] }, authAdditionalConfig: { menus: {} } },
      valueSvc: { isLtMedium$: of(false) },
      configService: { userRoles: new Set(['content_creator']), userProfile: { userId: 'user-1' } },
      ...overrides,
    }
    const component = new MyContentComponent(
      mocks.myContSvc,
      mocks.activatedRoute,
      mocks.router,
      mocks.loadService,
      mocks.accessService,
      mocks.snackBar,
      mocks.dialog,
      mocks.authInitService,
      mocks.valueSvc,
      mocks.configService,
    )
    component.pagination = { offset: 0, limit: 24 }
    return { component, mocks, dialogRef }
  }

  it('should create and initialize the card table', () => {
    const { component } = build()
    expect(component).toBeTruthy()
    expect(component.userId).toBe('user-1')
    expect(component.tableData.columns.length).toBeGreaterThan(0)
  })

  it('resolves reviewer/publisher role flags from the access service', () => {
    const hasRole = jest.fn((roles: string[]) => roles.includes('content_reviewer'))
    const { component } = build({
      accessService: { userId: 'user-1', hasRole, authoringConfig: { newDesign: true } },
    })
    expect(component.isReviewer).toBe(true)
    expect(component.isPublisher).toBe(false)
  })

  it('applies department menu data when present', () => {
    const { component } = build({
      activatedRoute: {
        snapshot: {
          data: {
            courseTaken: { data: {} },
            departmentData: { data: { logo: 'l.png', deptName: 'Dept' } },
          },
        },
        queryParams: of({ status: 'published' }),
      },
    })
    expect((component.leftmenues as any).widgetData.name).toBe('Dept')
  })

  describe('ngOnInit', () => {
    it('sets pagination and reads status from query params', () => {
      const { component } = build({
        activatedRoute: {
          snapshot: { data: { courseTaken: { data: {} }, departmentData: null } },
          queryParams: of({ status: 'inreview' }),
        },
      })
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.ngOnInit()
      expect(component.pagination).toEqual({ offset: 0, limit: 24 })
      expect(component.status).toBe('inreview')
      expect(fetchSpy).toHaveBeenCalledWith(false)
    })
  })

  describe('fetchStatus', () => {
    it('maps statuses to backend arrays', () => {
      const { component } = build()
      component.status = 'draft'
      expect(component.fetchStatus()).toEqual(['Draft'])
      component.status = 'inreview'
      expect(component.fetchStatus()).toEqual(['Review', 'QualityReview'])
      component.status = 'review'
      expect(component.fetchStatus()).toEqual(['InReview'])
      component.status = 'published'
      expect(component.fetchStatus()).toEqual(['Live'])
      component.status = 'deleted'
      expect(component.fetchStatus()).toEqual(['Deleted'])
      component.status = 'nope'
      expect(component.fetchStatus()).toEqual(['Draft'])
    })
  })

  describe('setAction', () => {
    it('sets author or expiry action', () => {
      const { component } = build()
      component.status = 'published'
      component.setAction()
      expect(component.currentAction).toBe('author')
      component.status = 'expiry'
      component.setAction()
      expect(component.currentAction).toBe('expiry')
    })
  })

  describe('actionClick', () => {
    it('routes delete events through action()', () => {
      const { component } = build()
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => undefined)
      component.actionClick({ action: 'delete', data: { identifier: 'x' } })
      expect(actionSpy).toHaveBeenCalledWith({ type: 'delete', data: { identifier: 'x' } })
    })

    it('ignores null events', () => {
      const { component } = build()
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => undefined)
      component.actionClick(null)
      expect(actionSpy).not.toHaveBeenCalled()
    })
  })

  describe('fetchContent', () => {
    it('populates cardContent and count on success', () => {
      const { component, mocks } = build()
      mocks.myContSvc.fetchFromSearchV6.mockReturnValue(of({ content: [{ identifier: 'c1' }], count: 7 }))
      component.status = 'published'
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchFromSearchV6).toHaveBeenCalled()
      expect(component.fetchError).toBe(false)
      expect(component.count.published).toBe(7)
    })

    it('sets fetchError on failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.fetchFromSearchV6.mockReturnValue(throwError(() => new Error('boom')))
      component.status = 'published'
      component.fetchContent(false)
      expect(component.fetchError).toBe(true)
      expect(component.cardContent).toEqual([])
    })
  })

  describe('getTableData', () => {
    it('returns mapped card content', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'a' } as any]
      expect(component.getTableData()).toEqual([{ identifier: 'a' }])
    })

    it('returns empty array when no content', () => {
      const { component } = build()
      component.cardContent = [] as any
      expect(component.getTableData()).toEqual([])
    })
  })

  describe('search', () => {
    it('reads the trimmed query and refetches', () => {
      const { component } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.searchInputElem = { nativeElement: { value: '  hi  ' } } as any
      component.search()
      expect(component.queryFilter).toBe('hi')
      expect(fetchSpy).toHaveBeenCalledWith(false, false)
    })
  })

  describe('content service actions', () => {
    it('deleteContent removes the item on success', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'del' } as any, { identifier: 'keep' } as any]
      component.deleteContent({ identifier: 'del', contentType: 'Knowledge Board' } as any)
      expect(mocks.myContSvc.deleteContent).toHaveBeenCalledWith('del', true)
      expect(component.cardContent).toEqual([{ identifier: 'keep' }])
    })

    it('deleteContent opens error dialog on 409', () => {
      const { component, mocks } = build()
      mocks.myContSvc.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.deleteContent({ identifier: 'del', contentType: 'Course' } as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('restoreContent removes the item on success', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'r' } as any]
      component.restoreContent({ identifier: 'r' } as any)
      expect(component.cardContent).toEqual([])
    })

    it('createContent navigates to the new editor id', () => {
      const { component, mocks } = build()
      component.createContent({ identifier: 'src', locale: 'hi' } as any)
      expect(mocks.myContSvc.createInAnotherLanguage).toHaveBeenCalledWith('src', 'hi')
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/newId')
    })

    it('unPublishOrDraft removes item on success', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'u' } as any]
      component.unPublishOrDraft({ identifier: 'u', status: 'Live' } as any)
      expect(component.cardContent).toEqual([])
    })
  })

  describe('clearAllFilters', () => {
    it('resets to the default filter and refetches', () => {
      const { component } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.filterMenuItems = [{ values: [{ checked: true }] }]
      component.searchInputElem = { nativeElement: { value: 'x' } } as any
      component.clearAllFilters()
      expect(component.finalFilters).toEqual([{ key: 'contentType', value: ['Collection', 'Course', 'Learning Path'] }])
      expect(component.filters).toEqual([])
      expect(fetchSpy).toHaveBeenCalledWith(false)
    })
  })

  describe('loadMore', () => {
    it('increments offset and fetches more', () => {
      const { component } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.loadMore()
      expect(component.pagination.offset).toBe(1)
      expect(fetchSpy).toHaveBeenCalledWith(true, false)
    })
  })

  describe('confirmAction', () => {
    it('delegates delete to deleteContent on confirm', () => {
      const { component } = build()
      const del = jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)
      component.confirmAction({ type: 'delete', data: { identifier: 'd' } })
      expect(del).toHaveBeenCalled()
    })

    it('falls through to forwardBackward for unknown type', () => {
      const { component } = build()
      const fwd = jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)
      component.confirmAction({ type: 'weird', data: {} })
      expect(fwd).toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    it('submits moveToDraft with operation 0', () => {
      const { component, mocks } = build()
      const form: any = { controls: { comments: { value: 'c' } } }
      component.cardContent = [{ identifier: 'x' } as any]
      component.finalCall(form, { type: 'moveToDraft', data: { identifier: 'x', status: 'Draft' } })
      expect(mocks.myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'c', operation: 0 }, 'x', 'Draft')
    })
  })

  describe('action', () => {
    it('navigates to editor on review', () => {
      const { component, mocks } = build()
      component.action({ type: 'review', data: { identifier: 'r1' } as any })
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/r1')
    })

    it('removes card on remove', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'r1' } as any, { identifier: 'r2' } as any]
      component.action({ type: 'remove', data: { identifier: 'r1' } as any })
      expect(component.cardContent).toEqual([{ identifier: 'r2' }])
    })

    it('routes unpublish through confirmAction', () => {
      const { component } = build()
      const confirm = jest.spyOn(component, 'confirmAction').mockImplementation(() => undefined)
      component.action({ type: 'unpublish', data: { identifier: 'r1' } as any })
      expect(confirm).toHaveBeenCalled()
    })
  })

  describe('misc helpers', () => {
    it('createNewComponent navigates to a new collection editor', () => {
      const { component, mocks } = build()
      component.createNewComponent()
      expect(mocks.router.navigate).toHaveBeenCalledWith(['author', 'editor', 'new', 'collection'])
    })

    it('setCurrentLanguage stores the language', () => {
      const { component } = build()
      component.setCurrentLanguage('hi')
      expect(component.searchLanguage).toBe('hi')
    })
  })

  describe('ngOnDestroy', () => {
    it('tears down subscriptions and clears the loader', () => {
      const { component, mocks } = build()
      const unsubscribe = jest.fn()
      component.routerSubscription = { unsubscribe } as any
      ;(component as any).defaultSideNavBarOpenedSubscription = { unsubscribe: jest.fn() }
      component.ngOnDestroy()
      expect(unsubscribe).toHaveBeenCalled()
      expect(mocks.loadService.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })
})
