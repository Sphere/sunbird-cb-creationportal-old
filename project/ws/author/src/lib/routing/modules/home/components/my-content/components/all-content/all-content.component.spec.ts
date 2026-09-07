import { of, throwError } from 'rxjs'

import { AllContentComponent } from './all-content.component'

// AllContentComponent has a large template and 10 injected collaborators plus
// field initializers that read the route snapshot / value service. Per the
// project house rule we instantiate it directly with jest.fn()-based mocks and
// exercise its deterministic methods, avoiding brittle full TestBed rendering.
describe('AllContentComponent', () => {
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
    const component = new AllContentComponent(
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
    expect(component.tableData.sortColumn).toBe('name')
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
    expect(component.departmentData).toBeDefined()
    expect((component.leftmenues as any).widgetData.name).toBe('Dept')
  })

  describe('ngOnInit', () => {
    it('sets pagination and subscribes to query params', () => {
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

    it('defaults status to published when no query param', () => {
      const { component } = build({
        activatedRoute: {
          snapshot: { data: { courseTaken: { data: {} }, departmentData: null } },
          queryParams: of({}),
        },
      })
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.ngOnInit()
      expect(component.status).toBe('published')
    })
  })

  describe('fetchStatus', () => {
    it('maps statuses to backend arrays', () => {
      const { component } = build()
      component.status = 'draft'
      expect(component.fetchStatus()).toEqual(['Draft'])
      component.status = 'inreview'
      expect(component.fetchStatus()).toEqual(['InReview', 'QualityReview'])
      component.status = 'published'
      expect(component.fetchStatus()).toEqual(['Live'])
      component.status = 'publish'
      expect(component.fetchStatus()).toEqual(['Reviewed'])
      component.status = 'unpublished'
      expect(component.fetchStatus()).toEqual(['Unpublished'])
      component.status = 'xyz'
      expect(component.fetchStatus()).toEqual(['Draft'])
    })
  })

  describe('setAction', () => {
    it('sets author or expiry action', () => {
      const { component } = build()
      component.status = 'draft'
      component.setAction()
      expect(component.currentAction).toBe('author')
      component.status = 'expiry'
      component.setAction()
      expect(component.currentAction).toBe('expiry')
    })
  })

  describe('actionClick', () => {
    it('routes edit/delete events through action()', () => {
      const { component } = build()
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => undefined)
      component.actionClick({ action: 'edit', data: { identifier: 'x' } })
      expect(actionSpy).toHaveBeenCalledWith({ type: 'edit', data: { identifier: 'x' } })
    })

    it('ignores unknown actions and null events', () => {
      const { component } = build()
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => undefined)
      component.actionClick({ action: 'other', data: {} })
      component.actionClick(null)
      expect(actionSpy).not.toHaveBeenCalled()
    })
  })

  describe('fetchContent', () => {
    it('populates cardContent and totalContent on success (legacy fetch path)', () => {
      const { component, mocks } = build()
      component.newDesign = false
      mocks.myContSvc.fetchContent.mockReturnValue(of({ result: { content: [{ identifier: 'c1' }], count: 3 } }))
      component.status = 'published'
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchContent).toHaveBeenCalled()
      expect(component.fetchError).toBe(false)
      expect(component.cardContent).toEqual([{ identifier: 'c1' }])
      expect(component.count.published).toBe(3)
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
      expect(component.getTableData).toEqual([{ identifier: 'a' }])
    })

    it('returns empty array when no content', () => {
      const { component } = build()
      component.cardContent = [] as any
      expect(component.getTableData).toEqual([])
    })
  })

  describe('search', () => {
    it('reads trimmed query and refetches', () => {
      const { component } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.searchInputElem = { nativeElement: { value: '  q  ' } } as any
      component.search()
      expect(component.queryFilter).toBe('q')
      expect(fetchSpy).toHaveBeenCalledWith(false, false)
    })
  })

  describe('content service actions', () => {
    it('deleteContent removes the item on success', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'del' } as any, { identifier: 'keep' } as any]
      component.deleteContent({ identifier: 'del', contentType: 'Course' } as any)
      expect(mocks.myContSvc.deleteContent).toHaveBeenCalledWith('del', false)
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
      component.filterMenuItems = [{ content: [{ checked: true }] }]
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
    it('picks the delete message and delegates on confirm', () => {
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
    it('submits moveToInReview with operation -1', () => {
      const { component, mocks } = build()
      const form: any = { controls: { comments: { value: 'c' } } }
      component.cardContent = [{ identifier: 'x' } as any]
      component.finalCall(form, { type: 'moveToInReview', data: { identifier: 'x', status: 'InReview' } })
      expect(mocks.myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'c', operation: -1 }, 'x', 'InReview')
    })
  })

  describe('action', () => {
    it('navigates to editor on publish', () => {
      const { component, mocks } = build()
      component.action({ type: 'publish', data: { identifier: 'p1' } as any })
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/p1')
    })

    it('removes card on remove', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'p1' } as any, { identifier: 'p2' } as any]
      component.action({ type: 'remove', data: { identifier: 'p1' } as any })
      expect(component.cardContent).toEqual([{ identifier: 'p2' }])
    })

    it('creates on create', () => {
      const { component } = build()
      const create = jest.spyOn(component, 'createContent').mockImplementation(() => undefined)
      component.action({ type: 'create', data: { identifier: 'p1' } as any })
      expect(create).toHaveBeenCalled()
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

    it('isAllowed reflects the access service role check', () => {
      const { component, mocks } = build()
      mocks.accessService.hasRole.mockReturnValue(true)
      expect(component.isAllowed).toBe(true)
    })

    it('isAllowedTab returns false for empty roles', () => {
      const { component } = build()
      expect(component.isAllowedTab([])).toBe(false)
    })

    it('isAllowedTab defers to access service for populated roles', () => {
      const { component, mocks } = build()
      mocks.accessService.hasRole.mockReturnValue(true)
      expect(component.isAllowedTab(['admin'])).toBe(true)
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
