import { Subject, of, throwError } from 'rxjs'
import { TncComponent } from './tnc.component'

describe('TncComponent', () => {
  let component: TncComponent
  let activatedRoute: any
  let router: any
  let http: any
  let loggerSvc: any
  let configSvc: any
  let tncProtectedSvc: any
  let tncPublicSvc: any
  let matDialog: any
  let routeData$: Subject<any>
  let afterClosed$: Subject<any>

  const term = (name: string, over: any = {}) => ({
    name,
    language: 'en',
    version: 'v1',
    ...over,
  })

  const tnc = (over: any = {}) => ({
    isNewUser: false,
    termsAndConditions: [term('Generic T&C'), term('Data Privacy')],
    ...over,
  })

  const load = (data: any = { tnc: { data: tnc() } }) => {
    component.ngOnInit()
    routeData$.next(data)
  }

  beforeEach(() => {
    routeData$ = new Subject<any>()
    afterClosed$ = new Subject<any>()

    activatedRoute = { data: routeData$ }
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() }
    http = { post: jest.fn().mockReturnValue(of({})), patch: jest.fn().mockReturnValue(of({})) }
    loggerSvc = { error: jest.fn() }
    configSvc = { isNewUser: false, hasAcceptedTnc: false, appSetup: false, userUrl: '' }
    tncProtectedSvc = { getTnc: jest.fn().mockReturnValue(of(tnc())) }
    tncPublicSvc = { getPublicTnc: jest.fn().mockReturnValue(of(tnc())) }
    matDialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed$ }) }

    component = new TncComponent(activatedRoute, router, http, loggerSvc, configSvc, tncProtectedSvc, tncPublicSvc, matDialog)
  })

  it('should be created with an internal-server error widget ready', () => {
    expect(component).toBeTruthy()
    expect(component.tncData).toBeNull()
    expect(component.isPublic).toBe(false)
    expect(component.isAcceptInProgress).toBe(false)
    expect(component.errorWidget.widgetData.errorType).toBe('internalServer')
  })

  describe('ngOnInit', () => {
    it('takes the resolved terms off the route', () => {
      load()

      expect(component.tncData).toEqual(tnc())
      expect(configSvc.isNewUser).toBe(false)
      expect(component.isPublic).toBe(false)
    })

    it('flags a new user for the setup flow', () => {
      load({ tnc: { data: tnc({ isNewUser: true }) } })

      expect(configSvc.isNewUser).toBe(true)
    })

    it('records that the terms were served publicly', () => {
      load({ tnc: { data: tnc() }, isPublic: true })

      expect(component.isPublic).toBe(true)
    })

    it('redirects when the terms could not be resolved', () => {
      load({ tnc: {} })

      expect(router.navigate).toHaveBeenCalledWith(['error-service-unavailable'])
      expect(component.tncData).toBeNull()
    })
  })

  describe('ngOnDestroy', () => {
    it('stops listening to the route', () => {
      load()
      component.ngOnDestroy()

      routeData$.next({ tnc: {} })

      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('getTnc', () => {
    it('does nothing before the terms have loaded', () => {
      component.getTnc('hi')

      expect(tncProtectedSvc.getTnc).not.toHaveBeenCalled()
    })

    it('does nothing when the requested language is already showing', () => {
      load()

      component.getTnc('en')

      expect(tncProtectedSvc.getTnc).not.toHaveBeenCalled()
    })

    it('fetches the protected terms and keeps the data-privacy section', () => {
      load()
      tncProtectedSvc.getTnc.mockReturnValue(of(tnc({ termsAndConditions: [term('Generic T&C', { language: 'hi' }), term('other')] })))

      component.getTnc('hi')

      expect(tncProtectedSvc.getTnc).toHaveBeenCalledWith('hi')
      expect(component.tncData!.termsAndConditions[0].language).toBe('hi')
      expect(component.tncData!.termsAndConditions[1].name).toBe('Data Privacy')
    })

    it('fetches the public terms when served publicly', () => {
      load({ tnc: { data: tnc() }, isPublic: true })

      component.getTnc('hi')

      expect(tncPublicSvc.getPublicTnc).toHaveBeenCalledWith('hi')
      expect(tncProtectedSvc.getTnc).not.toHaveBeenCalled()
    })
  })

  describe('getDp', () => {
    it('does nothing before the terms have loaded', () => {
      component.getDp('hi')

      expect(tncProtectedSvc.getTnc).not.toHaveBeenCalled()
    })

    it('does nothing when the requested language is already showing', () => {
      load()

      component.getDp('en')

      expect(tncProtectedSvc.getTnc).not.toHaveBeenCalled()
    })

    it('fetches the protected privacy notice and keeps the terms section', () => {
      load()
      tncProtectedSvc.getTnc.mockReturnValue(of(tnc({ termsAndConditions: [term('other'), term('Data Privacy', { language: 'hi' })] })))

      component.getDp('hi')

      expect(component.tncData!.termsAndConditions[0].name).toBe('Generic T&C')
      expect(component.tncData!.termsAndConditions[1].language).toBe('hi')
    })

    it('fetches the public privacy notice when served publicly', () => {
      load({ tnc: { data: tnc() }, isPublic: true })

      component.getDp('hi')

      expect(tncPublicSvc.getPublicTnc).toHaveBeenCalledWith('hi')
    })
  })

  describe('acceptTnc', () => {
    const template = {} as any

    it('does nothing before the terms have loaded', () => {
      component.acceptTnc(template)

      expect(http.post).not.toHaveBeenCalled()
      expect(component.errorInAccepting).toBe(false)
    })

    it('posts both accepted documents', () => {
      load()

      component.acceptTnc(template)

      expect(http.post).toHaveBeenCalledWith('/apis/protected/v8/user/tnc/accept', {
        termsAccepted: [
          { acceptedLanguage: 'en', docName: 'Generic T&C', version: 'v1' },
          { acceptedLanguage: 'en', docName: 'Data Privacy', version: 'v1' },
        ],
      })
      expect(configSvc.hasAcceptedTnc).toBe(true)
      expect(http.patch).toHaveBeenCalledWith('/apis/protected/v8/user/tnc/postprocessing', {})
    })

    it('posts only the documents that are present', () => {
      load({ tnc: { data: tnc({ termsAndConditions: [term('Generic T&C')] }) } })

      component.acceptTnc(template)

      expect(http.post.mock.calls[0][1].termsAccepted).toEqual([{ acceptedLanguage: 'en', docName: 'Generic T&C', version: 'v1' }])
    })

    it('sends a new user to the setup flow', () => {
      configSvc.appSetup = true
      load({ tnc: { data: tnc({ isNewUser: true }) } })

      component.acceptTnc(template)

      expect(router.navigate).toHaveBeenCalledWith(['app', 'setup'])
    })

    it('sends an existing user home', () => {
      load()

      component.acceptTnc(template)

      expect(router.navigate).toHaveBeenCalledWith(['page', 'home'])
      expect(matDialog.open).not.toHaveBeenCalled()
    })

    it('offers to resume the requested page', () => {
      configSvc.userUrl = '/app/toc/do_1'
      load()

      component.acceptTnc(template)

      expect(matDialog.open).toHaveBeenCalledWith(template, {
        width: '400px',
        backdropClass: 'backdropBackground',
      })

      // The stored url is cleared as soon as the dialog opens, so the redirect on
      // confirm navigates to whatever userUrl holds at that point.
      afterClosed$.next(true)
      expect(configSvc.userUrl).toBe('')
      expect(router.navigateByUrl).toHaveBeenCalledWith('')
      expect(router.navigate).not.toHaveBeenCalledWith(['page', 'home'])
    })

    it('sends the user home when they decline to resume', () => {
      configSvc.userUrl = '/app/toc/do_1'
      load()

      component.acceptTnc(template)
      afterClosed$.next(false)

      expect(configSvc.userUrl).toBe('')
      expect(router.navigate).toHaveBeenCalledWith(['page', 'home'])
    })

    it('reports a failure to accept', () => {
      http.post.mockReturnValue(throwError(() => new Error('boom')))
      load()

      component.acceptTnc(template)

      expect(loggerSvc.error).toHaveBeenCalledWith('ERROR ACCEPTING TNC:', expect.anything())
      expect(component.errorInAccepting).toBe(true)
      expect(component.isAcceptInProgress).toBe(false)
    })
  })

  describe('postProcess', () => {
    it('kicks off the post-acceptance processing', () => {
      component.postProcess()

      expect(http.patch).toHaveBeenCalledWith('/apis/protected/v8/user/tnc/postprocessing', {})
    })
  })
})
