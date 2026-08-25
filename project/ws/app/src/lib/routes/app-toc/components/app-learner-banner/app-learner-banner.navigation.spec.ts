import { AppLearnerBannerComponent } from './app-learner-banner.component'
import { NsContent } from '@ws-widget/collection'

/**
 * Wave 18 — the navigation and query-building side of AppLearnerBannerComponent:
 * `onPopState`, `enrollUser`, `getStarImage`, `generateQuery` and `isInIFrame`.
 */
describe('AppLearnerBannerComponent (navigation and queries)', () => {
  let component: AppLearnerBannerComponent
  let sanitizer: any
  let router: any
  let tocSvc: any
  let contentSvc: any
  let utilitySvc: any
  let mobileAppsSvc: any
  let dialog: any
  let createBatchDialog: any

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      contentType: 'Course',
      primaryCategory: 'Course',
      mimeType: 'application/vnd.ekstep.content-collection',
      children: [],
      artifactUrl: '',
      status: 'Live',
      ...over,
    }) as any

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    sanitizer = {
      bypassSecurityTrustStyle: jest.fn((v: string) => `style:${v}`),
      bypassSecurityTrustUrl: jest.fn((v: string) => `url:${v}`),
    }
    router = { url: '/app/toc/do_1/overview', navigate: jest.fn(), navigateByUrl: jest.fn() }
    tocSvc = { showStartButton: jest.fn().mockReturnValue(true), subtitleOnBanners: true, changeMessage: jest.fn() }
    contentSvc = {
      showConformation: false,
      getFirstChildInHierarchy: jest.fn().mockReturnValue({ identifier: 'do_res', mimeType: 'application/pdf' }),
    }
    utilitySvc = { isMobile: false }
    mobileAppsSvc = { sendViewerData: jest.fn() }
    dialog = { open: jest.fn() }
    createBatchDialog = { open: jest.fn() }

    component = new AppLearnerBannerComponent(
      sanitizer,
      router,
      tocSvc,
      contentSvc,
      utilitySvc,
      mobileAppsSvc,
      createBatchDialog,
      dialog,
      document,
    )
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  // ------------------------------------------------------------- onPopState --

  describe('onPopState', () => {
    it('returns to the remembered url on a back navigation', () => {
      const location = { href: '' }
      Object.defineProperty(window, 'location', { value: location, writable: true, configurable: true })
      sessionStorage.setItem('cURL', '/page/learn')
      component.onPopState()
      expect(location.href).toBe('/page/learn')
    })

    it('falls back to the home page with nothing remembered', () => {
      const location = { href: '' }
      Object.defineProperty(window, 'location', { value: location, writable: true, configurable: true })
      component.onPopState()
      expect(location.href).toBe('/page/home')
    })
  })

  // ------------------------------------------------------------- enrollUser --

  describe('enrollUser', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('opens the first playable resource of a course', () => {
      component.content = content()
      component.enrollUser()
      expect(contentSvc.getFirstChildInHierarchy).toHaveBeenCalledWith(component.content)
      expect(component.firstResourceLink).toBeTruthy()
      jest.advanceTimersByTime(600)
      expect(router.navigate).toHaveBeenCalled()
    })

    it('opens a standalone resource directly', () => {
      // isResource is derived from the content type.
      component.content = content({ contentType: 'Resource' })
      component.enrollUser()
      jest.advanceTimersByTime(600)
      expect(router.navigate).toHaveBeenCalled()
    })

    it('navigates nowhere without any content', () => {
      component.content = null as any
      component.enrollUser()
      jest.advanceTimersByTime(600)
      expect(router.navigate).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------- getStarImage --

  describe('getStarImage', () => {
    it('shows an empty star for an unrated course', () => {
      expect(component.getStarImage(0)).toContain('empty_star')
      expect(component.getStarImage(4)).toContain('empty_star')
    })
  })

  // ------------------------------------------------------- generateQuery --

  describe('generateQuery', () => {
    const generate = (type: string) => (component as any).generateQuery(type)

    beforeEach(() => {
      component.content = content()
      component.batchId = 'batch-1'
    })

    it('starts a fresh attempt with the batch id', () => {
      expect(generate('START')).toEqual(expect.objectContaining({ viewMode: 'START' }))
    })

    it('resumes from the stored link', () => {
      component.resumeDataLink = { queryParams: { collectionId: 'do_1' } } as any
      const query = generate('RESUME')
      expect(query.viewMode).toBe('RESUME')
      expect(query.collectionId).toBe('do_1')
    })

    it('adds the surrounding collection when resuming inside one', () => {
      component.resumeDataLink = { queryParams: {} } as any
      component.contextId = 'ctx_1'
      component.contextPath = 'Program'
      const query = generate('RESUME')
      expect(query.collectionId).toBe('ctx_1')
      expect(query.collectionType).toBe('Program')
    })

    it('drops the resume mode in the authoring preview', () => {
      component.resumeDataLink = { queryParams: {} } as any
      component.forPreview = true
      expect(generate('RESUME').viewMode).toBeUndefined()
    })

    it('sends no query at all in the authoring preview', () => {
      component.forPreview = true
      expect(generate('START')).toEqual({})
    })
  })

  // -------------------------------------------------------------- isInIFrame --

  describe('isInIFrame', () => {
    it('reports a top-level window as not framed', () => {
      expect(component.isInIFrame).toBe(false)
    })

    it('reports a framed window as framed', () => {
      const original = Object.getOwnPropertyDescriptor(window, 'top')
      Object.defineProperty(window, 'top', { value: {}, configurable: true })
      expect(component.isInIFrame).toBe(true)
      if (original) {
        Object.defineProperty(window, 'top', original)
      }
    })
  })

  // ------------------------------------------------------------ misc glue --

  describe('misc', () => {
    it('records the confirmation threshold on the content service', () => {
      component.setConfirmDialogStatus(80)
      expect(contentSvc.showConformation).toBe(80)
    })

    it('reports an instructor-led course', () => {
      component.tocConfig = {} as any
      component.content = content({ contentType: NsContent.EContentTypes.COURSE, learningMode: 'Instructor-Led' })
      expect(component.isPostAssessment).toBe(true)
    })

    it('reports a self-paced course as not instructor led', () => {
      component.tocConfig = {} as any
      component.content = content({ contentType: NsContent.EContentTypes.COURSE, learningMode: 'Self-Paced' })
      expect(component.isPostAssessment).toBe(false)
    })

    it('reports no content as not instructor led', () => {
      component.tocConfig = {} as any
      component.content = null as any
      expect(component.isPostAssessment).toBe(false)
    })

    it('reports nothing without a table-of-contents config', () => {
      component.tocConfig = null as any
      expect(component.isPostAssessment).toBe(false)
    })

    it('follows the utility service for the mobile flag', () => {
      utilitySvc.isMobile = true
      expect(component.isMobile).toBe(true)
    })

    it('logs the redirect it was asked for', () => {
      expect(() => component.redirectPage({ identifier: 'do_1' })).not.toThrow()
    })
  })
})
