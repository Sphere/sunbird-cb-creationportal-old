import { of } from 'rxjs'

import { MyContentComponent } from './my-content.component'

/**
 * Wave 18 — a sweep of `fetchContent` across every tab, role and profile state.
 * The role branches each read the signed-in user id through a ternary, so the
 * "no profile" arm of every one of them only runs when the session is anonymous.
 */
describe('MyContentComponent (request-building sweep)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
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
        authoringConfig: { newDesign: true, allowRedo: true, allowRestore: true, allowExpiry: true },
      },
      snackBar: { openFromComponent: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue({ afterClosed: jest.fn().mockReturnValue(of(true)) }) },
      authInitService: { ordinals: { subTitles: [{ name: 'English', value: 'en' }] } },
      configService: {
        unMappedUser: { roles: ['content_creator'] },
        userRoles: new Set(['content_creator']),
        userProfile: { userId: 'user-1' },
      },
      editorService: {
        languageList: jest.fn().mockReturnValue(of([])),
        sourceNames: jest.fn().mockReturnValue(of([])),
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
    component.newDesign = false
    return { component, mocks }
  }

  /** Every tab whose request shape depends on the signed-in role. */
  const ROLE_SCOPED_TABS = [
    'allCourses',
    'coursesWithoutCertificate',
    'courseWithCertificate',
    'published',
    'selfAssessmentDraft',
    'selfSentForReview',
    'selfPublishedCourse',
    'publish',
    'processing',
    'reviewed',
    'inreview',
    'draft',
    'courseRevision',
    'selfCourseRevision',
    'unpublished',
    'selfRetiredCourse',
    'selfToPublishedCourse',
  ]

  const ROLES = ['content_creator', 'content_reviewer', 'content_publisher']

  const asRole = (role: string) => ({
    accessService: {
      userId: 'user-1',
      hasRole: jest.fn((roles: string[]) => roles.includes(role)),
      authoringConfig: { newDesign: true, allowRedo: true, allowRestore: true, allowExpiry: true },
    },
  })

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('with a signed-in profile', () => {
    ROLES.forEach(role => {
      it.each(ROLE_SCOPED_TABS)(`builds the %s request for a ${role}`, tab => {
        const { component, mocks } = build(asRole(role))
        component.status = tab
        component.fetchContent(false)
        expect(mocks.myContSvc.fetchContent).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('with no profile on the session', () => {
    ROLES.forEach(role => {
      it.each(ROLE_SCOPED_TABS)(`falls back to a blank user id on the %s tab for a ${role}`, tab => {
        const { component, mocks } = build({
          ...asRole(role),
          configService: { unMappedUser: { roles: [] }, userRoles: new Set([role]), userProfile: null },
        })
        component.status = tab
        component.fetchContent(false)
        const filters = mocks.myContSvc.fetchContent.mock.calls[0][0].request.filters
        // Whichever scoping field this tab and role use, it must degrade to a blank.
        const scoped = [filters.createdBy, filters.reviewerIDs, filters.publisherIDs].filter(v => v !== undefined)
        scoped.forEach(v => expect(v === '' || (Array.isArray(v) && v.length === 0)).toBe(true))
      })
    })
  })

  describe('paging and language', () => {
    it('asks for the next page when loading more', () => {
      const { component, mocks } = build()
      component.status = 'draft'
      component.pagination = { offset: 3, limit: 24 }
      component.fetchContent(true)
      expect(mocks.myContSvc.getSearchBody).toHaveBeenCalledWith('draft', [], 3, expect.anything(), expect.anything())
    })

    it('asks for the first page otherwise', () => {
      const { component, mocks } = build()
      component.status = 'draft'
      component.pagination = { offset: 3, limit: 24 }
      component.fetchContent(false)
      expect(mocks.myContSvc.getSearchBody).toHaveBeenCalledWith('draft', [], 0, expect.anything(), expect.anything())
    })

    it('passes the chosen language into the search body', () => {
      const { component, mocks } = build()
      component.status = 'draft'
      component.searchLanguage = 'hi'
      component.fetchContent(false)
      expect(mocks.myContSvc.getSearchBody).toHaveBeenCalledWith('draft', ['hi'], 0, expect.anything(), expect.anything())
    })
  })
})
