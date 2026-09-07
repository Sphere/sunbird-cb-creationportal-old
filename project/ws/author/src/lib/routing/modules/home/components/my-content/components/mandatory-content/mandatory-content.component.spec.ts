import { FormControl, FormGroup } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { MandatoryContentComponent } from './mandatory-content.component'

describe('MandatoryContentComponent', () => {
  let component: MandatoryContentComponent
  let myContSvc: any
  let activatedRoute: any
  let router: any
  let loadService: any
  let accessService: any
  let snackBar: any
  let dialog: any
  let authInitService: any
  let valueSvc: any
  let dataService: any
  let myTocService: any
  let queryParams: Subject<any>
  let afterClosed: Subject<any>

  const contentMeta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      contentType: 'Course',
      categoryType: 'Course',
      status: 'Live',
      locale: 'en',
      duration: 120,
      lastUpdatedOn: '2026-01-01',
      mimeType: 'application/vnd.ekstep.content-collection',
      ...over,
    }) as any

  const build = () =>
    new MandatoryContentComponent(
      myContSvc,
      activatedRoute,
      router,
      loadService,
      accessService,
      snackBar,
      dialog,
      authInitService,
      valueSvc,
      dataService,
      myTocService,
    )

  beforeEach(() => {
    queryParams = new Subject<any>()
    afterClosed = new Subject<any>()
    myContSvc = {
      readContent: jest.fn().mockReturnValue(of(contentMeta())),
      deleteContent: jest.fn().mockReturnValue(of({})),
      restoreContent: jest.fn().mockReturnValue(of({})),
      createInAnotherLanguage: jest.fn().mockReturnValue(of('do_new')),
      upPublishOrDraft: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({})),
    }
    activatedRoute = { queryParams: queryParams.asObservable() }
    router = { navigateByUrl: jest.fn() }
    loadService = { changeLoad: { next: jest.fn() } }
    accessService = {
      hasRole: jest.fn().mockReturnValue(false),
      authoringConfig: { newDesign: true },
    }
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    authInitService = { ordinals: { subTitles: ['en', 'hi'] } }
    valueSvc = { isLtMedium$: of(false) }
    dataService = { initData: jest.fn() }
    myTocService = { getTocStructure: jest.fn().mockImplementation((_c: any, s: any) => s) }

    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  it('resolves the admin flag on construction', () => {
    accessService.hasRole.mockReturnValue(true)
    expect(build().isAdmin).toBe(true)
  })

  describe('ngOnInit', () => {
    it('seeds pagination, design flag and ordinals', () => {
      component.ngOnInit()
      expect(component.pagination).toEqual({ offset: 0, limit: 24 })
      expect(component.newDesign).toBe(true)
      expect(component.allLanguages).toEqual(['en', 'hi'])
    })

    it('defaults to the published status when the route carries none', () => {
      component.ngOnInit()
      queryParams.next({})
      expect(component.status).toBe('published')
      expect(component.currentAction).toBe('author')
    })

    it('adopts the status from the route and switches the action', () => {
      component.ngOnInit()
      queryParams.next({ status: 'expiry' })
      expect(component.status).toBe('expiry')
      expect(component.currentAction).toBe('expiry')
    })

    it('falls back to an empty language list when there are no subtitles', () => {
      authInitService.ordinals = {}
      const c = build()
      c.ngOnInit()
      expect(c.allLanguages).toEqual([])
    })
  })

  describe('fetchStatus', () => {
    const cases: Array<[string, string[]]> = [
      ['draft', ['Draft']],
      ['rejected', ['Draft']],
      ['inreview', ['InReview', 'Reviewed', 'QualityReview']],
      ['review', ['InReview']],
      ['published', ['Live']],
      ['expiry', ['Live']],
      ['publish', ['Reviewed']],
      ['processing', ['Processing']],
      ['unpublished', ['Unpublished']],
      ['deleted', ['Deleted']],
      ['anything-else', ['Draft']],
    ]

    cases.forEach(([status, expected]) => {
      it(`maps "${status}" to ${expected.join('/')}`, () => {
        component.status = status
        expect(component.fetchStatus()).toEqual(expected)
      })
    })
  })

  describe('setAction', () => {
    it('uses the author action for the authoring statuses', () => {
      component.status = 'draft'
      component.setAction()
      expect(component.currentAction).toBe('author')
    })

    it('uses the expiry action for the expiry status', () => {
      component.status = 'expiry'
      component.setAction()
      expect(component.currentAction).toBe('expiry')
    })

    it('leaves the action untouched for an unknown status', () => {
      component.currentAction = 'deleted'
      component.status = 'unknown'
      component.setAction()
      expect(component.currentAction).toBe('deleted')
    })
  })

  describe('fetchContent', () => {
    it('reads the content and seeds the local data and toc structure', () => {
      component.contentId = 'do_1'
      component.fetchContent()
      expect(myContSvc.readContent).toHaveBeenCalledWith('do_1')
      expect(dataService.initData).toHaveBeenCalled()
      expect(component.tocStructure).toBeTruthy()
    })

    it('does nothing without a content id', () => {
      component.fetchContent()
      expect(myContSvc.readContent).not.toHaveBeenCalled()
    })
  })

  describe('resetAndFetchTocStructure', () => {
    it('resets every counter to zero without content', () => {
      component.resetAndFetchTocStructure()
      expect(component.tocStructure).toEqual({
        assessment: 0,
        course: 0,
        handsOn: 0,
        interactiveVideo: 0,
        learningModule: 0,
        other: 0,
        pdf: 0,
        podcast: 0,
        quiz: 0,
        video: 0,
        webModule: 0,
        webPage: 0,
        youtube: 0,
      })
    })

    it('discounts the course itself from the course count', () => {
      component.content = contentMeta({ contentType: 'Course' })
      component.resetAndFetchTocStructure()
      expect(component.tocStructure!.course).toBe(-1)
      expect(component.tocStructure!.learningModule).toBe(0)
    })

    it('discounts a collection from the learning-module count', () => {
      component.content = contentMeta({ contentType: 'Collection' })
      component.resetAndFetchTocStructure()
      expect(component.tocStructure!.learningModule).toBe(-1)
      expect(myTocService.getTocStructure).toHaveBeenCalled()
    })
  })

  describe('getGlanceData', () => {
    beforeEach(() => {
      component.contentId = 'do_1'
      component.content = contentMeta()
      component.resetAndFetchTocStructure()
    })

    it('builds the at-a-glance payload', () => {
      const data = component.getGlanceData()!
      expect(data.displayName).toBe('At a glance')
      expect(data.buttonName).toBe('Start now')
      expect(data.contentId).toBe('do_1')
      expect(data.contentType).toBe('Course')
      expect(data.cost).toBe('Free')
      expect(data.duration).toBe('120')
      expect(data.counts).toBe(component.tocStructure)
    })

    it('marks exclusive content as paid', () => {
      component.content = contentMeta({ exclusiveContent: true })
      expect(component.getGlanceData()!.cost).toBe('Paid')
    })

    it('returns null without a content id', () => {
      component.contentId = undefined as any
      expect(component.getGlanceData()).toBeNull()
    })

    it('returns null before the toc structure is built', () => {
      component.tocStructure = null
      expect(component.getGlanceData()).toBeNull()
    })
  })

  describe('getAuthors', () => {
    it('lists authors before curators', () => {
      component.content = contentMeta({
        creatorDetails: [{ name: 'Ann' }],
        creatorContacts: [{ name: 'Bob' }],
      })
      expect(component.getAuthors()).toEqual([
        { name: 'Ann', authorType: 'Author' },
        { name: 'Bob', authorType: 'Curator' },
      ])
    })

    it('returns an empty list when the content has no people', () => {
      component.content = contentMeta()
      expect(component.getAuthors()).toEqual([])
    })

    it('returns an empty list before the content loads', () => {
      expect(component.getAuthors()).toEqual([])
    })
  })

  describe('deleteContent', () => {
    it('drops the deleted card and confirms', () => {
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }]
      component.deleteContent(contentMeta())
      expect(myContSvc.deleteContent).toHaveBeenCalledWith('do_1', false)
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('flags a Knowledge Board delete', () => {
      component.deleteContent(contentMeta({ contentType: 'Knowledge Board' }))
      expect(myContSvc.deleteContent).toHaveBeenCalledWith('do_1', true)
    })

    it('opens the error parser on a 409 conflict', () => {
      myContSvc.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: 'in use' })))
      component.deleteContent(contentMeta())
      expect(dialog.open).toHaveBeenCalled()
      expect(loadService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('only notifies on a non-conflict failure', () => {
      myContSvc.deleteContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.deleteContent(contentMeta())
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('restoreContent', () => {
    it('drops the restored card and confirms', () => {
      component.cardContent = [{ identifier: 'do_1' }]
      component.restoreContent(contentMeta())
      expect(myContSvc.restoreContent).toHaveBeenCalledWith('do_1')
      expect(component.cardContent).toEqual([])
    })

    it('opens the error parser on a 409 conflict', () => {
      myContSvc.restoreContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.restoreContent(contentMeta())
      expect(dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict failure', () => {
      myContSvc.restoreContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.restoreContent(contentMeta())
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('createContent', () => {
    it('navigates to the editor for the new translation', () => {
      component.createContent(contentMeta())
      expect(myContSvc.createInAnotherLanguage).toHaveBeenCalledWith('do_1', 'en')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_new')
    })

    it('opens the error parser on a 409 conflict', () => {
      myContSvc.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.createContent(contentMeta())
      expect(dialog.open).toHaveBeenCalled()
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })

    it('only notifies on a non-conflict failure', () => {
      myContSvc.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 500 })))
      component.createContent(contentMeta())
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('unPublishOrDraft', () => {
    it('unpublishes live content', () => {
      component.cardContent = [{ identifier: 'do_1' }]
      component.unPublishOrDraft(contentMeta())
      expect(myContSvc.upPublishOrDraft).toHaveBeenCalledWith('do_1', true)
      expect(component.cardContent).toEqual([])
    })

    it('moves already-unpublished content back to draft', () => {
      component.unPublishOrDraft(contentMeta({ status: 'Unpublished' }))
      expect(myContSvc.upPublishOrDraft).toHaveBeenCalledWith('do_1', false)
    })

    it('opens the error parser on a 409 conflict', () => {
      myContSvc.upPublishOrDraft.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.unPublishOrDraft(contentMeta())
      expect(dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict failure', () => {
      myContSvc.upPublishOrDraft.mockReturnValue(throwError(() => ({ status: 500 })))
      component.unPublishOrDraft(contentMeta())
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('confirmAction', () => {
    it('asks before deleting and then deletes', () => {
      const spy = jest.spyOn(component, 'deleteContent').mockImplementation(() => {})
      component.confirmAction({ type: 'delete', data: contentMeta() })
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('does nothing when the confirmation is dismissed', () => {
      const spy = jest.spyOn(component, 'deleteContent').mockImplementation(() => {})
      component.confirmAction({ type: 'delete', data: contentMeta() })
      afterClosed.next(false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('asks before restoring and then restores', () => {
      const spy = jest.spyOn(component, 'restoreContent').mockImplementation(() => {})
      component.confirmAction({ type: 'restoreDeleted', data: contentMeta() })
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('asks before unpublishing and then unpublishes', () => {
      const spy = jest.spyOn(component, 'unPublishOrDraft').mockImplementation(() => {})
      component.confirmAction({ type: 'unpublish', data: contentMeta() })
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('uses the parent message when retrieving a collection', () => {
      component.confirmAction({ type: 'moveToDraft', data: contentMeta() })
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'retrieveParent' }))
    })

    it('uses the child message when retrieving a resource', () => {
      component.confirmAction({ type: 'moveToDraft', data: contentMeta({ mimeType: 'application/pdf' }) })
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'retrieveChild' }))
    })

    it('routes an unpublished moveToDraft through unPublishOrDraft', () => {
      const spy = jest.spyOn(component, 'unPublishOrDraft').mockImplementation(() => {})
      component.confirmAction({ type: 'moveToDraft', data: contentMeta({ status: 'Unpublished' }) })
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('collects comments for a confirmed review move', () => {
      const spy = jest.spyOn(component, 'forwardBackward').mockImplementation(() => {})
      component.confirmAction({ type: 'moveToInReview', data: contentMeta() })
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('goes straight to the comments dialog for an unrecognised type', () => {
      const spy = jest.spyOn(component, 'forwardBackward').mockImplementation(() => {})
      component.confirmAction({ type: 'somethingElse', data: contentMeta() })
      expect(spy).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('forwardBackward and finalCall', () => {
    const commentsForm = () => new FormGroup({ comments: new FormControl('looks good') })

    it('submits the collected comment', () => {
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.forwardBackward({ type: 'moveToDraft', data: contentMeta() })
      afterClosed.next(commentsForm())
      expect(spy).toHaveBeenCalled()
    })

    it('does nothing when the comments dialog is cancelled', () => {
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.forwardBackward({ type: 'moveToDraft', data: contentMeta() })
      afterClosed.next(null)
      expect(spy).not.toHaveBeenCalled()
    })

    it('sends operation 0 when moving to draft', () => {
      component.finalCall(commentsForm(), { type: 'moveToDraft', data: contentMeta() })
      expect(myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'looks good', operation: 0 }, 'do_1', 'Live')
    })

    it('sends operation -1 when moving to review', () => {
      component.finalCall(commentsForm(), { type: 'moveToInReview', data: contentMeta() })
      expect(myContSvc.forwardBackward).toHaveBeenCalledWith({ comment: 'looks good', operation: -1 }, 'do_1', 'Live')
    })

    it('drops the moved card on success', () => {
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }]
      component.finalCall(commentsForm(), { type: 'moveToDraft', data: contentMeta() })
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
    })

    it('opens the error parser on a 409 conflict', () => {
      myContSvc.forwardBackward.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.finalCall(commentsForm(), { type: 'moveToDraft', data: contentMeta() })
      expect(dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict failure', () => {
      myContSvc.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalCall(commentsForm(), { type: 'moveToDraft', data: contentMeta() })
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('does nothing without a comments form', () => {
      component.finalCall(null as any, { type: 'moveToDraft', data: contentMeta() })
      expect(myContSvc.forwardBackward).not.toHaveBeenCalled()
    })
  })

  describe('action dispatch', () => {
    it('routes a create request', () => {
      const spy = jest.spyOn(component, 'createContent').mockImplementation(() => {})
      component.action({ type: 'create', data: contentMeta() })
      expect(spy).toHaveBeenCalled()
    })

    it('opens the editor for review, publish and edit', () => {
      ;['review', 'publish', 'edit'].forEach(type => {
        router.navigateByUrl.mockClear()
        component.action({ type, data: contentMeta() })
        expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_1')
      })
    })

    it('drops the card on a remove request', () => {
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }]
      component.action({ type: 'remove', data: contentMeta() })
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
    })

    it('routes the confirmable actions through confirmAction', () => {
      const spy = jest.spyOn(component, 'confirmAction').mockImplementation(() => {})
      ;['moveToInReview', 'moveToDraft', 'delete', 'unpublish', 'restoreDeleted'].forEach(type => {
        spy.mockClear()
        component.action({ type, data: contentMeta() })
        expect(spy).toHaveBeenCalled()
      })
    })

    it('routes an expiry extension', () => {
      const spy = jest.spyOn(component, 'actionOnExpiry').mockImplementation(() => {})
      component.action({ type: 'expiryExtend', data: contentMeta() })
      expect(spy).toHaveBeenCalled()
    })

    it('ignores an unknown action', () => {
      expect(() => component.action({ type: 'noop', data: contentMeta() })).not.toThrow()
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })
  })

  describe('actionOnExpiry', () => {
    it('drops the card once the author extends the expiry', () => {
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }]
      component.actionOnExpiry(contentMeta())
      afterClosed.next({ isExtend: true, expiryDate: '2030-01-01' })
      expect(component.cardContent).toEqual([{ identifier: 'do_2' }])
    })

    it('keeps the card when the dialog is dismissed', () => {
      component.cardContent = [{ identifier: 'do_1' }]
      component.actionOnExpiry(contentMeta())
      afterClosed.next(undefined)
      expect(component.cardContent).toEqual([{ identifier: 'do_1' }])
    })
  })

  describe('misc', () => {
    it('changeToDefaultImg swaps in the fallback logo', () => {
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('/assets/instances/eagle/app_logos/default.png')
    })

    it('setCurrentLanguage records the chosen language', () => {
      component.setCurrentLanguage('hi')
      expect(component.searchLanguage).toBe('hi')
    })

    it('actionClick tolerates an empty event', () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => {})
      component.actionClick(null)
      expect(log).not.toHaveBeenCalled()
      component.actionClick({ type: 'x' })
      expect(log).toHaveBeenCalled()
      log.mockRestore()
    })

    it('ngOnDestroy releases subscriptions and hides the loader', () => {
      component.routerSubscription = { unsubscribe: jest.fn() } as any
      ;(component as any).defaultSideNavBarOpenedSubscription = { unsubscribe: jest.fn() }
      component.ngOnDestroy()
      expect(component.routerSubscription.unsubscribe).toHaveBeenCalled()
      expect(loadService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('ngOnDestroy is safe with nothing subscribed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
