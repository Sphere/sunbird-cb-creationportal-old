import { of } from 'rxjs'

import { ErrorType, ViewerComponent } from './viewer.component'

/**
 * Direct-instantiation unit tests for ViewerComponent.
 * MatDialog, router, services and DOM are mocked; no TestBed rendering.
 */
describe('ViewerComponent', () => {
  let activatedRoute: any
  let router: any
  let valueSvc: any
  let dataSvc: any
  let rootSvc: any
  let utilitySvc: any
  let changeDetector: any
  let dialog: any
  let configService: any

  function build(overrides: { error?: any; status?: any } = {}): ViewerComponent {
    activatedRoute = {
      snapshot: {
        queryParamMap: { get: jest.fn(() => null) },
        queryParams: {},
      },
    }
    router = { navigate: jest.fn(() => Promise.resolve(true)) }
    valueSvc = { isLtMedium$: of(false) }
    dataSvc = {
      changedSubject: of(undefined),
      status: overrides.status || 'none',
      error: overrides.error || null,
    }
    rootSvc = { showNavbarDisplay$: { next: jest.fn() } }
    utilitySvc = { isMobile: false }
    changeDetector = { detectChanges: jest.fn() }
    dialog = { open: jest.fn(() => ({ afterClosed: () => of('closed') })) }
    configService = { userRoles: new Set<string>() }
    return new ViewerComponent(activatedRoute, router, valueSvc, dataSvc, rootSvc, utilitySvc, changeDetector, dialog, configService)
  }

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('constructs and hides the navbar', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(rootSvc.showNavbarDisplay$.next).toHaveBeenCalledWith(false)
  })

  it('getContentData assigns content when data is fully shaped', () => {
    const c = build()
    const e = { activatedRoute: { data: of({ content: { data: { identifier: 'c-1' } } }) } }
    c.getContentData(e)
    expect(c.content).toEqual({ identifier: 'c-1' })
  })

  it('showReviewChecklist opens the review dialog', () => {
    const c = build()
    c.showReviewChecklist()
    expect(dialog.open).toHaveBeenCalledTimes(1)
  })

  it('ngOnInit flags a reviewer when the role is present', () => {
    const c = build()
    configService.userRoles = new Set(['content_reviewer'])
    c.ngOnInit()
    expect(c.isReviewer).toBe(true)
  })

  it('ngOnInit maps a 403 error to accessForbidden', () => {
    const c = build({ error: { status: 403 } })
    c.ngOnInit()
    expect(c.errorWidgetData.widgetData.errorType).toBe(ErrorType.accessForbidden)
  })

  it('ngOnInit maps a 404 error to notFound', () => {
    const c = build({ error: { status: 404 } })
    c.ngOnInit()
    expect(c.errorWidgetData.widgetData.errorType).toBe(ErrorType.notFound)
  })

  it('ngOnInit maps an unknown error status to somethingWrong', () => {
    const c = build({ error: { status: 418 } })
    c.ngOnInit()
    expect(c.errorWidgetData.widgetData.errorType).toBe(ErrorType.somethingWrong)
  })

  it('ngOnInit navigates on a mimeTypeMismatch error after the timeout', () => {
    jest.useFakeTimers()
    const c = build({ error: { errorType: ErrorType.mimeTypeMismatch, probableUrl: '/go' } })
    c.ngOnInit()
    jest.advanceTimersByTime(3000)
    expect(router.navigate).toHaveBeenCalledWith(['/go'])
  })

  it('ngAfterViewChecked captures the fullscreen container when present', () => {
    const c = build()
    const el = {} as HTMLElement
    jest.spyOn(document, 'getElementById').mockReturnValue(el)
    c.ngAfterViewChecked()
    expect(c.fullScreenContainer).toBe(el)
    expect(changeDetector.detectChanges).toHaveBeenCalled()
  })

  it('ngAfterViewChecked nulls the container when absent', () => {
    const c = build()
    jest.spyOn(document, 'getElementById').mockReturnValue(null)
    c.ngAfterViewChecked()
    expect(c.fullScreenContainer).toBeNull()
    expect(changeDetector.detectChanges).toHaveBeenCalled()
  })

  it('toggleSideBar always opens the side bar', () => {
    const c = build()
    c.sideNavBarOpened = false
    c.toggleSideBar()
    expect(c.sideNavBarOpened).toBe(true)
  })

  it('minimizeBar closes the side bar only on mobile', () => {
    const c = build()
    utilitySvc.isMobile = true
    c.sideNavBarOpened = true
    c.minimizeBar()
    expect(c.sideNavBarOpened).toBe(false)
  })

  it('minimizeBar leaves the side bar open on desktop', () => {
    const c = build()
    utilitySvc.isMobile = false
    c.sideNavBarOpened = true
    c.minimizeBar()
    expect(c.sideNavBarOpened).toBe(true)
  })

  it('ngOnDestroy restores the navbar', () => {
    const c = build()
    c.ngOnInit()
    c.ngOnDestroy()
    expect(rootSvc.showNavbarDisplay$.next).toHaveBeenLastCalledWith(true)
  })
})
