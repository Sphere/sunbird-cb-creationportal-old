import { AppLearnerBannerComponent } from './app-learner-banner.component'

/**
 * Heavy component (nine injected collaborators, a large template), so it is
 * exercised directly with mocked collaborators rather than rendered.
 */
describe('AppLearnerBannerComponent', () => {
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
      children: [],
      artifactUrl: '',
      status: 'Live',
      ...over,
    }) as any

  beforeEach(() => {
    sanitizer = {
      bypassSecurityTrustStyle: jest.fn((v: string) => `style:${v}`),
      bypassSecurityTrustUrl: jest.fn((v: string) => `url:${v}`),
    }
    router = { url: '/app/toc/do_1/overview', navigate: jest.fn(), navigateByUrl: jest.fn() }
    tocSvc = {
      showStartButton: jest.fn().mockReturnValue(true),
      subtitleOnBanners: true,
      changeMessage: jest.fn(),
    }
    contentSvc = { showConformation: false }
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

  describe('banner image', () => {
    it('picks the image for the current route on change', () => {
      component.banners = { overview: 'a.png', contents: 'b.png' } as any
      component.ngOnChanges()

      expect(component.routePath).toBe('overview')
      expect(component.bannerUrl).toBe('style:url(a.png)')
    })

    it('follows the route to the contents tab', () => {
      router.url = '/app/toc/do_1/contents'
      component.banners = { overview: 'a.png', contents: 'b.png' } as any
      component.ngOnChanges()

      expect(component.bannerUrl).toBe('style:url(b.png)')
    })

    it('ignores a route it has no banner for', () => {
      router.url = '/app/toc/do_1/analytics'
      component.banners = { overview: 'a.png' } as any
      component.ngOnChanges()

      expect(component.routePath).toBe('overview')
      expect(component.bannerUrl).toBeNull()
    })

    it('does nothing without any banners', () => {
      component.ngOnChanges()

      expect(component.bannerUrl).toBeNull()
    })

    it('sanitises the introductory video icon, and returns nothing without one', () => {
      component.content = content({ introductoryVideoIcon: 'v.png' })
      expect(component.sanitizedIntroductoryVideoIcon).toBe('style:url(v.png)')

      component.content = content()
      expect(component.sanitizedIntroductoryVideoIcon).toBeNull()
    })
  })

  describe('query generation', () => {
    beforeEach(() => {
      component.firstResourceLink = {
        url: '/viewer/do_2',
        queryParams: { primaryCategory: 'Learning Resource' },
      }
      component.resumeDataLink = {
        url: '/viewer/do_3',
        queryParams: { primaryCategory: 'Learning Resource' },
      }
      component.batchData = { content: [{ batchId: 'b1' }, { batchId: 'b2' }] }
    })

    it('carries the first resource params plus the view mode and batch', () => {
      expect(component.generateQuery('START')).toEqual({
        primaryCategory: 'Learning Resource',
        viewMode: 'START',
        batchId: 'b2',
      })
    })

    it('uses the resume link for RESUME', () => {
      expect(component.generateQuery('RESUME')).toMatchObject({ viewMode: 'RESUME', batchId: 'b2' })
    })

    it('adds the collection context when there is one', () => {
      component.contextId = 'do_root'
      component.contextPath = 'Course'

      expect(component.generateQuery('START')).toMatchObject({
        collectionId: 'do_root',
        collectionType: 'Course',
      })
    })

    it('drops the view mode in preview, where there is no progress to record', () => {
      component.forPreview = true

      expect(component.generateQuery('START').viewMode).toBeUndefined()
      expect(component.generateQuery('RESUME').viewMode).toBeUndefined()
    })

    it('falls back to just the batch and mode with no links', () => {
      component.firstResourceLink = null
      component.resumeDataLink = null

      expect(component.generateQuery('START')).toEqual({ batchId: 'b2', viewMode: 'START' })
    })

    it('returns nothing in preview with no links', () => {
      component.firstResourceLink = null
      component.resumeDataLink = null
      component.forPreview = true

      expect(component.generateQuery('START')).toEqual({})
    })

    it('has no batch id when no batches were loaded', () => {
      component.batchData = null
      component.firstResourceLink = null
      component.resumeDataLink = null

      expect(component.generateQuery('START').batchId).toBe('')
    })
  })

  describe('visibility rules', () => {
    it('shows the intranet message on mobile regardless of the flag', () => {
      utilitySvc.isMobile = true

      expect(component.showIntranetMsg).toBe(true)
    })

    it('otherwise defers to the flag', () => {
      component.showIntranetMessage = true
      expect(component.showIntranetMsg).toBe(true)

      component.showIntranetMessage = false
      expect(component.showIntranetMsg).toBe(false)
    })

    it('delegates the start button to the service', () => {
      component.content = content()

      expect(component.showStart).toBe(true)
      expect(tocSvc.showStartButton).toHaveBeenCalledWith(component.content)
    })

    it('hides the action buttons until the status is known', () => {
      component.content = content()
      expect(component.showActionButtons).toBeFalsy()

      component.actionBtnStatus = 'grant'
      expect(component.showActionButtons).toBeTruthy()
    })

    it.each([['Deleted'], ['Expired']])('hides the action buttons for %s content', status => {
      component.actionBtnStatus = 'grant'
      component.content = content({ status })

      expect(component.showActionButtons).toBeFalsy()
    })

    it('hides the button container for an empty course', () => {
      component.actionBtnStatus = 'grant'
      component.content = content({ contentType: 'Course', children: [], artifactUrl: '' })

      expect(component.showButtonContainer).toBeFalsy()
    })

    it('hides the button container for a resource with no file', () => {
      component.actionBtnStatus = 'grant'
      component.content = content({ contentType: 'Resource', artifactUrl: '' })

      expect(component.showButtonContainer).toBeFalsy()
    })

    it('shows the button container for a course that has children', () => {
      component.actionBtnStatus = 'grant'
      component.content = content({ children: [{ identifier: 'do_2' }] })

      expect(component.showButtonContainer).toBeTruthy()
    })

    it('hides the button container on mobile for intranet-only content', () => {
      utilitySvc.isMobile = true
      component.actionBtnStatus = 'grant'
      component.content = content({ children: [{ identifier: 'do_2' }], isInIntranet: true })

      expect(component.showButtonContainer).toBeFalsy()
    })

    it('treats a childless collection as a resource and tells the mobile app', () => {
      component.content = content({ contentType: 'Collection', children: [] })

      expect(component.isResource).toBe(true)
      expect(mobileAppsSvc.sendViewerData).toHaveBeenCalledWith(component.content)
    })

    it('is not a resource when there are children', () => {
      component.content = content({ children: [{ identifier: 'do_2' }] })

      expect(component.isResource).toBe(false)
      expect(mobileAppsSvc.sendViewerData).not.toHaveBeenCalled()
    })

    it('is not a resource with no content at all', () => {
      expect(component.isResource).toBe(false)
    })

    it('hides the header for a resource with no file', () => {
      component.content = content({ contentType: 'Resource', artifactUrl: '' })

      expect(component.isHeaderHidden).toBeTruthy()
    })

    it('shows the instructor-led message only for an empty instructor-led course', () => {
      component.actionBtnStatus = 'grant'
      component.content = content({ learningMode: 'Instructor-Led' })
      expect(component.showInstructorLedMsg).toBeTruthy()

      component.content = content({ learningMode: 'Self-Paced' })
      expect(component.showInstructorLedMsg).toBeFalsy()
    })

    it('is a post assessment only for an instructor-led course with a toc config', () => {
      component.content = content({ learningMode: 'Instructor-Led' })
      expect(component.isPostAssessment).toBe(false)

      component.tocConfig = {}
      expect(component.isPostAssessment).toBe(true)

      component.content = content({ learningMode: 'Self-Paced' })
      expect(component.isPostAssessment).toBe(false)
    })

    it('reads mobile and subtitle flags from their services', () => {
      utilitySvc.isMobile = true
      expect(component.isMobile).toBe(true)
      expect(component.showSubtitleOnBanner).toBe(true)
    })
  })

  describe('tree helpers', () => {
    const tree = [
      {
        identifier: 'do_1',
        contentType: 'Course',
        children: [
          { identifier: 'do_2', contentType: 'Resource', children: [] },
          {
            identifier: 'do_3',
            contentType: 'Resource',
            children: [{ identifier: 'do_4', contentType: 'Assessment', children: [] }],
          },
        ],
      },
    ]

    it('collects the ids of every node of a type, at any depth', () => {
      expect(component.uniqueIdsByContentType(tree, 'Resource')).toEqual(['do_2', 'do_3'])
      expect(component.uniqueIdsByContentType(tree, 'Assessment')).toEqual(['do_4'])
    })

    it('does not repeat an id', () => {
      expect(component.uniqueIdsByContentType([tree[0], tree[0]], 'Resource')).toEqual(['do_2', 'do_3'])
    })

    it('returns nothing for a type that is not present', () => {
      expect(component.uniqueIdsByContentType(tree, 'Podcast')).toEqual([])
    })

    it('finds a node by id at any depth, and null when absent', () => {
      expect(component.findObjectById(tree, 'do_4').identifier).toBe('do_4')
      expect(component.findObjectById(tree, 'do_1').identifier).toBe('do_1')
      expect(component.findObjectById(tree, 'nope')).toBeNull()
    })
  })

  describe('actions', () => {
    it('opens the certificate dialog', () => {
      const c = content()
      component.downloadCertificate(c)

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { content: c, stype: 'DETAILS' } }))
    })

    it('opens the details dialog with the toc config', () => {
      const c = content()
      component.openDetails(c, { a: 1 })

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { content: c, tocConfig: { a: 1 }, type: 'DETAILS' } }),
      )
    })

    it('passes the competency list and language to the competency dialog', () => {
      component.proficiencyList = [{ entityId: '102' }]
      const c = content({ lang: 'hi' })
      component.openCompetency(c)

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: {
            competency: c,
            type: 'COMPETENCY',
            lang: 'hi',
            proficiencyList: [{ entityId: '102' }],
          },
        }),
      )
    })

    it('navigates to the first resource carrying the collection context', () => {
      component.firstResourceLink = { url: '/viewer/do_2', queryParams: {} }
      component.redirectFirstResource({ queryParams: { collectionId: 'do_1', batchId: 'b1' } })

      expect(router.navigateByUrl).toHaveBeenCalledWith(
        '/viewer/do_2?primaryCategory=Learning%20Resource&collectionId=do_1&collectionType=Course&batchId=b1',
      )
    })

    it('goes back out of preview through the service', () => {
      component.redirect()

      expect(tocSvc.changeMessage).toHaveBeenCalledWith('backFromPreview')
    })

    it('opens the org profile and remembers where it came from', () => {
      component.showOrgprofile('org-1')

      expect(sessionStorage.getItem('currentURL')).toBeTruthy()
      expect(router.navigate).toHaveBeenCalledWith(['/app/org-details'], {
        queryParams: { orgId: 'org-1' },
      })
    })

    it('records the confirmation percentage on the content service', () => {
      component.setConfirmDialogStatus(80)

      expect(contentSvc.showConformation).toBe(80)
    })

    it('closes the popup', () => {
      component.displayStyle = 'block'
      component.closePopup()

      expect(component.displayStyle).toBe('none')
    })
  })

  describe('teardown', () => {
    it('releases both subscriptions', () => {
      const a = { unsubscribe: jest.fn() }
      const b = { unsubscribe: jest.fn() }
      component.routerParamSubscription = a as any
      component.routeSubscription = b as any

      component.ngOnDestroy()

      expect(a.unsubscribe).toHaveBeenCalled()
      expect(b.unsubscribe).toHaveBeenCalled()
    })

    it('is safe with nothing subscribed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
