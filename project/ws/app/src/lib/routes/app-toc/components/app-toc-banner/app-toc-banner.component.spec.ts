import { NavigationEnd } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { AppTocBannerComponent } from './app-toc-banner.component'

describe('AppTocBannerComponent', () => {
  let component: AppTocBannerComponent
  let sanitizer: any
  let router: any
  let route: any
  let dialog: any
  let tocSvc: any
  let configSvc: any
  let progressSvc: any
  let contentSvc: any
  let utilitySvc: any
  let mobileAppsSvc: any
  let authAccessService: any
  let cdr: any
  let resourceDownloadSvc: any
  let routerEvents: Subject<any>
  let routeData: Subject<any>
  let queryParamMap: Subject<any>

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'Course A',
      contentType: 'Course',
      status: 'Live',
      children: [{ identifier: 'do_2' }],
      artifactUrl: 'a.html',
      mimeType: 'application/html',
      ...over,
    }) as any

  const params = (map: Record<string, string> = {}) => ({
    get: (k: string) => (Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null),
  })

  beforeEach(() => {
    routerEvents = new Subject<any>()
    routeData = new Subject<any>()
    queryParamMap = new Subject<any>()
    sanitizer = { bypassSecurityTrustStyle: jest.fn().mockImplementation((v: string) => `safe:${v}`) }
    router = { url: '/app/toc/do_1/overview', events: routerEvents.asObservable(), navigate: jest.fn() }
    route = { data: routeData.asObservable(), queryParamMap: queryParamMap.asObservable() }
    dialog = { open: jest.fn() }
    tocSvc = {
      fetchPostAssessmentStatus: jest.fn().mockReturnValue(of({ result: [] })),
      fetchExternalContentAccess: jest.fn().mockReturnValue(of({ hasAccess: true })),
      filterToc: jest.fn().mockReturnValue(null),
      showStartButton: jest.fn().mockReturnValue(true),
      changeMessage: jest.fn(),
      subtitleOnBanners: true,
    }
    configSvc = {
      instanceConfig: { logos: { defaultSourceLogo: 'logo.png' } },
      restrictedFeatures: new Set<string>(),
      rootOrg: 'org1',
      userProfile: { userId: 'u1' },
    }
    progressSvc = {
      getComments: jest.fn().mockReturnValue(of([])),
      getProgressFor: jest.fn().mockReturnValue(of(42)),
    }
    contentSvc = {
      getFirstChildInHierarchy: jest.fn().mockReturnValue({ identifier: 'do_2', mimeType: 'application/html' }),
      getRegistrationStatus: jest.fn().mockResolvedValue({ hasAccess: true }),
    }
    utilitySvc = { isMobile: false }
    mobileAppsSvc = { sendViewerData: jest.fn() }
    authAccessService = { hasRole: jest.fn().mockReturnValue(false), hasAccess: jest.fn().mockReturnValue(false) }
    cdr = { detectChanges: jest.fn() }
    resourceDownloadSvc = {
      hasDownloadableResources: jest.fn().mockReturnValue(true),
      downloadAllAsZip: jest.fn().mockResolvedValue(undefined),
    }

    component = new AppTocBannerComponent(
      sanitizer,
      router,
      route,
      dialog,
      tocSvc,
      configSvc,
      progressSvc,
      contentSvc,
      utilitySvc,
      mobileAppsSvc,
      authAccessService,
      cdr,
      resourceDownloadSvc,
    )
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('resolves the reviewer / creator / external-reviewer roles', () => {
      authAccessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_reviewer')
      component.ngOnInit()
      expect(component.isReviewer).toBe(true)
      expect(component.isCreator).toBe(false)
      expect(component.allowExternalContentReviewer).toBe(false)
    })

    it('leaves isReviewer false without the reviewer role', () => {
      component.ngOnInit()
      expect(component.isReviewer).toBe(false)
    })

    it('reads the default source logo from the instance config', () => {
      component.ngOnInit()
      expect(component.defaultSLogo).toBe('logo.png')
    })

    it('tolerates a missing instance config', () => {
      configSvc.instanceConfig = null
      component.ngOnInit()
      expect(component.defaultSLogo).toBe('')
    })

    it('enables goals unless the feature is restricted', () => {
      component.ngOnInit()
      expect(component.isGoalsEnabled).toBe(true)
    })

    it('disables goals when the feature is restricted', () => {
      configSvc.restrictedFeatures = new Set(['goals'])
      component.ngOnInit()
      expect(component.isGoalsEnabled).toBe(false)
    })

    it('reads the registration and intranet-message feature flags', () => {
      configSvc.restrictedFeatures = new Set(['registrationExternal'])
      component.ngOnInit()
      expect(component.isRegistrationSupported).toBe(true)
      expect(component.showIntranetMessage).toBe(true)
    })

    it('captures the collection context from the query params', () => {
      component.ngOnInit()
      queryParamMap.next(params({ contextId: 'c1', contextPath: 'Course' }))
      expect(component.contextId).toBe('c1')
      expect(component.contextPath).toBe('Course')
    })

    it('ignores a partial collection context', () => {
      component.ngOnInit()
      queryParamMap.next(params({ contextId: 'c1' }))
      expect(component.contextId).toBeUndefined()
    })

    it('stores the toc page configuration from the route data', () => {
      component.ngOnInit()
      routeData.next({ pageData: { data: { postAssessment: false } } })
      expect(component.tocConfig).toEqual({ postAssessment: false })
    })

    it('loads the post-assessment status for an instructor-led course', () => {
      component.content = content({ learningMode: 'Instructor-Led' })
      tocSvc.fetchPostAssessmentStatus.mockReturnValue(of({ result: [{ contentId: 'do_1', status: 'pending' }] }))
      component.ngOnInit()
      routeData.next({ pageData: { data: { postAssessment: true } } })
      expect(component.showTakeAssessment).toEqual({ contentId: 'do_1', status: 'pending' })
    })

    it('skips the post-assessment lookup when the page does not enable it', () => {
      component.content = content({ learningMode: 'Instructor-Led' })
      component.ngOnInit()
      routeData.next({ pageData: { data: { postAssessment: false } } })
      expect(tocSvc.fetchPostAssessmentStatus).not.toHaveBeenCalled()
    })

    it('shows the edit button for a content owner outside preview', () => {
      authAccessService.hasAccess.mockReturnValue(true)
      component.content = content()
      component.forPreview = false
      component.ngOnInit()
      expect(component.editButton).toBe(true)
    })

    it('shows the edit button in preview for draft/live content', () => {
      authAccessService.hasAccess.mockReturnValue(true)
      component.content = content({ status: 'Draft' })
      component.forPreview = true
      component.ngOnInit()
      expect(component.editButton).toBe(true)
      expect(component.reviewButton).toBe(false)
    })

    it('shows the review button in preview for content under review', () => {
      authAccessService.hasAccess.mockReturnValue(true)
      component.content = content({ status: 'InReview' })
      component.forPreview = true
      component.ngOnInit()
      expect(component.reviewButton).toBe(true)
      expect(component.editButton).toBe(false)
    })

    it('builds the playlist button config from the content', () => {
      component.content = content()
      component.ngOnInit()
      expect(component.btnPlaylistConfig).toEqual({
        contentId: 'do_1',
        contentName: 'Course A',
        contentType: 'Course',
        mode: 'dialog',
      })
    })

    it('updates the banner when the router reports a navigation', () => {
      component.banners = { contents: 'contents.png' } as any
      component.ngOnInit()
      routerEvents.next(new NavigationEnd(1, '/app/toc/do_1/contents', '/app/toc/do_1/contents'))
      expect(component.routePath).toBe('contents')
      // bound directly: Angular does not sanitize the STYLE context
      expect(component.bannerUrl).toBe('url(contents.png)')
    })

    it('ignores router events that are not navigation ends', () => {
      component.ngOnInit()
      routerEvents.next({ id: 1 })
      expect(component.routePath).toBe('overview')
    })
  })

  describe('review comments', () => {
    it('narrows the visible roles for a creator and drops course-created entries', () => {
      authAccessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_creator')
      progressSvc.getComments.mockReturnValue(
        of([
          { role: 'reviewer', currentStatus: 'in-review' },
          { role: 'creator', currentStatus: 'in-review' },
          { role: 'publisher', currentStatus: 'course-created' },
        ]),
      )
      component.content = content()
      component.ngOnInit()
      expect(component.roles).toEqual(['reviewer', 'publisher'])
      expect(component.commentsList).toEqual([{ role: 'reviewer', currentStatus: 'in-review' }])
    })

    it('narrows the visible roles for a reviewer', () => {
      authAccessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_reviewer')
      component.content = content()
      component.ngOnInit()
      expect(component.roles).toEqual(['creator', 'publisher'])
    })

    it('narrows the visible roles for a publisher', () => {
      authAccessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_publisher')
      component.content = content()
      component.ngOnInit()
      expect(component.roles).toEqual(['creator', 'reviewer'])
    })

    it('keeps the default roles when the user holds none of them', () => {
      component.content = content()
      component.ngOnInit()
      expect(component.roles).toEqual(['reviewer', 'publisher', 'creator'])
    })
  })

  describe('ngOnChanges', () => {
    it('refreshes the banner path from the current URL', () => {
      component.banners = { overview: 'o.png' } as any
      component.ngOnChanges()
      expect(component.routePath).toBe('overview')
    })

    it('loads progress and playable links when content is present', () => {
      component.content = content()
      component.ngOnChanges()
      expect(component.contentProgress).toBe(42)
      expect(component.firstResourceLink).toBeTruthy()
    })

    it('skips the progress call in preview mode', () => {
      component.content = content()
      component.forPreview = true
      component.ngOnChanges()
      expect(progressSvc.getProgressFor).not.toHaveBeenCalled()
    })

    it('flags practice and assessment availability from the toc filter', () => {
      tocSvc.filterToc.mockReturnValue([{ identifier: 'x' }])
      component.content = content()
      component.ngOnChanges()
      expect(component.isPracticeVisible).toBe(true)
      expect(component.isAssessVisible).toBe(true)
    })

    it('builds the resume link when resume data is supplied', () => {
      component.content = content()
      component.resumeData = { identifier: 'do_3', mimeType: 'application/html' } as any
      component.ngOnChanges()
      expect(component.resumeDataLink).toBeTruthy()
    })

    it('flattens a per-org rating map into a number', () => {
      component.content = content({ averageRating: { org1: 4.5 }, totalRating: { org1: 10 } })
      component.ngOnChanges()
      expect(component.content!.averageRating).toBe(4.5)
      expect(component.content!.totalRating).toBe(10)
    })

    it('leaves a numeric rating untouched', () => {
      component.content = content({ averageRating: 3, totalRating: 7 })
      component.ngOnChanges()
      expect(component.content!.averageRating).toBe(3)
    })
  })

  describe('external content access', () => {
    it('fetches access for registration-backed content', () => {
      component.content = content({ registrationUrl: 'http://x' })
      component.ngOnChanges()
      expect(component.externalContentFetchStatus).toBe('done')
      expect(component.registerForExternal).toBe(true)
    })

    it('reports no access when the lookup fails', () => {
      tocSvc.fetchExternalContentAccess.mockReturnValue(throwError(() => 'boom'))
      component.content = content({ registrationUrl: 'http://x' })
      component.ngOnChanges()
      expect(component.externalContentFetchStatus).toBe('done')
      expect(component.registerForExternal).toBe(false)
    })

    it('grants access without a lookup in preview mode', () => {
      component.content = content({ registrationUrl: 'http://x' })
      component.forPreview = true
      component.ngOnChanges()
      expect(component.registerForExternal).toBe(true)
      expect(tocSvc.fetchExternalContentAccess).not.toHaveBeenCalled()
    })
  })

  describe('registration status', () => {
    it('grants the action buttons for ordinary content', () => {
      component.ngOnInit()
      expect(component.actionBtnStatus).toBe('grant')
    })

    it('grants when the external source reports access', async () => {
      component.content = content({ sourceShortName: 'Pluralsight' })
      component.ngOnInit()
      await Promise.resolve()
      expect(component.actionBtnStatus).toBe('grant')
    })

    it('rejects and records the registration URL when access is denied', async () => {
      contentSvc.getRegistrationStatus.mockResolvedValue({
        hasAccess: false,
        registrationUrl: 'http://register',
      })
      component.content = content({ sourceShortName: 'Pluralsight' })
      component.ngOnInit()
      await Promise.resolve()
      await Promise.resolve()
      expect(component.actionBtnStatus).toBe('reject')
      expect(component.content!.registrationUrl).toBe('http://register')
    })

    it('swallows a failed registration lookup', async () => {
      contentSvc.getRegistrationStatus.mockRejectedValue('boom')
      component.content = content({ sourceShortName: 'Pluralsight' })
      expect(() => component.ngOnInit()).not.toThrow()
      await Promise.resolve()
    })
  })

  describe('display getters', () => {
    it('showIntranetMsg is always true on mobile', () => {
      utilitySvc.isMobile = true
      component.showIntranetMessage = false
      expect(component.showIntranetMsg).toBe(true)
    })

    it('showIntranetMsg follows the flag on desktop', () => {
      component.showIntranetMessage = false
      expect(component.showIntranetMsg).toBe(false)
    })

    it('showStart delegates to the toc service', () => {
      expect(component.showStart).toBe(true)
    })

    it('showSubtitleOnBanner delegates to the toc service', () => {
      expect(component.showSubtitleOnBanner).toBe(true)
    })

    it('isPostAssessment is false without the page flag', () => {
      component.tocConfig = null
      expect(component.isPostAssessment).toBe(false)
    })

    it('isPostAssessment is false when no content is loaded', () => {
      component.tocConfig = { postAssessment: true }
      expect(component.isPostAssessment).toBe(false)
    })

    it('isPostAssessment is true for an instructor-led course', () => {
      component.tocConfig = { postAssessment: true }
      component.content = content({ learningMode: 'Instructor-Led' })
      expect(component.isPostAssessment).toBe(true)
    })

    it('isResource is true for content with no children', () => {
      component.content = content({ children: [] })
      expect(component.isResource).toBe(true)
      expect(mobileAppsSvc.sendViewerData).toHaveBeenCalled()
    })

    it('isResource is false for a populated course', () => {
      component.content = content()
      expect(component.isResource).toBe(false)
    })

    it('isResource is false without content', () => {
      expect(component.isResource).toBe(false)
    })

    it('showActionButtons waits for the registration check', () => {
      component.content = content()
      component.actionBtnStatus = 'wait'
      expect(component.showActionButtons).toBe(false)
    })

    it('showActionButtons hides deleted content', () => {
      component.content = content({ status: 'Deleted' })
      component.actionBtnStatus = 'grant'
      expect(component.showActionButtons).toBe(false)
    })

    it('showActionButtons shows live content once granted', () => {
      component.content = content()
      component.actionBtnStatus = 'grant'
      expect(component.showActionButtons).toBe(true)
    })

    it('showButtonContainer hides an empty course', () => {
      component.content = content({ children: [], artifactUrl: '' })
      component.actionBtnStatus = 'grant'
      expect(component.showButtonContainer).toBe(false)
    })

    it('showButtonContainer hides a resource with no artifact', () => {
      component.content = content({ contentType: 'Resource', artifactUrl: '' })
      component.actionBtnStatus = 'grant'
      expect(component.showButtonContainer).toBe(false)
    })

    it('showButtonContainer hides intranet content on mobile', () => {
      utilitySvc.isMobile = true
      component.content = content({ isInIntranet: true })
      component.actionBtnStatus = 'grant'
      expect(component.showButtonContainer).toBe(false)
    })

    it('showButtonContainer shows a playable course', () => {
      component.content = content()
      component.actionBtnStatus = 'grant'
      expect(component.showButtonContainer).toBe(true)
    })

    it('showInstructorLedMsg flags an instructor-led course with nothing to play', () => {
      component.content = content({ learningMode: 'Instructor-Led', children: [], artifactUrl: '' })
      component.actionBtnStatus = 'grant'
      expect(component.showInstructorLedMsg).toBe(true)
    })

    it('isHeaderHidden hides the header for an artifact-less resource', () => {
      component.content = content({ contentType: 'Resource', children: [], artifactUrl: '' })
      expect(component.isHeaderHidden).toBe(true)
    })

    it('sanitizedIntroductoryVideoIcon builds the css url', () => {
      component.content = content({ introductoryVideoIcon: 'icon.png' })
      expect(component.sanitizedIntroductoryVideoIcon).toBe('url(icon.png)')
    })

    it('sanitizedIntroductoryVideoIcon is null without an icon', () => {
      component.content = content()
      expect(component.sanitizedIntroductoryVideoIcon).toBeNull()
    })

    it('isInIFrame is false for a top-level window', () => {
      expect(component.isInIFrame).toBe(false)
    })
  })

  describe('rating icons', () => {
    it('returns a filled star below the average', () => {
      component.content = content({ averageRating: 3.5 })
      expect(component.getRatingIcon(3)).toBe('star')
    })

    it('returns a half star for the fractional position', () => {
      component.content = content({ averageRating: 3.5 })
      expect(component.getRatingIcon(4)).toBe('star_half')
    })

    it('returns an empty star above the average', () => {
      component.content = content({ averageRating: 3.5 })
      expect(component.getRatingIcon(5)).toBe('star_border')
    })

    it('returns an empty star when the content is unrated', () => {
      component.content = content()
      expect(component.getRatingIcon(1)).toBe('star_border')
    })
  })

  describe('generateQuery', () => {
    beforeEach(() => {
      component.firstResourceLink = { url: '/viewer/html/do_2', queryParams: { primaryCategory: 'x' } }
      component.resumeDataLink = { url: '/viewer/html/do_3', queryParams: { primaryCategory: 'y' } }
    })

    it('carries the view mode for a START request', () => {
      expect(component.generateQuery('START')).toEqual({ primaryCategory: 'x', viewMode: 'START' })
    })

    it('carries the view mode for a START_OVER request', () => {
      expect(component.generateQuery('START_OVER')).toEqual({
        primaryCategory: 'x',
        viewMode: 'START_OVER',
      })
    })

    it('adds the collection context when one is active', () => {
      component.contextId = 'c1'
      component.contextPath = 'Course'
      expect(component.generateQuery('START')).toEqual({
        primaryCategory: 'x',
        viewMode: 'START',
        collectionId: 'c1',
        collectionType: 'Course',
      })
    })

    it('drops the view mode in preview mode', () => {
      component.forPreview = true
      expect(component.generateQuery('START')).toEqual({ primaryCategory: 'x' })
    })

    it('uses the resume link for a RESUME request', () => {
      component.firstResourceLink = null
      expect(component.generateQuery('RESUME')).toEqual({
        primaryCategory: 'y',
        viewMode: 'RESUME',
      })
    })

    it('adds the collection context to a RESUME request', () => {
      component.firstResourceLink = null
      component.contextId = 'c1'
      component.contextPath = 'Course'
      expect(component.generateQuery('RESUME')).toEqual({
        primaryCategory: 'y',
        viewMode: 'RESUME',
        collectionId: 'c1',
        collectionType: 'Course',
      })
    })

    it('drops the view mode from a preview RESUME request', () => {
      component.firstResourceLink = null
      component.forPreview = true
      expect(component.generateQuery('RESUME')).toEqual({ primaryCategory: 'y' })
    })

    it('returns an empty query in preview with no links', () => {
      component.firstResourceLink = null
      component.resumeDataLink = null
      component.forPreview = true
      expect(component.generateQuery('START')).toEqual({})
    })

    it('falls back to just the view mode with no links', () => {
      component.firstResourceLink = null
      component.resumeDataLink = null
      expect(component.generateQuery('START')).toEqual({ viewMode: 'START' })
    })
  })

  describe('actions', () => {
    it('playIntroVideo opens the intro dialog for the content', () => {
      component.content = content({ introductoryVideo: 'intro.mp4' })
      component.playIntroVideo()
      expect(dialog.open).toHaveBeenCalled()
    })

    it('playIntroVideo does nothing without content', () => {
      component.playIntroVideo()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('gotoHistory, goToPreview and gotoComments broadcast their panel', () => {
      component.gotoHistory()
      expect(tocSvc.changeMessage).toHaveBeenCalledWith('history')
      component.goToPreview()
      expect(tocSvc.changeMessage).toHaveBeenCalledWith('preview')
      component.gotoComments()
      expect(tocSvc.changeMessage).toHaveBeenCalledWith('comments')
    })

    it('gotoReviewerChecklist navigates to the checklist for the content', () => {
      component.content = content()
      component.gotoReviewerChecklist()
      expect(router.navigate).toHaveBeenCalledWith(['/author/reviewerChecklist/do_1'])
    })

    it('gotoReviewerChecklist does nothing without content', () => {
      component.gotoReviewerChecklist()
      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('showOrgprofile navigates to the org details page', () => {
      component.showOrgprofile('org_9')
      expect(router.navigate).toHaveBeenCalledWith(['/app/org-details'], {
        queryParams: { orgId: 'org_9' },
      })
    })
  })

  describe('resource download', () => {
    it('isCourseCreator is true only for the owner', () => {
      component.content = content({ createdBy: 'u1' })
      expect(component.isCourseCreator).toBe(true)
      component.content = content({ createdBy: 'other' })
      expect(component.isCourseCreator).toBe(false)
    })

    it('isCourseCreator is false without a signed-in user', () => {
      configSvc.userProfile = null
      component.content = content({ createdBy: 'u1' })
      expect(component.isCourseCreator).toBe(false)
    })

    it('isExternalLiveReviewer reflects the role check', () => {
      authAccessService.hasRole.mockReturnValue(true)
      expect(component.isExternalLiveReviewer).toBe(true)
    })

    it('downloadAllResources zips the course resources', async () => {
      component.content = content()
      await component.downloadAllResources()
      expect(resourceDownloadSvc.downloadAllAsZip).toHaveBeenCalled()
      expect(component.isDownloadingResources).toBe(false)
      expect(cdr.detectChanges).toHaveBeenCalled()
    })

    it('downloadAllResources stops the click from bubbling', async () => {
      const event = { stopPropagation: jest.fn() } as any
      component.content = content()
      await component.downloadAllResources(event)
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('downloadAllResources is a no-op when nothing is downloadable', async () => {
      resourceDownloadSvc.hasDownloadableResources.mockReturnValue(false)
      await component.downloadAllResources()
      expect(resourceDownloadSvc.downloadAllAsZip).not.toHaveBeenCalled()
    })

    it('downloadAllResources ignores a re-entrant click', async () => {
      component.isDownloadingResources = true
      await component.downloadAllResources()
      expect(resourceDownloadSvc.downloadAllAsZip).not.toHaveBeenCalled()
    })

    it('downloadAllResources swallows a failed download', async () => {
      resourceDownloadSvc.downloadAllAsZip.mockRejectedValue('boom')
      component.content = content()
      await expect(component.downloadAllResources()).resolves.toBeUndefined()
      expect(component.isDownloadingResources).toBe(false)
    })
  })

  describe('ngOnDestroy', () => {
    it('drops every subscription', () => {
      component.ngOnInit()
      component.ngOnDestroy()
      expect(component.routerParamSubscription!.closed).toBe(true)
      expect(component.routeSubscription!.closed).toBe(true)
      expect(component.routeDataSubscription!.closed).toBe(true)
    })

    it('is safe when nothing was subscribed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
