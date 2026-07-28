import { of, throwError, Subject } from 'rxjs'

import { ContentDetailComponent } from './content-detail.component'

function makeDialogRef(result: any) {
  return { afterClosed: () => of(result) }
}

describe('ContentDetailComponent', () => {
  let component: ContentDetailComponent
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
  let queryParams$: Subject<any>

  beforeEach(() => {
    queryParams$ = new Subject<any>()
    myContSvc = {
      readContent: jest.fn().mockReturnValue(of({ identifier: 'do_1', contentType: 'Course' })),
      deleteContent: jest.fn().mockReturnValue(of({})),
      restoreContent: jest.fn().mockReturnValue(of({})),
      createInAnotherLanguage: jest.fn().mockReturnValue(of('do_new')),
      upPublishOrDraft: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({})),
    }
    activatedRoute = {
      queryParams: queryParams$.asObservable(),
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('do_1') } },
    }
    router = { navigateByUrl: jest.fn() }
    loadService = { changeLoad: { next: jest.fn() } }
    accessService = {
      hasRole: jest.fn().mockReturnValue(true),
      authoringConfig: { newDesign: true },
    }
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn().mockReturnValue(makeDialogRef(true)) }
    authInitService = { ordinals: { subTitles: [{ lang: 'en' }] } }
    valueSvc = { isLtMedium$: of(false) }
    dataService = { initData: jest.fn() }
    myTocService = { getTocStructure: jest.fn().mockImplementation((_c, counts) => counts) }

    component = new ContentDetailComponent(
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
  })

  it('is created and evaluates admin role', () => {
    expect(component).toBeTruthy()
    expect(component.isAdmin).toBe(true)
    expect(accessService.hasRole).toHaveBeenCalled()
  })

  it('ngOnInit sets pagination, config and reacts to query params', () => {
    const fetchSpy = jest.spyOn(component, 'fetchContent')
    component.ngOnInit()
    expect(component.pagination).toEqual({ offset: 0, limit: 24 })
    expect(component.newDesign).toBe(true)
    expect(component.allLanguages.length).toBe(1)
    queryParams$.next({ status: 'draft' })
    expect(component.status).toBe('draft')
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('ngOnInit defaults status to published when none provided', () => {
    component.ngOnInit()
    queryParams$.next({})
    expect(component.status).toBe('published')
  })

  it('fetchStatus maps status strings to backend states', () => {
    component.status = 'draft'
    expect(component.fetchStatus()).toEqual(['Draft'])
    component.status = 'inreview'
    expect(component.fetchStatus()).toEqual(['InReview', 'Reviewed', 'QualityReview'])
    component.status = 'published'
    expect(component.fetchStatus()).toEqual(['Live'])
    component.status = 'processing'
    expect(component.fetchStatus()).toEqual(['Processing'])
    component.status = 'deleted'
    expect(component.fetchStatus()).toEqual(['Deleted'])
    component.status = 'unknown'
    expect(component.fetchStatus()).toEqual(['Draft'])
  })

  it('setAction maps status to a current action', () => {
    component.status = 'draft'
    component.setAction()
    expect(component.currentAction).toBe('author')
    component.status = 'expiry'
    component.setAction()
    expect(component.currentAction).toBe('expiry')
  })

  it('fetchContent reads content and initialises the toc structure', () => {
    component.fetchContent()
    expect(component.contentId).toBe('do_1')
    expect(myContSvc.readContent).toHaveBeenCalledWith('do_1')
    expect(dataService.initData).toHaveBeenCalled()
    expect(component.tocStructure).toBeTruthy()
  })

  it('resetAndFetchTocStructure marks a course and delegates to the toc service', () => {
    component.content = { contentType: 'Course' } as any
    component.resetAndFetchTocStructure()
    expect(myTocService.getTocStructure).toHaveBeenCalled()
    expect(component.tocStructure!.course).toBe(-1)
  })

  it('getGlanceData returns null without required data and data otherwise', () => {
    expect(component.getGlanceData()).toBeNull()
    component.contentId = 'do_1'
    component.content = {
      categoryType: 'Course',
      exclusiveContent: false,
      duration: 60,
      lastUpdatedOn: 'today',
    } as any
    component.tocStructure = {} as any
    const glance = component.getGlanceData()
    expect(glance!.contentId).toBe('do_1')
    expect(glance!.cost).toBe('Free')
  })

  it('getAuthors maps creators and curators', () => {
    expect(component.getAuthors()).toEqual([])
    component.content = {
      creatorDetails: [{ name: 'Alice' }],
      creatorContacts: [{ name: 'Bob' }],
    } as any
    const authors = component.getAuthors()
    expect(authors).toEqual([
      { name: 'Alice', authorType: 'Author' },
      { name: 'Bob', authorType: 'Curator' },
    ])
  })

  it('changeToDefaultImg swaps the image source', () => {
    const evt: any = { target: { src: 'x' } }
    component.changeToDefaultImg(evt)
    expect(evt.target.src).toContain('default.png')
  })

  it('actionClick tolerates falsy and truthy events', () => {
    expect(() => component.actionClick(null)).not.toThrow()
    expect(() => component.actionClick({ a: 1 })).not.toThrow()
  })

  it('deleteContent removes the card on success', () => {
    component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }] as any
    component.deleteContent({ identifier: 'do_1', contentType: 'Course' } as any)
    expect(myContSvc.deleteContent).toHaveBeenCalledWith('do_1', false)
    expect(snackBar.openFromComponent).toHaveBeenCalled()
    expect(component.cardContent.length).toBe(1)
  })

  it('deleteContent opens the error dialog on a 409', () => {
    myContSvc.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
    component.deleteContent({ identifier: 'do_1', contentType: 'Course' } as any)
    expect(dialog.open).toHaveBeenCalled()
    expect(snackBar.openFromComponent).toHaveBeenCalled()
  })

  it('restoreContent removes the card on success', () => {
    component.cardContent = [{ identifier: 'do_1' }] as any
    component.restoreContent({ identifier: 'do_1' } as any)
    expect(myContSvc.restoreContent).toHaveBeenCalledWith('do_1')
    expect(component.cardContent.length).toBe(0)
  })

  it('createContent navigates to the new editor', () => {
    component.createContent({ identifier: 'do_1', locale: 'hi' } as any)
    expect(myContSvc.createInAnotherLanguage).toHaveBeenCalledWith('do_1', 'hi')
    expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_new')
  })

  it('unPublishOrDraft removes the card on success', () => {
    component.cardContent = [{ identifier: 'do_1' }] as any
    component.unPublishOrDraft({ identifier: 'do_1', status: 'Live' } as any)
    expect(myContSvc.upPublishOrDraft).toHaveBeenCalledWith('do_1', true)
    expect(component.cardContent.length).toBe(0)
  })

  it('confirmAction opens a confirm dialog and delegates delete', () => {
    const spy = jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)
    component.confirmAction({ type: 'delete', data: { identifier: 'do_1' } })
    expect(dialog.open).toHaveBeenCalled()
    expect(spy).toHaveBeenCalled()
  })

  it('confirmAction forwards non-dialog actions', () => {
    const spy = jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)
    component.confirmAction({ type: 'other', data: {} })
    expect(spy).toHaveBeenCalled()
  })

  it('forwardBackward opens the comments dialog and calls finalCall', () => {
    const form: any = { controls: { comments: { value: 'note' } } }
    dialog.open.mockReturnValue(makeDialogRef(form))
    const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => undefined)
    component.forwardBackward({ type: 'moveToDraft', data: { identifier: 'do_1' } })
    expect(spy).toHaveBeenCalledWith(form, expect.anything())
  })

  it('finalCall sends the forward/backward request', () => {
    const form: any = { controls: { comments: { value: 'note' } } }
    component.cardContent = [{ identifier: 'do_1' }] as any
    component.finalCall(form, { type: 'moveToDraft', data: { identifier: 'do_1', status: 'Draft' } })
    expect(myContSvc.forwardBackward).toHaveBeenCalled()
    expect(component.cardContent.length).toBe(0)
  })

  it('action routes edit to the editor and remove filters the card', () => {
    component.action({ data: { identifier: 'do_1' } as any, type: 'edit' })
    expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_1')
    component.cardContent = [{ identifier: 'do_1' }] as any
    component.action({ data: { identifier: 'do_1' } as any, type: 'remove' })
    expect(component.cardContent.length).toBe(0)
  })

  it('action delegates create and confirm-based actions', () => {
    const createSpy = jest.spyOn(component, 'createContent').mockImplementation(() => undefined)
    component.action({ data: { identifier: 'do_1' } as any, type: 'create' })
    expect(createSpy).toHaveBeenCalled()
    const confirmSpy = jest.spyOn(component, 'confirmAction').mockImplementation(() => undefined)
    component.action({ data: { identifier: 'do_1' } as any, type: 'delete' })
    expect(confirmSpy).toHaveBeenCalled()
  })

  it('actionOnExpiry opens a dialog and filters the card on confirm', () => {
    dialog.open.mockReturnValue(makeDialogRef({ isExtend: true }))
    component.cardContent = [{ identifier: 'do_1' }] as any
    component.actionOnExpiry({ identifier: 'do_1' } as any)
    expect(dialog.open).toHaveBeenCalled()
    expect(component.cardContent.length).toBe(0)
  })

  it('setCurrentLanguage stores the language', () => {
    component.setCurrentLanguage('hi')
    expect(component.searchLanguage).toBe('hi')
  })

  it('ngOnDestroy unsubscribes and clears the loader', () => {
    component.routerSubscription = { unsubscribe: jest.fn() } as any
    component.ngOnDestroy()
    expect(loadService.changeLoad.next).toHaveBeenCalledWith(false)
  })
})
