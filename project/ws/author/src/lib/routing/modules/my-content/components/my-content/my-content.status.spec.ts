import { of, throwError } from 'rxjs'

import { MyContentComponent } from './my-content.component'

/**
 * Wave 18 — the status-driven query building of MyContentComponent:
 * `fetchStatus`, `setAction`, the role/status filter switch inside `fetchContent`,
 * and the content-action callbacks (`deleteContent`, `restoreContent`,
 * `createContent`, `unPublishOrDraft`, `forwardBackward`, `finalCall`, `action`,
 * `actionOnExpiry`).
 */
describe('MyContentComponent (status filters and content actions)', () => {
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
        authoringConfig: { newDesign: true, allowRedo: true, allowRestore: true, allowExpiry: true },
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
    return { component, mocks, dialogRef }
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  /** Runs fetchContent for a status and returns the filters it built. */
  const filtersFor = (status: string, tweak: (m: any, c: any) => void = () => undefined) => {
    const { component, mocks } = build()
    component.newDesign = false
    component.status = status
    tweak(mocks, component)
    component.fetchContent(false)
    return mocks.myContSvc.fetchContent.mock.calls[0][0].request.filters
  }

  const asRole = (role: string) => (mocks: any) => {
    mocks.accessService.hasRole = jest.fn((roles: string[]) => roles.includes(role))
  }

  // ----------------------------------------------------------- fetchStatus --

  describe('fetchStatus', () => {
    it.each([
      ['draft', ['Draft']],
      ['courseRevision', ['Draft']],
      ['selfCourseRevision', ['Draft']],
      ['rejected', ['Draft']],
      ['selfSentForReview', ['Review', 'QualityReview']],
      ['inreview', ['Review', 'QualityReview']],
      ['review', ['Review']],
      ['selfPublishedCourse', ['Live']],
      ['published', ['Live']],
      ['expiry', ['Live']],
      ['allCourses', ['Live']],
      ['coursesWithoutCertificate', ['Live']],
      ['externalCourseReview', ['Live']],
      ['externalSelfAssessmentReview', ['Live']],
      ['courseWithCertificate', ['Live']],
      ['publish', ['Review']],
      ['processing', ['Processing']],
      ['unpublished', ['Unpublished', 'Retired']],
      ['selfRetiredCourse', ['Unpublished', 'Retired']],
      ['deleted', ['Deleted']],
      ['reviewed', ['Review']],
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

  // ------------------------------------------------------------- setAction --

  describe('setAction', () => {
    it.each([
      'draft',
      'rejected',
      'inreview',
      'review',
      'published',
      'publish',
      'processing',
      'unpublished',
      'issueCertification',
      'allCourses',
      'coursesWithoutCertificate',
      'courseWithCertificate',
      'courseRevision',
      'selfCourseRevision',
      'deleted',
    ])('puts the %s tab in the authoring mode', status => {
      const { component } = build()
      component.status = status
      component.setAction()
      expect(component.currentAction).toBe('author')
    })

    it('puts the expiry tab in the expiry mode', () => {
      const { component } = build()
      component.status = 'expiry'
      component.setAction()
      expect(component.currentAction).toBe('expiry')
    })

    it('leaves the mode alone for an unknown tab', () => {
      const { component } = build()
      component.currentAction = 'author'
      component.status = 'somethingElse'
      component.setAction()
      expect(component.currentAction).toBe('author')
    })
  })

  // ---------------------------------------------- fetchContent filter rules --

  describe('fetchContent filters', () => {
    it('scopes an all-courses listing to the creator', () => {
      const filters = filtersFor('allCourses', asRole('content_creator'))
      expect(filters.createdBy).toBe('user-1')
    })

    it('scopes an all-courses listing to the reviewer', () => {
      const filters = filtersFor('allCourses', asRole('content_reviewer'))
      expect(filters.reviewerIDs).toEqual(['user-1'])
    })

    it('scopes an all-courses listing to the publisher', () => {
      const filters = filtersFor('allCourses', asRole('content_publisher'))
      expect(filters.publisherIDs).toEqual(['user-1'])
    })

    it('leaves an all-courses listing unscoped for any other role', () => {
      const filters = filtersFor('allCourses')
      expect(filters.createdBy).toBeUndefined()
      expect(filters.reviewerIDs).toBeUndefined()
    })

    it('falls back to a blank creator with no profile', () => {
      const filters = filtersFor('allCourses', (mocks: any) => {
        asRole('content_creator')(mocks)
        mocks.configService.userProfile = null
      })
      expect(filters.createdBy).toBe('')
    })

    it('scopes the publish queue to reviewed courses for the publisher', () => {
      const filters = filtersFor('publish')
      expect(filters.reviewStatus).toBe('Reviewed')
      expect(filters.competency).toBe(false)
      expect(filters.publisherIDs).toEqual(['user-1'])
    })

    it('scopes the processing queue to the publisher', () => {
      const filters = filtersFor('processing', asRole('content_publisher'))
      expect(filters.publisherIDs).toEqual(['user-1'])
    })

    it('scopes the processing queue to the creator', () => {
      const filters = filtersFor('processing', asRole('content_creator'))
      expect(filters.createdBy).toBe('user-1')
    })

    it('scopes the processing queue to the reviewer', () => {
      const filters = filtersFor('processing', asRole('content_reviewer'))
      expect(filters.reviewerIDs).toEqual(['user-1'])
    })

    it('scopes the reviewed queue to the publisher', () => {
      const filters = filtersFor('reviewed', asRole('content_publisher'))
      expect(filters.reviewStatus).toBe('Reviewed')
      expect(filters.publisherIDs).toEqual(['user-1'])
      expect(filters.competency).toBe(false)
    })

    it('leaves the reviewed queue unscoped for a non-publisher', () => {
      const filters = filtersFor('reviewed')
      expect(filters.publisherIDs).toBeUndefined()
    })

    it('scopes the in-review queue to the creator', () => {
      const filters = filtersFor('inreview', asRole('content_creator'))
      expect(filters.reviewStatus).toBe('InReview')
      expect(filters.createdBy).toBe('user-1')
      expect(filters.competency).toBe(false)
    })

    it('scopes the in-review queue to the reviewer', () => {
      const filters = filtersFor('inreview', asRole('content_reviewer'))
      expect(filters.reviewerIDs).toBe('user-1')
    })

    it('scopes the in-review queue to the publisher', () => {
      const filters = filtersFor('inreview', asRole('content_publisher'))
      expect(filters.publisherIDs).toBe('user-1')
    })

    it('scopes drafts to their creator', () => {
      const filters = filtersFor('draft', asRole('content_creator'))
      expect(filters.createdBy).toBe('user-1')
      expect(filters.competency).toBe(false)
    })

    it('scopes drafts for a public user too', () => {
      const filters = filtersFor('draft', (mocks: any) => {
        mocks.configService.userRoles = new Set(['public'])
      })
      expect(filters.createdBy).toBe('user-1')
    })

    it('leaves drafts unscoped for an unrelated role', () => {
      const filters = filtersFor('draft', (mocks: any) => {
        mocks.configService.userRoles = new Set(['someone-else'])
      })
      expect(filters.createdBy).toBeUndefined()
    })

    it('scopes a course revision to its creator', () => {
      const filters = filtersFor('courseRevision', asRole('content_creator'))
      expect(filters.createdBy).toBe('user-1')
      expect(filters.competency).toBe(false)
      expect(filters.prevStatus).toBe('Review')
    })

    it('scopes a self-assessment revision to its creator', () => {
      const filters = filtersFor('selfCourseRevision', asRole('content_creator'))
      expect(filters.competency).toBe(true)
      expect(filters.createdBy).toBe('user-1')
    })

    it('leaves a self-assessment revision unscoped for an unrelated role', () => {
      const filters = filtersFor('selfCourseRevision', (mocks: any) => {
        mocks.configService.userRoles = new Set(['someone-else'])
      })
      expect(filters.createdBy).toBeUndefined()
    })

    it('scopes the unpublished tab to the creator', () => {
      const filters = filtersFor('unpublished', asRole('content_creator'))
      expect(filters.createdBy).toBe('user-1')
      // Unpublished is queried as Retired on the backend.
      expect(filters.status).toEqual(['Retired'])
    })

    it('scopes the unpublished tab to the reviewer', () => {
      const filters = filtersFor('unpublished', asRole('content_reviewer'))
      expect(filters.reviewerIDs).toEqual(['user-1'])
    })

    it('scopes the unpublished tab to the publisher', () => {
      const filters = filtersFor('unpublished', asRole('content_publisher'))
      expect(filters.publisherIDs).toEqual(['user-1'])
    })

    it('scopes retired self assessments to their creator', () => {
      const filters = filtersFor('selfRetiredCourse', asRole('content_creator'))
      expect(filters.createdBy).toBe('user-1')
      expect(filters.competency).toBe(true)
    })

    it('leaves retired self assessments unscoped for another role', () => {
      const filters = filtersFor('selfRetiredCourse')
      expect(filters.createdBy).toBeUndefined()
      expect(filters.competency).toBe(true)
    })

    it('scopes self assessments awaiting publish to the publisher', () => {
      const filters = filtersFor('selfToPublishedCourse', asRole('content_publisher'))
      expect(filters.reviewStatus).toBe('Reviewed')
      expect(filters.status).toBe('Review')
      expect(filters.publisherIDs).toEqual(['user-1'])
    })

    it('marks courses without a certificate', () => {
      expect(filtersFor('coursesWithoutCertificate').issueCertification).toBe(false)
    })

    it('marks courses with a certificate', () => {
      expect(filtersFor('courseWithCertificate').issueCertification).toBe(true)
    })

    it('marks self assessment drafts', () => {
      expect(filtersFor('selfAssessmentDraft').competency).toBe(true)
    })

    it('marks self assessments sent for review', () => {
      const filters = filtersFor('selfSentForReview')
      expect(filters.competency).toBe(true)
      expect(filters.reviewStatus).toBe('InReview')
    })

    it('marks published courses as non-competency', () => {
      expect(filtersFor('published').competency).toBe(false)
    })

    it('marks an external course review as non-competency', () => {
      expect(filtersFor('externalCourseReview').competency).toBe(false)
    })

    it('marks an external self assessment review as competency', () => {
      expect(filtersFor('externalSelfAssessmentReview').competency).toBe(true)
    })

    it('always narrows to courses and learning paths', () => {
      expect(filtersFor('draft').contentType).toEqual(['Course', 'Learning Path'])
    })

    it('merges the applied facet filters into the query', () => {
      const filters = filtersFor('draft', (_m, c) => {
        c.finalFilters = [{ key: 'sourceName', value: ['NHM'] }]
      })
      expect(filters.sourceName).toEqual(['NHM'])
    })

    it('adds the chosen source name', () => {
      const filters = filtersFor('draft', (_m, c) => {
        c.selectedSourceName = 'NHM'
      })
      expect(filters.sourceName).toEqual(['NHM'])
    })

    it('passes the chosen language through', () => {
      const filters = filtersFor('draft', (_m, c) => {
        c.searchLanguage = 'hi'
      })
      expect(filters.lang).toEqual(['hi'])
    })
  })

  // ---------------------------------------------- fetchContent result handling --

  describe('fetchContent results', () => {
    it('uses the v6 search for the expiry tab', () => {
      const { component, mocks } = build()
      component.status = 'expiry'
      component.newDesign = false
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchFromSearchV6).toHaveBeenCalled()
      expect(mocks.myContSvc.fetchContent).not.toHaveBeenCalled()
    })

    it('uses the v6 search under the new design', () => {
      const { component, mocks } = build()
      component.status = 'draft'
      component.newDesign = true
      component.fetchContent(false)
      expect(mocks.myContSvc.fetchFromSearchV6).toHaveBeenCalled()
    })

    it('stores the returned content and the facet menu', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'allCourses'
      mocks.myContSvc.fetchContent.mockReturnValue(
        of({ result: { content: [{ identifier: 'do_1', lang: 'hi' }], count: 30, facets: [{ type: 'sourceName' }] } }),
      )
      component.fetchContent(false)
      expect(component.cardContent).toEqual([{ identifier: 'do_1', lang: 'hi' }])
      expect(component.totalContent).toBe(30)
      expect(component.showLoadMore).toBe(true)
      expect(component.fetchError).toBe(false)
      expect(mocks.editorService.getAllEntities).toHaveBeenCalledWith('hi')
    })

    it('keeps the existing facet menu when asked not to change it', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'allCourses'
      component.filterMenuItems = [{ type: 'existing' }] as any
      mocks.myContSvc.fetchContent.mockReturnValue(of({ result: { content: [], count: 0, facets: [{ type: 'new' }] } }))
      component.fetchContent(false, false)
      expect(component.filterMenuItems).toEqual([{ type: 'existing' }])
    })

    it('appends the next page when loading more', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'allCourses'
      component.cardContent = [{ identifier: 'do_1' }] as any
      mocks.myContSvc.fetchContent.mockReturnValue(of({ result: { content: [{ identifier: 'do_2' }], count: 2 } }))
      component.fetchContent(true)
      expect(component.cardContent).toHaveLength(2)
    })

    it('replaces the page when a search query is active', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'allCourses'
      component.queryFilter = 'maths'
      component.cardContent = [{ identifier: 'do_1' }] as any
      mocks.myContSvc.fetchContent.mockReturnValue(of({ result: { content: [{ identifier: 'do_2' }], count: 1 } }))
      component.fetchContent(true)
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
    })

    it('hides courses already sent for review from the draft tab', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'draft'
      mocks.myContSvc.fetchContent.mockReturnValue(
        of({
          result: {
            content: [
              { identifier: 'do_1', prevStatus: 'Review' },
              { identifier: 'do_2', prevStatus: 'Draft' },
            ],
            count: 2,
          },
        }),
      )
      component.fetchContent(false)
      expect(component.cardContent).toEqual([{ identifier: 'do_2', prevStatus: 'Draft' }])
    })

    it('hides reviewed self assessments from the self-assessment draft tab', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'selfAssessmentDraft'
      mocks.myContSvc.fetchContent.mockReturnValue(of({ result: { content: [{ identifier: 'do_1', prevStatus: 'Review' }], count: 1 } }))
      component.fetchContent(false)
      expect(component.cardContent).toEqual([])
    })

    it('falls back to English when the first result declares no language', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'allCourses'
      mocks.myContSvc.fetchContent.mockReturnValue(of({ result: { content: [{ identifier: 'do_1' }], count: 1 } }))
      component.fetchContent(false)
      expect(mocks.editorService.getAllEntities).toHaveBeenCalledWith('en')
    })

    it('records the failure and empties the list when the search fails', () => {
      const { component, mocks } = build()
      component.newDesign = false
      component.status = 'allCourses'
      mocks.myContSvc.fetchContent.mockReturnValue(throwError(() => new Error('down')))
      component.fetchContent(false)
      expect(component.fetchError).toBe(true)
      expect(component.cardContent).toEqual([])
      expect(component.showLoadMore).toBe(false)
    })
  })

  // ----------------------------------------------------------- search glue --

  describe('search, load more and clearing', () => {
    it('takes the trimmed query from the input box', () => {
      const { component } = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.searchInputElem = { nativeElement: { value: '  maths  ' } } as any
      component.search()
      expect(component.queryFilter).toBe('maths')
      expect(fetch).toHaveBeenCalledWith(false, false)
    })

    it('advances the page when loading more', () => {
      const { component } = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.loadMore()
      expect(component.pagination.offset).toBe(1)
      expect(fetch).toHaveBeenCalledWith(true, false)
    })

    it('clears every filter and re-runs the search', () => {
      const { component, mocks } = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.searchInputElem = { nativeElement: { value: 'maths' } } as any
      component.filterMenuItems = [{ content: [{ checked: true }] }] as any
      component.finalFilters = [{ key: 'a', value: ['b'] }] as any
      component.filters = [{ displayName: 'x' }] as any
      component.clearAllFilters()
      expect(component.finalFilters).toEqual([])
      expect(component.filters).toEqual([])
      expect(component.queryFilter).toBe('')
      expect(component.filterMenuItems[0].content[0].checked).toBe(false)
      expect(mocks.filterStateService.clearFilters).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith(false)
    })
  })

  // ------------------------------------------------------- content actions --

  describe('content actions', () => {
    const content = { identifier: 'do_1', status: 'Live', locale: 'en' } as any

    it('drops a deleted course from the list', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }] as any
      component.deleteContent(content)
      expect(mocks.myContSvc.deleteOrUnpublishContent).toHaveBeenCalledWith('do_1')
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('shows the error parser when a delete conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.deleteOrUnpublishContent.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.deleteContent(content)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict delete failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.deleteOrUnpublishContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.deleteContent(content)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('drops a restored course from the list', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'do_1' }] as any
      component.restoreContent(content)
      expect(mocks.myContSvc.restoreContent).toHaveBeenCalledWith('do_1')
      expect(component.cardContent).toEqual([])
    })

    it('shows the error parser when a restore conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.restoreContent.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.restoreContent(content)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict restore failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.restoreContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.restoreContent(content)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('opens the editor on the copy it created in another language', () => {
      const { component, mocks } = build()
      component.createContent(content)
      expect(mocks.myContSvc.createInAnotherLanguage).toHaveBeenCalledWith('do_1', 'en')
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/newId')
    })

    it('shows the error parser when a copy conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.createContent(content)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict copy failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 500 })))
      component.createContent(content)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('drops an unpublished course from the list', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'do_1' }] as any
      component.unPublishOrDraft(content)
      expect(mocks.myContSvc.upPublishOrDraft).toHaveBeenCalledWith('do_1')
      expect(component.cardContent).toEqual([])
    })

    it('shows the error parser when an unpublish conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.upPublishOrDraft.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.unPublishOrDraft(content)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict unpublish failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.upPublishOrDraft.mockReturnValue(throwError(() => ({ status: 500 })))
      component.unPublishOrDraft(content)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------ forwardBackward/finalCall --

  describe('forwardBackward and finalCall', () => {
    const commentsForm = { controls: { comments: { value: 'please revise' } } } as any

    it('collects a comment before moving the course', () => {
      const { component, dialogRef } = build()
      dialogRef.afterClosed.mockReturnValue(of(commentsForm))
      const finalCall = jest.spyOn(component, 'finalCall').mockImplementation(() => undefined)
      component.forwardBackward({ type: 'moveToDraft', data: { identifier: 'do_1', status: 'Review' } })
      expect(finalCall).toHaveBeenCalledWith(commentsForm, expect.objectContaining({ type: 'moveToDraft' }))
    })

    it('does nothing when the comment dialog is dismissed', () => {
      const { component, dialogRef } = build()
      dialogRef.afterClosed.mockReturnValue(of(undefined))
      const finalCall = jest.spyOn(component, 'finalCall').mockImplementation(() => undefined)
      component.forwardBackward({ type: 'moveToDraft', data: { identifier: 'do_1' } })
      expect(finalCall).not.toHaveBeenCalled()
    })

    it('sends a move-to-draft as operation zero', () => {
      const { component, mocks } = build()
      component.cardContent = [{ identifier: 'do_1' }] as any
      component.finalCall(commentsForm, { type: 'moveToDraft', data: { identifier: 'do_1', status: 'Review' } })
      expect(mocks.myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'please revise', operation: 0 }, 'do_1', 'Review')
      expect(component.cardContent).toEqual([])
    })

    it('sends a move-to-in-review as operation minus one', () => {
      const { component, mocks } = build()
      component.finalCall(commentsForm, { type: 'moveToInReview', data: { identifier: 'do_1', status: 'Draft' } })
      expect(mocks.myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'please revise', operation: -1 }, 'do_1', 'Draft')
    })

    it('leaves the operation unset for an unknown move', () => {
      const { component, mocks } = build()
      component.finalCall(commentsForm, { type: 'somethingElse', data: { identifier: 'do_1', status: 'Draft' } })
      expect(mocks.myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'please revise', operation: undefined }, 'do_1', 'Draft')
    })

    it('does nothing without a comment form', () => {
      const { component, mocks } = build()
      component.finalCall(undefined as any, { type: 'moveToDraft', data: { identifier: 'do_1' } })
      expect(mocks.myContSvc.forwardBackward).not.toHaveBeenCalled()
    })

    it('shows the error parser when the move conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.forwardBackward.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.finalCall(commentsForm, { type: 'moveToDraft', data: { identifier: 'do_1', status: 'Review' } })
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict move failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalCall(commentsForm, { type: 'moveToDraft', data: { identifier: 'do_1', status: 'Review' } })
      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
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

  // -------------------------------------------------------- actionOnExpiry --

  describe('actionOnExpiry', () => {
    it('drops the card once the author confirms the extension', () => {
      const { component, dialogRef } = build()
      dialogRef.afterClosed.mockReturnValue(of({ isExtend: true, expiryDate: '2030-01-01' }))
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }] as any
      component.actionOnExpiry({ identifier: 'do_1' } as any)
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
    })

    it('leaves the list alone when the dialog is dismissed', () => {
      const { component, dialogRef } = build()
      dialogRef.afterClosed.mockReturnValue(of(undefined))
      component.cardContent = [{ identifier: 'do_1' }] as any
      component.actionOnExpiry({ identifier: 'do_1' } as any)
      expect(component.cardContent).toEqual([{ identifier: 'do_1' }])
    })
  })
})
