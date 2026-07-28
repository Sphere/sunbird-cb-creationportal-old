import { of, throwError } from 'rxjs'

import { MyContentComponent } from './my-content.component'

// MyContentComponent has a very large template and 12 injected collaborators.
// Per the project house rule we instantiate it directly with jest.fn()-based
// mocks and exercise its deterministic public methods / getters, avoiding
// brittle full TestBed rendering under jsdom.
describe('MyContentComponent (my-content module)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(true)) }
    const mocks: any = {
      myContSvc: {
        getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
        fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
        fetchContent: jest.fn().mockReturnValue(of({ result: { content: [], count: 0 } })),
        deleteOrUnpublishContent: jest.fn().mockReturnValue(of({})),
        restoreContent: jest.fn().mockReturnValue(of({})),
        createInAnotherLanguage: jest.fn().mockReturnValue(of('newId')),
        upPublishOrDraft: jest.fn().mockReturnValue(of({})),
        forwardBackward: jest.fn().mockReturnValue(of({})),
      },
      activatedRoute: { queryParams: of({ status: 'draft' }) },
      router: { navigate: jest.fn(), navigateByUrl: jest.fn() },
      loadService: { changeLoad: { next: jest.fn() } },
      accessService: {
        userId: 'user-1',
        hasRole: jest.fn().mockReturnValue(false),
        authoringConfig: {
          newDesign: true,
          allowRedo: true,
          allowRestore: true,
          allowExpiry: true,
          allowReview: true,
          allowPublish: true,
        },
      },
      snackBar: { openFromComponent: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue(dialogRef) },
      authInitService: { ordinals: { subTitles: [{ name: 'English', value: 'en' }] } },
      configService: {
        unMappedUser: { roles: ['content_creator'] },
        userRoles: new Set(['content_creator']),
        userProfile: { userId: 'user-1' },
      },
      editorService: {
        languageList: jest.fn().mockReturnValue(of([{ name: 'English', value: 'en' }])),
        sourceNames: jest.fn().mockReturnValue(of(['SourceA'])),
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
      },
      filterStateService: {
        getFilters: jest.fn().mockReturnValue([]),
        getSourceName: jest.fn().mockReturnValue(''),
        getLanguage: jest.fn().mockReturnValue(''),
        setFilters: jest.fn(),
        setSourceName: jest.fn(),
        setLanguage: jest.fn(),
        clearFilters: jest.fn(),
      },
      cdr: { detectChanges: jest.fn() },
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
      mocks.configService,
      mocks.editorService,
      mocks.filterStateService,
      mocks.cdr,
    )
    component.pagination = { offset: 0, limit: 24 }
    return { component, mocks, dialogRef }
  }

  it('should create and read userId from access service', () => {
    const { component } = build()
    expect(component).toBeTruthy()
    expect(component.userId).toBe('user-1')
  })

  describe('ngOnInit', () => {
    it('restores saved filters/source/language and subscribes to query params', () => {
      const { component, mocks } = build({
        filterStateService: {
          getFilters: jest.fn().mockReturnValue([{ key: 'contentType', value: ['Course'] }]),
          getSourceName: jest.fn().mockReturnValue('SourceA'),
          getLanguage: jest.fn().mockReturnValue('hi'),
        },
      })
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.ngOnInit()
      expect(component.finalFilters).toEqual([{ key: 'contentType', value: ['Course'] }])
      expect(component.selectedSourceName).toBe('SourceA')
      expect(component.searchLanguage).toBe('hi')
      expect(component.fetchContent).toHaveBeenCalled()
      expect(mocks.editorService.languageList).toHaveBeenCalled()
    })

    it('restricts a PUBLIC-only user to a single Draft tab', () => {
      const { component, mocks } = build({
        activatedRoute: { queryParams: of({}) },
        configService: {
          unMappedUser: { roles: ['PUBLIC'] },
          userRoles: new Set(['public']),
          userProfile: { userId: 'user-1' },
        },
      })
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.ngOnInit()
      expect(component.links).toEqual(['Draft'])
      expect(component.status).toBe('draft')
      expect(mocks.router.navigate).toHaveBeenCalled()
    })

    it('remaps a publisher landing on draft to the reviewed tab', () => {
      const { component, mocks } = build({
        activatedRoute: { queryParams: of({ status: 'draft' }) },
        configService: {
          unMappedUser: { roles: ['content_publisher'] },
          userRoles: new Set(['content_publisher']),
          userProfile: { userId: 'user-1' },
        },
      })
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.ngOnInit()
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'reviewed' } })
    })
  })

  describe('canShow', () => {
    it('maps role strings against configured user roles', () => {
      const { component } = build({
        configService: {
          unMappedUser: { roles: ['content_reviewer'] },
          userRoles: new Set(['content_reviewer']),
          userProfile: { userId: 'user-1' },
        },
      })
      expect(component.canShow('review')).toBe(true)
      expect(component.canShow('author')).toBe(true)
      expect(component.canShow('publish')).toBe(false)
      expect(component.canShow('author_create')).toBe(false)
      expect(component.canShow('external_content_reviewer')).toBe(false)
      expect(component.canShow('anything-else')).toBe(false)
    })
  })

  describe('fetchStatus', () => {
    it('maps statuses to backend status arrays', () => {
      const { component } = build()
      component.status = 'draft'
      expect(component.fetchStatus()).toEqual(['Draft'])
      component.status = 'inreview'
      expect(component.fetchStatus()).toEqual(['Review', 'QualityReview'])
      component.status = 'published'
      expect(component.fetchStatus()).toEqual(['Live'])
      component.status = 'unpublished'
      expect(component.fetchStatus()).toEqual(['Unpublished', 'Retired'])
      component.status = 'deleted'
      expect(component.fetchStatus()).toEqual(['Deleted'])
      component.status = 'unknown-status'
      expect(component.fetchStatus()).toEqual(['Draft'])
    })
  })

  describe('setAction', () => {
    it('sets author for standard statuses and expiry for expiry', () => {
      const { component } = build()
      component.status = 'draft'
      component.setAction()
      expect(component.currentAction).toBe('author')
      component.status = 'expiry'
      component.setAction()
      expect(component.currentAction).toBe('expiry')
    })
  })

  describe('navigateContents', () => {
    it('navigates to draft and sets creator flags', () => {
      const { component, mocks } = build()
      component.navigateContents('Draft')
      expect(component.currentStatus).toBe('Draft')
      expect(component.isSelectedColor).toBe(true)
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'draft' } })
    })

    it('navigates AIHub and flags aihub view', () => {
      const { component, mocks } = build()
      component.navigateContents('AIHub')
      expect(component.isAihub).toBe(true)
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'AIHub' } })
    })

    it('navigates published courses', () => {
      const { component, mocks } = build()
      component.navigateContents('Published Courses')
      expect(component.isSelectedPublishCourse).toBe(true)
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'published' } })
    })
  })

  describe('onClickReviewCourse', () => {
    it('sets My Courses / Sent for review flags', () => {
      const { component } = build()
      jest.spyOn(component, 'navigateContents').mockImplementation(() => undefined)
      component.allowAuthorContentCreate = true
      component.onClickReviewCourse('Sent for review')
      expect(component.currentTab).toBe('My Courses')
      expect(component.isSelectedReviewCourse).toBe(true)
      expect(component.navigateContents).toHaveBeenCalledWith('Sent for review')
    })

    it('remaps Draft to Courses to publish for a publisher', () => {
      const { component } = build({
        configService: {
          unMappedUser: { roles: ['content_publisher'] },
          userRoles: new Set(['content_publisher']),
          userProfile: { userId: 'user-1' },
        },
      })
      const navSpy = jest.spyOn(component, 'navigateContents').mockImplementation(() => undefined)
      component.onClickReviewCourse('Draft')
      expect(navSpy).toHaveBeenCalledWith('Courses to publish')
    })
  })

  describe('fetchContent', () => {
    it('populates cardContent on success (newDesign path)', () => {
      const { component, mocks } = build()
      mocks.myContSvc.fetchFromSearchV6.mockReturnValue(of({ content: [{ identifier: 'c1' }], count: 5 }))
      component.status = 'published'
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchFromSearchV6).toHaveBeenCalled()
      expect(component.fetchError).toBe(false)
      expect(component.cdr.detectChanges).toHaveBeenCalled()
    })

    it('filters out prevStatus Review items for draft status', () => {
      const { component, mocks } = build()
      mocks.myContSvc.fetchFromSearchV6.mockReturnValue(
        of({ content: [{ identifier: 'keep', prevStatus: 'Draft' }, { identifier: 'drop', prevStatus: 'Review' }], count: 2 }),
      )
      component.status = 'draft'
      component.fetchContent(false)
      expect(component.cardContent).toEqual([{ identifier: 'keep', prevStatus: 'Draft' }])
    })

    it('sets fetchError on failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.fetchFromSearchV6.mockReturnValue(throwError(() => new Error('boom')))
      component.status = 'published'
      component.fetchContent(false)
      expect(component.fetchError).toBe(true)
      expect(component.cardContent).toEqual([])
      expect(component.showLoadMore).toBe(false)
    })
  })

  describe('search', () => {
    it('reads the trimmed query value and re-fetches', () => {
      const { component } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.searchInputElem = { nativeElement: { value: '  hello  ' } } as any
      component.search()
      expect(component.queryFilter).toBe('hello')
      expect(fetchSpy).toHaveBeenCalledWith(false, false)
    })
  })

  describe('clearAllFilters', () => {
    it('resets filters, clears service state and re-fetches', () => {
      const { component, mocks } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.filterMenuItems = [{ content: [{ checked: true }] }]
      component.searchInputElem = { nativeElement: { value: 'x' } } as any
      component.clearAllFilters()
      expect(component.finalFilters).toEqual([])
      expect(component.queryFilter).toBe('')
      expect(mocks.filterStateService.clearFilters).toHaveBeenCalled()
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

  describe('content service actions', () => {
    it('deleteContent removes the item on success', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'del' } as any, { identifier: 'keep' } as any]
      component.deleteContent({ identifier: 'del' } as any)
      expect(mocks.myContSvc.deleteOrUnpublishContent).toHaveBeenCalledWith('del')
      expect(component.cardContent).toEqual([{ identifier: 'keep' }])
    })

    it('deleteContent opens error parser dialog on 409', () => {
      const { component, mocks } = build()
      mocks.myContSvc.deleteOrUnpublishContent.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.deleteContent({ identifier: 'del' } as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('restoreContent removes item on success', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'r' } as any]
      component.restoreContent({ identifier: 'r' } as any)
      expect(component.cardContent).toEqual([])
    })

    it('createContent navigates to the editor of the new id', () => {
      const { component, mocks } = build()
      component.createContent({ identifier: 'src', locale: 'hi' } as any)
      expect(mocks.myContSvc.createInAnotherLanguage).toHaveBeenCalledWith('src', 'hi')
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/newId')
    })

    it('unPublishOrDraft removes item on success', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'u' } as any]
      component.unPublishOrDraft({ identifier: 'u' } as any)
      expect(component.cardContent).toEqual([])
    })
  })

  describe('confirmAction', () => {
    it('delegates delete to deleteContent when confirmed', () => {
      const { component } = build()
      const delSpy = jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)
      component.confirmAction({ type: 'delete', data: { identifier: 'd' } })
      expect(delSpy).toHaveBeenCalled()
    })

    it('falls through to forwardBackward for unknown type', () => {
      const { component } = build()
      const fwd = jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)
      component.confirmAction({ type: 'somethingElse', data: {} })
      expect(fwd).toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    it('submits moveToDraft with operation 0', () => {
      const { component, mocks } = build()
      const form: any = { controls: { comments: { value: 'note' } } }
      component.cardContent = [{ identifier: 'x' } as any]
      component.finalCall(form, { type: 'moveToDraft', data: { identifier: 'x', status: 'Draft' } })
      expect(mocks.myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'note', operation: 0 }, 'x', 'Draft')
      expect(component.cardContent).toEqual([])
    })
  })

  describe('action', () => {
    it('navigates to editor on edit', () => {
      const { component, mocks } = build()
      component.action({ type: 'edit', data: { identifier: 'e1' } as any })
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/e1')
    })

    it('removes card on remove', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'e1' } as any, { identifier: 'e2' } as any]
      component.action({ type: 'remove', data: { identifier: 'e1' } as any })
      expect(component.cardContent).toEqual([{ identifier: 'e2' }])
    })

    it('routes delete through confirmAction', () => {
      const { component } = build()
      const confirm = jest.spyOn(component, 'confirmAction').mockImplementation(() => undefined)
      component.action({ type: 'delete', data: { identifier: 'e1' } as any })
      expect(confirm).toHaveBeenCalled()
    })
  })

  describe('language & source setters', () => {
    it('setCurrentLanguage persists and refetches', () => {
      const { component, mocks } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.setCurrentLanguage('hi')
      expect(component.searchLanguage).toBe('hi')
      expect(mocks.filterStateService.setLanguage).toHaveBeenCalledWith('hi')
      expect(fetchSpy).toHaveBeenCalledWith(false)
    })

    it('setCurrentSourceName persists and refetches', () => {
      const { component, mocks } = build()
      const fetchSpy = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.setCurrentSourceName('SourceA')
      expect(component.selectedSourceName).toBe('SourceA')
      expect(mocks.filterStateService.setSourceName).toHaveBeenCalledWith('SourceA')
      expect(fetchSpy).toHaveBeenCalledWith(false)
    })
  })

  describe('createCourse', () => {
    it('routes to selfAssessment creation', () => {
      const { component, mocks } = build()
      component.createCourse('selfAssessment')
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/create'], { queryParams: { status: 'selfAssessment' } })
    })

    it('routes to courseWithLevel creation by default', () => {
      const { component, mocks } = build()
      component.createCourse('other')
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/create'], { queryParams: { status: 'courseWithLevel' } })
    })
  })

  describe('ngOnDestroy', () => {
    it('tears down the router subscription and clears the loader', () => {
      const { component, mocks } = build()
      const unsubscribe = jest.fn()
      component.routerSubscription = { unsubscribe } as any
      component.ngOnDestroy()
      expect(unsubscribe).toHaveBeenCalled()
      expect(mocks.loadService.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })
})
