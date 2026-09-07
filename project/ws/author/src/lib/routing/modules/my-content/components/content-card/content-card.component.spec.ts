import { of, Subject } from 'rxjs'
import { ContentCardComponent } from './content-card.component'

describe('ContentCardComponent', () => {
  let component: ContentCardComponent
  let accessService: any
  let authInitService: any
  let router: any
  let editorService: any
  let dialog: any
  let loader: any
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const card = (over: any = {}) => ({
    identifier: 'do_1',
    status: 'Draft',
    reviewStatus: 'InReview',
    appIcon: '',
    ...over,
  })

  const ordinals = () => ({
    subTitles: [
      { srclang: 'en', label: 'English' },
      { srclang: 'hi', label: 'Hindi' },
    ],
  })

  const build = () => {
    const c = new ContentCardComponent(accessService, authInitService, router, editorService, dialog, loader)
    c.data = card()
    c.ordinals = ordinals()
    return c
  }

  beforeEach(() => {
    afterClosed = new Subject<any>()
    accessService = {
      userId: 'u1',
      defaultLogo: 'logo.png',
      hasRole: jest.fn().mockReturnValue(false),
      hasAccess: jest.fn().mockReturnValue(true),
    }
    authInitService = { editCourse: jest.fn() }
    router = { url: '/author/my-content?status=draft', navigateByUrl: jest.fn() }
    editorService = {
      readContentV2: jest.fn().mockReturnValue(of({ versionKey: 'vk1' })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      getBatchforCert: jest.fn().mockReturnValue(of([])),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    loader = { changeLoad: { next: jest.fn() } }

    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('falls back to the placeholder thumbnail', () => {
      component.ngOnInit()
      expect(component.data.appIcon).toBe('cbp-assets/icons/default.png')
    })

    it('keeps an uploaded thumbnail', () => {
      component.data = card({ appIcon: 'mine.png' })
      component.ngOnInit()
      expect(component.data.appIcon).toBe('mine.png')
    })

    it('skips the thumbnail fallback for self-assessment cards', () => {
      component.hideThumbnail = true
      component.ngOnInit()
      expect(component.data.appIcon).toBe('')
    })

    it('flags a reviewer or publisher', () => {
      accessService.hasRole.mockReturnValue(true)
      component.ngOnInit()
      expect(component.isReviewerOrPublisher).toBe(true)
    })

    it('leaves the reviewer flag false for a plain creator', () => {
      component.ngOnInit()
      expect(component.isReviewerOrPublisher).toBe(false)
    })

    it('flags the published page from the route', () => {
      router.url = '/author/my-content?status=published'
      const c = build()
      c.ngOnInit()
      expect(c.pageName).toBe(true)
    })

    it('records the signed-in user', () => {
      component.ngOnInit()
      expect(component.userId).toBe('u1')
    })

    it('offers every language when the course has no translations', () => {
      component.ngOnInit()
      expect(component.filteredSubTitles).toEqual(ordinals().subTitles)
      expect(component.isBaseContent).toBe(true)
    })

    it('hides the languages already translated', () => {
      component.data = card({ hasTranslations: [{ locale: 'hi' }] })
      component.ngOnInit()
      expect(component.filteredSubTitles.map(s => s.srclang)).toEqual(['en'])
    })

    it('marks a translation as not the base content', () => {
      component.data = card({ isTranslationOf: [{ locale: 'en' }] })
      component.ngOnInit()
      expect(component.isBaseContent).toBe(false)
      expect(component.filteredSubTitles.map(s => s.srclang)).toEqual(['hi'])
    })
  })

  describe('status labels', () => {
    const withStatus = (over: any = {}) => {
      component.data = card(over)
      component.getCourseStatusName()
      return component.CourseStatusName
    }

    it('labels a rejected course as For Revision', () => {
      expect(withStatus({ status: 'Draft', prevStatus: 'Review' })).toBe('For Revision')
    })

    it('labels a plain draft', () => {
      expect(withStatus({ status: 'Draft' })).toBe('Draft')
    })

    it('labels a course under review for the author', () => {
      expect(withStatus({ status: 'Review' })).toBe('Sent for review')
    })

    it('labels a course under review as reviewed for a publisher', () => {
      accessService.hasRole.mockReturnValue(true)
      expect(withStatus({ status: 'Review' })).toBe('Reviewed')
    })

    it('labels reviewed and in-review courses', () => {
      expect(withStatus({ status: 'Reviewed' })).toBe('Reviewed')
      expect(withStatus({ status: 'InReview' })).toBe('Reviewed')
    })

    it('labels a live course as published', () => {
      expect(withStatus({ status: 'Live' })).toBe('Published')
    })

    it('labels a retired course', () => {
      expect(withStatus({ status: 'Retired' })).toBe('Retired')
    })

    it('leaves the label empty for an unknown status', () => {
      expect(withStatus({ status: 'Nope' })).toBe('')
    })

    it('isForRevision only matches a draft rejected from review', () => {
      component.data = card({ status: 'Draft', prevStatus: 'Review' })
      expect(component.isForRevision).toBe(true)
      component.data = card({ status: 'Draft', prevStatus: 'Draft' })
      expect(component.isForRevision).toBe(false)
    })
  })

  describe('getStatusClass', () => {
    it('uses the revision class for a rejected course', () => {
      component.data = card({ status: 'Draft', prevStatus: 'Review' })
      expect(component.getStatusClass()).toBe('status-revision')
    })

    it('uses the reviewed class for a publisher looking at a review', () => {
      accessService.hasRole.mockReturnValue(true)
      component.data = card({ status: 'Review' })
      expect(component.getStatusClass()).toBe('status-reviewed')
    })

    it('derives the class from the status otherwise', () => {
      component.data = card({ status: 'Live' })
      expect(component.getStatusClass()).toBe('status-live')
    })

    it('falls back to draft when the status is missing', () => {
      component.data = card({ status: undefined })
      expect(component.getStatusClass()).toBe('status-draft')
    })
  })

  describe('getCourseCompetency', () => {
    beforeEach(() => {
      component.competencyData = [{ entityId: 'c1', code: 'C1', name: 'Comms' }]
    })

    it('resolves each competency against the entity list', () => {
      component.data = card({ competencies_v1: [{ competencyId: 'c1', competencyName: 'Old' }] })
      component.getCourseCompetency()
      expect(component.addedCompetency).toEqual([{ competencyId: 'c1', competencyName: 'Old', code: 'C1', name: 'Comms' }])
    })

    it('parses a stringified competency list', () => {
      component.data = card({ competencies_v1: JSON.stringify([{ competencyId: 'c1' }]) })
      component.getCourseCompetency()
      expect(component.addedCompetency[0].code).toBe('C1')
    })

    it('wraps a single competency object into a list', () => {
      component.data = card({ competencies_v1: { competencyId: 'c1', length: 1 } })
      component.getCourseCompetency()
      expect(component.addedCompetency.length).toBe(1)
    })

    it('keeps the stored name when the entity is unknown', () => {
      component.data = card({ competencies_v1: [{ competencyId: 'c9', competencyName: 'Other' }] })
      component.getCourseCompetency()
      expect(component.addedCompetency[0].name).toBe('Other')
      expect(component.addedCompetency[0].code).toBeUndefined()
    })

    it('drops entries with no competency id', () => {
      component.data = card({ competencies_v1: [{ competencyName: 'Nameless' }] })
      component.getCourseCompetency()
      expect(component.addedCompetency).toEqual([])
    })

    it('yields an empty list when the course has none', () => {
      component.data = card({ competencies_v1: [] })
      component.getCourseCompetency()
      expect(component.addedCompetency).toEqual([])
    })

    it('yields an empty list for malformed JSON', () => {
      component.data = card({ competencies_v1: 'not json' })
      component.getCourseCompetency()
      expect(component.addedCompetency).toEqual([])
    })

    it('ngOnChanges recomputes when the entity list arrives', () => {
      component.data = card({ competencies_v1: [{ competencyId: 'c1' }] })
      component.ngOnChanges({ competencyData: {} } as any)
      expect(component.addedCompetency.length).toBe(1)
    })

    it('ngOnChanges ignores unrelated changes', () => {
      component.ngOnChanges({ data: {} } as any)
      expect(component.addedCompetency).toBeUndefined()
    })
  })

  describe('getName', () => {
    it('resolves the display label for a known language', () => {
      expect(component.getName('hi')).toBe('Hindi')
    })

    it('falls back to the raw code for an unknown language', () => {
      expect(component.getName('ta')).toBe('ta')
    })
  })

  describe('showMenuItem', () => {
    const withData = (over: any = {}) => {
      component.data = card(over)
      return component
    }

    it('allows edit and delete for draft or live content', () => {
      expect(withData({ status: 'Draft' }).showMenuItem('edit')).toBe(true)
      expect(withData({ status: 'Live' }).showMenuItem('delete')).toBe(true)
    })

    it('refuses edit and delete for other statuses', () => {
      expect(withData({ status: 'InReview' }).showMenuItem('edit')).toBe(false)
    })

    it('refuses edit when authoring is disabled', () => {
      expect(withData({ status: 'Draft', authoringDisabled: true }).showMenuItem('edit')).toBe(false)
    })

    it('still allows delete when authoring is disabled', () => {
      expect(withData({ status: 'Draft', authoringDisabled: true }).showMenuItem('delete')).toBe(true)
    })

    it('allows moveToDraft from the reworkable statuses', () => {
      ;['InReview', 'Unpublished', 'Reviewed', 'QualityReview', 'Draft'].forEach(status => {
        expect(withData({ status }).showMenuItem('moveToDraft')).toBe(true)
      })
    })

    it('refuses moveToDraft from a live course', () => {
      expect(withData({ status: 'Live' }).showMenuItem('moveToDraft')).toBe(false)
    })

    it('allows moveToInReview from the reviewed statuses', () => {
      expect(withData({ status: 'Reviewed' }).showMenuItem('moveToInReview')).toBe(true)
      expect(withData({ status: 'QualityReview' }).showMenuItem('moveToInReview')).toBe(true)
      expect(withData({ status: 'Draft' }).showMenuItem('moveToInReview')).toBe(false)
    })

    it('allows publish only for reviewed content under review', () => {
      expect(withData({ status: 'Review', reviewStatus: 'Reviewed' }).showMenuItem('publish')).toBe(true)
      expect(withData({ status: 'Review', reviewStatus: 'InReview' }).showMenuItem('publish')).toBe(false)
    })

    it('allows unpublish only for live content', () => {
      expect(withData({ status: 'Live' }).showMenuItem('unpublish')).toBe(true)
      expect(withData({ status: 'Draft' }).showMenuItem('unpublish')).toBe(false)
    })

    it('allows review only for content awaiting review', () => {
      expect(withData({ status: 'Review', reviewStatus: 'InReview' }).showMenuItem('review')).toBe(true)
      expect(withData({ status: 'Draft' }).showMenuItem('review')).toBe(false)
    })

    it('allows preview for both review states', () => {
      expect(withData({ status: 'Review', reviewStatus: 'InReview' }).showMenuItem('preview')).toBe(true)
      expect(withData({ status: 'Review', reviewStatus: 'Reviewed' }).showMenuItem('preview')).toBe(true)
      expect(withData({ status: 'Draft' }).showMenuItem('preview')).toBe(false)
    })

    it('gates the language menu on draft access', () => {
      expect(withData().showMenuItem('lang')).toBe(true)
      accessService.hasAccess.mockReturnValue(false)
      expect(withData().showMenuItem('lang')).toBe(false)
    })

    it('refuses an unknown menu item', () => {
      expect(withData().showMenuItem('whatever')).toBe(false)
    })
  })

  describe('emitted actions', () => {
    it('create emits the target locale alongside the card data', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)
      component.create('hi')
      expect(spy).toHaveBeenCalledWith({ type: 'create', data: { ...component.data, locale: 'hi' } })
    })

    it('viewComments emits the comments action', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)
      component.viewComments()
      expect(spy).toHaveBeenCalledWith({ type: 'comments' })
    })

    it('takeAction relays the action with the card data', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)
      component.takeAction('delete')
      expect(spy).toHaveBeenCalledWith({ type: 'delete', data: component.data })
    })
  })

  describe('editCourse', () => {
    it('opens the editor directly for a draft', () => {
      component.editCourse('edit', card())
      expect(editorService.readContentV2).not.toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_1')
      expect(authInitService.editCourse).toHaveBeenCalledWith('edit')
    })

    it('bumps the version key before editing a live course', () => {
      component.editCourse('edit', card({ status: 'Live' }))
      expect(editorService.readContentV2).toHaveBeenCalledWith('do_1')
      expect(editorService.updateNewContentV3).toHaveBeenCalledWith({ request: { content: { versionKey: 'vk1' } } }, 'do_1')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_1')
    })

    it('does not open the editor when the version bump fails', () => {
      editorService.updateNewContentV3.mockReturnValue(of({ params: { status: 'failed' } }))
      component.editCourse('edit', card({ status: 'Live' }))
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })
  })

  describe('uploadCertificate', () => {
    it('opens the upload dialog when the course has no certificate', () => {
      component.uploadCertificate(card())
      expect(editorService.getBatchforCert).toHaveBeenCalled()
      expect(dialog.open).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      afterClosed.next(true)
    })

    it('filters the batches by course and open statuses', () => {
      component.uploadCertificate(card())
      expect(editorService.getBatchforCert).toHaveBeenCalledWith({
        request: {
          filters: { courseId: 'do_1', status: ['0', '1', '2'] },
          sort_by: { createdDate: 'desc' },
        },
      })
    })

    it('explains that a certificate is already assigned', () => {
      editorService.getBatchforCert.mockReturnValue(of([{ cert_templates: { t1: {} } }]))
      component.uploadCertificate(card())
      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: expect.objectContaining({ cert_upload: 'Yes' }) }),
      )
    })

    it('opens nothing when the batch reports an empty template map', () => {
      editorService.getBatchforCert.mockReturnValue(of([{ cert_templates: {} }]))
      component.uploadCertificate(card())
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  it('changeToDefaultImg swaps in the configured fallback logo', () => {
    const target = { src: 'broken.png' }
    component.changeToDefaultImg({ target })
    expect(target.src).toBe('logo.png')
  })

  it('changeToDefaultImg falls back to the bundled placeholder', () => {
    accessService.defaultLogo = ''
    const target = { src: 'broken.png' }
    component.changeToDefaultImg({ target })
    expect(target.src).toBe('cbp-assets/icons/default.png')
  })
})
