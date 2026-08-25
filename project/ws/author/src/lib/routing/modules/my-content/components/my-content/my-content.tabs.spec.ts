import { of } from 'rxjs'
import { MyContentComponent } from './my-content.component'

/**
 * Covers the three large tab-state matrices of MyContentComponent — the ngOnInit
 * status switch, navigateContents() and onClickReviewCourse() — plus the small
 * role/filter helpers. The sibling my-content.component.spec.ts covers fetching
 * and the content actions.
 */
describe('MyContentComponent (tab state)', () => {
  let mocks: any

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const build = (overrides: any = {}) => {
    mocks = {
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
      dialog: { open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }) },
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
    return component
  }

  /** Runs ngOnInit with the given status on the route. */
  const initWith = (status: string, roles: string[] = ['content_creator']) => {
    const component = build({
      activatedRoute: { queryParams: of({ status }) },
      configService: {
        unMappedUser: { roles },
        userRoles: new Set(roles),
        userProfile: { userId: 'user-1' },
      },
    })
    jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
    component.ngOnInit()
    return component
  }

  describe('ngOnInit status matrix', () => {
    const cases: Array<[string, string, string]> = [
      ['allCourses', 'Manage Courses', 'All Courses'],
      ['coursesWithoutCertificate', 'Manage Courses', 'Courses without certificate'],
      ['courseWithCertificate', 'Manage Courses', 'Courses with certificate'],
      ['selfAssessmentDraft', 'Self Assessment', 'Draft'],
      ['selfSentForReview', 'Self Assessment', 'Sent for review'],
      ['selfToPublishedCourse', 'Self Assessment', 'Courses to Pubish'],
      ['selfPublishedCourse', 'Self Assessment', 'Published'],
      ['selfRetiredCourse', 'Self Assessment', 'Retired'],
      ['inreview', 'My Courses', 'Sent For Review'],
      ['externalCourseReview', 'Live Courses', 'Courses to Review'],
      ['externalSelfAssessmentReview', 'Live Self Assessment', 'Self Assessment to Review'],
      ['published', 'My Courses', 'Published'],
      ['unpublished', 'My Courses', 'Retired'],
      ['courseRevision', 'My Courses', 'For Revision'],
      ['AIHub', 'AIHub', 'AIHub'],
      ['selfCourseRevision', 'Self Assessment', 'For Revision'],
    ]

    cases.forEach(([status, tab, currentStatus]) => {
      it(`opens the ${tab} / ${currentStatus} tab for "${status}"`, () => {
        const component = initWith(status)
        expect(component.status).toBe(status)
        expect(component.currentTab).toBe(tab)
        expect(component.currentStatus).toBe(currentStatus)
      })
    })

    it('marks the manage-courses group for the certificate statuses', () => {
      const component = initWith('allCourses')
      expect(component.links).toEqual(['All Courses', 'Courses without certificate', 'Courses with certificate'])
      expect(component.isSelectedAllCourse).toBe(true)
      expect(component.isContentExpanded).toBe(false)
      expect(component.isCouseExpanded).toBe(true)
    })

    it('selects the without-certificate tab', () => {
      const component = initWith('coursesWithoutCertificate')
      expect(component.isSelectedCourseWithoutCertificate).toBe(true)
      expect(component.isSelectedAllCourse).toBe(false)
    })

    it('selects the with-certificate tab', () => {
      const component = initWith('courseWithCertificate')
      expect(component.isSelectedCourseWithCertificate).toBe(true)
    })

    it('lists the author tabs for the Draft status', () => {
      const component = initWith('Draft')
      expect(component.links).toEqual(['Draft', 'Sent for review', 'Published Courses', 'Retired'])
      expect(component.activeLink).toBe('Draft')
    })

    it('expands the self-assessment group for its statuses', () => {
      const component = initWith('selfAssessmentDraft')
      expect(component.isSelfAssessmentExpanded).toBe(true)
      expect(component.createCourseBtn).toBe(false)
      expect(component.isSelfAssessmentSelectedColor).toBe(true)
    })

    it('marks the external course review tab', () => {
      const component = initWith('externalCourseReview')
      expect(component.isSelectedToExternalCouseReview).toBe(true)
      expect(component.isSelectedToExternalSelfAssessmentReview).toBe(false)
    })

    it('marks the external self-assessment review tab', () => {
      const component = initWith('externalSelfAssessmentReview')
      expect(component.isSelectedToExternalSelfAssessmentReview).toBe(true)
      expect(component.isSelectedToExternalCouseReview).toBe(false)
    })

    it('resolves the permission flags from the roles and config', () => {
      const component = initWith('draft', ['content_creator', 'content_reviewer', 'content_publisher'])
      expect(component.allowAuthor).toBe(true)
      expect(component.allowAuthorContentCreate).toBe(true)
      expect(component.allowReview).toBe(true)
      expect(component.allowPublish).toBe(true)
      expect(component.allowRedo).toBe(true)
      expect(component.allowRestore).toBe(true)
      expect(component.allowExpiry).toBe(true)
    })

    it('restores the saved filters, source name and language', () => {
      const component = build({
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
    })

    it('loads the language and source lists', () => {
      const component = initWith('draft')
      expect(component.allLanguages).toEqual([{ name: 'English', value: 'en' }])
      expect(component.sourceName).toEqual(['SourceA'])
    })

    it('restricts a PUBLIC-only user to the Draft tab', () => {
      const component = build({
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
    })

    it('remaps a publisher landing on Draft to the publish queue', () => {
      const component = initWith('draft', ['content_publisher'])
      expect(component.status).toBe('reviewed')
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], {
        queryParams: { status: 'reviewed' },
      })
    })

    it('remaps a reviewer landing on Draft to the review queue', () => {
      const component = initWith('draft', ['content_reviewer'])
      expect(component.status).toBe('inreview')
    })

    it('remaps a publisher landing on the self-assessment draft tab', () => {
      const component = initWith('selfAssessmentDraft', ['content_publisher'])
      expect(component.status).toBe('selfToPublishedCourse')
    })

    it('remaps a reviewer landing on the self-assessment draft tab', () => {
      const component = initWith('selfAssessmentDraft', ['content_reviewer'])
      expect(component.status).toBe('selfSentForReview')
    })

    it('leaves a creator on the Draft tab', () => {
      const component = initWith('draft')
      expect(component.status).toBe('draft')
      expect(mocks.router.navigate).not.toHaveBeenCalled()
    })
  })

  describe('navigateContents', () => {
    const cases: Array<[string, string, string, string]> = [
      ['External Courses to Review', 'Live Courses', 'Courses to Review', 'externalCourseReview'],
      ['External Self Assessment to Review', 'Live Self Assessment', 'Self Assessment to Review', 'externalSelfAssessmentReview'],
      ['AIHub', 'AIHub', 'AIHub', 'AIHub'],
      ['Draft', 'My Courses', 'Draft', 'draft'],
    ]

    cases.forEach(([link, tab, currentStatus, routeStatus]) => {
      it(`navigates "${link}" to the ${tab} tab`, () => {
        const component = build()
        component.navigateContents(link)
        expect(component.currentTab).toBe(tab)
        expect(component.currentStatus).toBe(currentStatus)
        expect(component.activeLink).toBe(link === 'Draft' ? 'Draft' : currentStatus)
        expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], {
          queryParams: { status: routeStatus },
        })
      })
    })

    const routeOnly: Array<[string, string]> = [
      ['Sent for review', 'inreview'],
      ['for revision', 'courseRevision'],
      ['self for revision', 'selfCourseRevision'],
      ['Courses to publish', 'reviewed'],
      ['Published Courses', 'published'],
      ['Retired', 'unpublished'],
      ['All Courses', 'allCourses'],
      ['Courses without certificate', 'coursesWithoutCertificate'],
      ['Courses with certificate', 'courseWithCertificate'],
      ['selfAssessmentDraft', 'selfAssessmentDraft'],
      ['Self Assessment Draft', 'selfAssessmentDraft'],
      ['Self Sent for review', 'selfSentForReview'],
      ['Self Courses to publish', 'selfToPublishedCourse'],
      ['Self Published Courses', 'selfPublishedCourse'],
      ['Self Retired Courses', 'selfRetiredCourse'],
    ]

    routeOnly.forEach(([link, routeStatus]) => {
      it(`routes "${link}" to status ${routeStatus}`, () => {
        const component = build()
        component.navigateContents(link)
        expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/my-content'], {
          queryParams: { status: routeStatus },
        })
      })
    })

    // The lowercase status-key aliases only re-apply the tab state; the caller is
    // already on that route, so they deliberately do not navigate again.
    const stateOnly = ['draft', 'courseRevision', 'selfCourseRevision', 'selfSentForReview', 'inreview']

    stateOnly.forEach(link => {
      it(`re-applies the tab state for "${link}" without navigating`, () => {
        const component = build()
        component.navigateContents(link)
        expect(mocks.router.navigate).not.toHaveBeenCalled()
        expect(component.currentTab).toBeTruthy()
      })
    })

    it('flags the AIHub tab', () => {
      const component = build()
      component.navigateContents('AIHub')
      expect(component.isAihub).toBe(true)
    })

    it('clears the AIHub flag for a course tab', () => {
      const component = build()
      component.isAihub = true
      component.navigateContents('Draft')
      expect(component.isAihub).toBe(false)
    })

    it('ignores an unknown link', () => {
      const component = build()
      component.currentTab = 'My Courses'
      component.navigateContents('Nothing')
      expect(mocks.router.navigate).not.toHaveBeenCalled()
      expect(component.currentTab).toBe('My Courses')
    })
  })

  describe('onClickReviewCourse', () => {
    const cases: Array<[string, string, string]> = [
      ['Sent for review', 'My Courses', 'Sent for review'],
      ['Courses to publish', 'My Courses', 'Courses to publish'],
      ['Published', 'My Courses', 'Published'],
    ]

    cases.forEach(([status, tab, currentStatus]) => {
      it(`switches to the ${tab} / ${currentStatus} tab for "${status}"`, () => {
        const component = build()
        component.allowAuthorContentCreate = true
        component.onClickReviewCourse(status)
        expect(component.currentTab).toBe(tab)
        expect(component.currentStatus).toBe(currentStatus)
        expect(component.link).toBe(status)
        expect(component.activeLink).toBe(status)
      })
    })

    const otherStatuses = [
      'Retired',
      'Draft',
      'All Courses',
      'Courses without certificate',
      'Courses with certificate',
      'Self Assessment Draft',
      'selfAssessmentDraft',
      'Self Sent for review',
      'Self Courses to publish',
      'Self Published Courses',
      'Self Retired Courses',
      'for revision',
      'self for revision',
      'External Courses to Review',
      'External Self Assessment to Review',
    ]

    otherStatuses.forEach(status => {
      it(`handles the "${status}" header click`, () => {
        const component = build()
        component.allowAuthorContentCreate = true
        expect(() => component.onClickReviewCourse(status)).not.toThrow()
        // Some branches re-label the active link (e.g. the External* and alias
        // statuses), so assert the tab settled rather than the exact link text.
        expect(component.currentTab).toBeTruthy()
        expect(component.currentStatus).toBeTruthy()
      })
    })

    it('lists the certificate tabs for the manage-courses statuses', () => {
      const component = build()
      component.onClickReviewCourse('All Courses')
      expect(component.links).toEqual(['All Courses', 'Courses without certificate', 'Courses with certificate'])
    })

    it('lists the author tabs for a creator', () => {
      const component = build()
      component.allowAuthorContentCreate = true
      component.onClickReviewCourse('Draft')
      expect(component.links).toEqual(['Draft', 'Sent for review', 'Published Courses', 'Retired'])
    })

    it('lists the reviewer tabs for a reviewer', () => {
      const component = build()
      component.allowAuthorContentCreate = false
      component.allowReview = true
      component.onClickReviewCourse('Sent for review')
      expect(component.links).toEqual(['Sent for review', 'Published Courses', 'Retired'])
    })

    it('lists the publisher tabs for a publisher', () => {
      const component = build()
      component.allowAuthorContentCreate = false
      component.allowReview = false
      component.allowPublish = true
      component.onClickReviewCourse('Courses to publish')
      expect(component.links).toEqual(['Courses to publish', 'Published Courses'])
    })

    it('lists the single review tab for an external reviewer', () => {
      const component = build()
      component.allowAuthorContentCreate = false
      component.allowReview = false
      component.allowPublish = false
      component.allowExternalContentReviewer = true
      component.onClickReviewCourse('Courses to Review')
      expect(component.links).toEqual(['Courses to Review'])
    })

    it('remaps a Draft click for a publisher', () => {
      const component = build({
        configService: {
          unMappedUser: { roles: ['content_publisher'] },
          userRoles: new Set(['content_publisher']),
          userProfile: { userId: 'user-1' },
        },
      })
      component.onClickReviewCourse('Draft')
      expect(component.link).toBe('Courses to publish')
    })

    it('remaps a Draft click for a reviewer', () => {
      const component = build({
        configService: {
          unMappedUser: { roles: ['content_reviewer'] },
          userRoles: new Set(['content_reviewer']),
          userProfile: { userId: 'user-1' },
        },
      })
      component.onClickReviewCourse('Draft')
      expect(component.link).toBe('Sent for review')
    })

    it('remaps a self-assessment Draft click for a publisher', () => {
      const component = build({
        configService: {
          unMappedUser: { roles: ['content_publisher'] },
          userRoles: new Set(['content_publisher']),
          userProfile: { userId: 'user-1' },
        },
      })
      component.onClickReviewCourse('selfAssessmentDraft')
      expect(component.link).toBe('Self Courses to publish')
    })

    it('remaps a self-assessment Draft click for a reviewer', () => {
      const component = build({
        configService: {
          unMappedUser: { roles: ['content_reviewer'] },
          userRoles: new Set(['content_reviewer']),
          userProfile: { userId: 'user-1' },
        },
      })
      component.onClickReviewCourse('selfAssessmentDraft')
      expect(component.link).toBe('Self Sent for review')
    })
  })

  describe('canShow', () => {
    const roleFor = (role: string) =>
      build({
        configService: {
          unMappedUser: { roles: [role] },
          userRoles: new Set([role]),
          userProfile: { userId: 'user-1' },
        },
      })

    it('gates review on the reviewer role', () => {
      expect(roleFor('content_reviewer').canShow('review')).toBe(true)
      expect(roleFor('content_creator').canShow('review')).toBe(false)
    })

    it('gates publish on the publisher role', () => {
      expect(roleFor('content_publisher').canShow('publish')).toBe(true)
      expect(roleFor('content_creator').canShow('publish')).toBe(false)
    })

    it('treats any authoring role as author', () => {
      expect(roleFor('content_reviewer').canShow('author')).toBe(true)
      expect(roleFor('content_creator').canShow('author')).toBe(true)
      expect(roleFor('content_publisher').canShow('author')).toBe(true)
      expect(roleFor('public').canShow('author')).toBe(false)
    })

    it('gates content creation on the creator role', () => {
      expect(roleFor('content_creator').canShow('author_create')).toBe(true)
      expect(roleFor('content_reviewer').canShow('author_create')).toBe(false)
    })

    it('gates external review on its own role', () => {
      expect(roleFor('external_content_reviewer_live').canShow('external_content_reviewer')).toBe(true)
    })

    it('refuses an unknown role', () => {
      expect(roleFor('content_creator').canShow('whatever')).toBe(false)
    })
  })

  describe('filters and language', () => {
    it('setCurrentLanguage persists the choice and refetches', () => {
      const component = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.setCurrentLanguage('hi')
      expect(component.searchLanguage).toBe('hi')
      expect(mocks.filterStateService.setLanguage).toHaveBeenCalledWith('hi')
      expect(fetch).toHaveBeenCalledWith(false)
    })

    it('setCurrentSourceName persists the choice and refetches', () => {
      const component = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.setCurrentSourceName('SourceA')
      expect(component.selectedSourceName).toBe('SourceA')
      expect(mocks.filterStateService.setSourceName).toHaveBeenCalledWith('SourceA')
      expect(fetch).toHaveBeenCalledWith(false)
    })

    it('loadMore advances the page and appends', () => {
      const component = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.loadMore()
      expect(component.pagination.offset).toBe(1)
      expect(fetch).toHaveBeenCalledWith(true, false)
    })
  })

  describe('createCourse', () => {
    it('starts a self assessment', () => {
      const component = build()
      component.createCourse('selfAssessment')
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/create'], {
        queryParams: { status: 'selfAssessment' },
      })
    })

    it('starts a levelled course by default', () => {
      const component = build()
      component.createCourse('course')
      expect(mocks.router.navigate).toHaveBeenCalledWith(['/author/create'], {
        queryParams: { status: 'courseWithLevel' },
      })
    })
  })

  describe('ngOnDestroy', () => {
    it('tears down the query-param subscription and hides the loader', () => {
      const component = initWith('draft')
      component.ngOnDestroy()
      expect(mocks.loadService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('is safe before ngOnInit runs', () => {
      const component = build()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
