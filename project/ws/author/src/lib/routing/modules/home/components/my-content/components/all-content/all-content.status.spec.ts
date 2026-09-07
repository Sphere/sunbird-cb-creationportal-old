import { of } from 'rxjs'

import { AllContentComponent } from './all-content.component'

/**
 * Wave 18 — the status mapping, facet toggling and action router of
 * AllContentComponent.
 */
describe('AllContentComponent (statuses and actions)', () => {
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

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  // ----------------------------------------------------------- fetchStatus --

  describe('fetchStatus', () => {
    it.each([
      ['rejected', ['Draft']],
      ['inreview', ['InReview', 'QualityReview']],
      ['review', ['InReview']],
      ['published', ['Live']],
      ['expiry', ['Live']],
      ['publish', ['Reviewed']],
      ['processing', ['Processing']],
      ['unpublished', ['Unpublished']],
      ['deleted', ['Deleted']],
    ])('maps the %s tab to %s', (status, expected) => {
      const { component } = build()
      component.status = status
      expect(component.fetchStatus()).toEqual(expected)
    })

    it('falls back to Draft for an unknown tab', () => {
      const { component } = build()
      component.status = 'somethingElse'
      expect(component.fetchStatus()).toEqual(['Draft'])
    })
  })

  // ------------------------------------------------------------ fetchContent --

  describe('fetchContent', () => {
    it('uses the v6 search for the expiry tab', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'expiry'
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchFromSearchV6).toHaveBeenCalled()
      expect(mocks.myContSvc.fetchContent).not.toHaveBeenCalled()
    })

    it('uses the v6 search under the new design', () => {
      const { component, mocks } = build()
      component.newDesign = true
      component.status = 'published'
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchFromSearchV6).toHaveBeenCalled()
    })

    it('falls back to the legacy search otherwise', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'published'
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchContent).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------- filterApplyEvent --

  describe('filterApplyEvent', () => {
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
    }

    it('ticks a newly chosen facet and records it', () => {
      const { component } = build()
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      seedMenu(component)
      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })
      expect(component.filterMenuItems[0].content[0].checked).toBe(true)
      expect(component.finalFilters).toEqual([{ key: 'contentType', value: ['Course'] }])
    })

    it('unticks a facet that was removed', () => {
      const { component } = build()
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      seedMenu(component)
      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })
      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: false })
      expect(component.filterMenuItems[0].content[0].checked).toBe(false)
      expect(component.filters).toEqual([])
      expect(component.finalFilters).toEqual([])
    })
  })

  // ---------------------------------------------------------------- action --

  describe('action', () => {
    const data = { identifier: 'do_1' } as any

    it('creates a copy in another language', () => {
      const { component } = build()
      const create = jest.spyOn(component, 'createContent').mockImplementation(() => undefined)
      component.action({ type: 'create', data })
      expect(create).toHaveBeenCalledWith(data)
    })

    it.each(['review', 'publish', 'edit'])('opens the editor for %s', type => {
      const { component, mocks } = build()
      component.action({ type, data })
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_1')
    })

    it('drops the card on a remove', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }] as any
      component.action({ type: 'remove', data })
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
    })

    it.each(['moveToInReview', 'moveToDraft', 'delete', 'unpublish', 'restoreDeleted'])('asks for confirmation before %s', type => {
      const { component } = build()
      const confirm = jest.spyOn(component, 'confirmAction').mockImplementation(() => undefined)
      component.action({ type, data })
      expect(confirm).toHaveBeenCalledWith({ type, data })
    })

    it('extends the expiry date', () => {
      const { component } = build()
      const expiry = jest.spyOn(component, 'actionOnExpiry').mockImplementation(() => undefined)
      component.action({ type: 'expiryExtend', data })
      expect(expiry).toHaveBeenCalledWith(data)
    })

    it('ignores an unknown action', () => {
      const { component, mocks } = build()
      component.action({ type: 'somethingElse', data })
      expect(mocks.router.navigateByUrl).not.toHaveBeenCalled()
    })
  })
})
