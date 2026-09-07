import { of, throwError } from 'rxjs'

import { AllContentComponent } from './all-content.component'

/**
 * Covers the filter, expiry and failure paths the sibling
 * all-content.component.spec.ts leaves out.
 */
describe('AllContentComponent (filters + failures)', () => {
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
      accessService: { userId: 'user-1', hasRole: jest.fn().mockReturnValue(false), authoringConfig: { newDesign: true } },
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

  const seedMenu = (component: any) => {
    component.filters = []
    component.finalFilters = []
    component.filterMenuItems = [
      {
        type: 'contentType',
        content: [
          { displayName: 'Course', type: 'Course', checked: false },
          { displayName: 'Resource', type: 'Resource', checked: false },
        ],
      },
    ]
    component.dataSource = { data: [] }
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('filterApplyEvent', () => {
    it('adds a newly checked filter and resets pagination', () => {
      const { component } = build()
      seedMenu(component)
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })

      expect(component.filters).toHaveLength(1)
      expect(component.filterMenuItems[0].content[0].checked).toBe(true)
      expect(component.finalFilters).toEqual([{ key: 'contentType', value: ['Course'] }])
      expect(component.pagination.offset).toBe(0)
      expect(component.sideNavBarOpened).toBe(false)
    })

    it('removes a filter that is unchecked', () => {
      const { component } = build()
      seedMenu(component)
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.filters = [{ displayName: 'Course', type: 'Course' }] as any
      component.filterMenuItems[0].content[0].checked = true

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: false })

      expect(component.filters).toHaveLength(0)
      expect(component.filterMenuItems[0].content[0].checked).toBe(false)
    })

    it('refreshes the tree data source and refetches without changing filters', () => {
      const { component } = build()
      seedMenu(component)
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })

      expect(component.dataSource.data).toBe(component.filterMenuItems)
      expect(fetch).toHaveBeenCalledWith(false, false)
    })

    it('tracks each menu type as its own filter group', () => {
      const { component } = build()
      seedMenu(component)
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })
      component.filterApplyEvent({ displayName: 'Resource', type: 'Resource', checked: true })

      expect(component.filters).toHaveLength(2)
    })
  })

  describe('actionOnExpiry', () => {
    it('opens the expiry dialog with the content', () => {
      const { component, mocks } = build()
      component.actionOnExpiry({ identifier: 'do_1' } as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
      expect(mocks.dialog.open.mock.calls[0][1].data).toEqual({ identifier: 'do_1' })
    })

    it('drops the card once the user confirms', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }] as any

      component.actionOnExpiry({ identifier: 'do_1' } as any)

      expect(component.cardContent.map((c: any) => c.identifier)).toEqual(['do_2'])
    })

    it('leaves the card alone when dismissed', () => {
      const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(undefined)) }
      const { component } = build({ dialog: { open: jest.fn().mockReturnValue(dialogRef) } })
      component.cardContent = [{ identifier: 'do_1' }] as any

      component.actionOnExpiry({ identifier: 'do_1' } as any)

      expect(component.cardContent).toHaveLength(1)
    })
  })

  describe('failure handling', () => {
    it('restoreContent reports a failure', () => {
      const { component, mocks } = build({
        myContSvc: {
          getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
          fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
          restoreContent: jest.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
        },
      })
      component.cardContent = [{ identifier: 'do_1' }] as any

      component.restoreContent({ identifier: 'do_1' } as any)

      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.cardContent).toHaveLength(1)
    })

    it('createContent reports a failure', () => {
      const { component, mocks } = build({
        myContSvc: {
          getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
          fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
          createInAnotherLanguage: jest.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
        },
      })

      component.createContent({ identifier: 'do_1' } as any)

      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.router.navigate).not.toHaveBeenCalled()
    })

    it('unPublishOrDraft reports a failure', () => {
      const { component, mocks } = build({
        myContSvc: {
          getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
          fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
          upPublishOrDraft: jest.fn().mockReturnValue(throwError(() => ({ status: 500 }))),
        },
      })
      component.cardContent = [{ identifier: 'do_1' }] as any

      component.unPublishOrDraft({ identifier: 'do_1' } as any)

      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.cardContent).toHaveLength(1)
    })

    it('forwardBackward opens the comments dialog for the content', () => {
      const { component, mocks } = build()
      component.forwardBackward({ data: { identifier: 'do_1' }, type: 'sendForReview' })
      expect(mocks.dialog.open).toHaveBeenCalled()
    })
  })

  describe('isAllowedTab', () => {
    it('is false for an empty role list', () => {
      const { component } = build()
      expect(component.isAllowedTab([])).toBe(false)
    })

    it('delegates a non-empty role list to the access service', () => {
      const { component, mocks } = build({
        accessService: { userId: 'u1', hasRole: jest.fn().mockReturnValue(true), authoringConfig: { newDesign: true } },
      })
      expect(component.isAllowedTab(['content_creator'])).toBe(true)
      expect(mocks.accessService.hasRole).toHaveBeenCalledWith(['content_creator'])
    })

    it('is false when the access service refuses the roles', () => {
      const { component } = build({
        accessService: { userId: 'u1', hasRole: jest.fn().mockReturnValue(false), authoringConfig: { newDesign: true } },
      })
      expect(component.isAllowedTab(['content_publisher'])).toBe(false)
    })
  })
})
