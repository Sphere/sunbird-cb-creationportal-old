import { BehaviorSubject, of } from 'rxjs'
import { ViewerComponent } from './viewer.component'

describe('ViewerComponent', () => {
  let valueSvc: any
  let activatedRoute: any
  let router: any
  let isXSmall$: BehaviorSubject<boolean>
  let routeData: any

  const build = () => new ViewerComponent(valueSvc, activatedRoute, router)

  beforeEach(() => {
    isXSmall$ = new BehaviorSubject<boolean>(false)
    valueSvc = { isXSmall$ }
    routeData = of({ content: { identifier: 'do_1', mimeType: 'application/pdf', status: 'Draft' } })
    activatedRoute = { data: routeData }
    router = { navigateByUrl: jest.fn() }
  })

  it('should be created and reflect the isXSmall stream', () => {
    const component = build()
    expect(component).toBeTruthy()
    expect(component.isXSmall).toBe(false)
    isXSmall$.next(true)
    expect(component.isXSmall).toBe(true)
  })

  describe('ngOnInit', () => {
    it('populates identifier, mime route and edit action for a Draft', () => {
      const component = build()
      component.ngOnInit()
      expect(component.identifier).toBe('do_1')
      expect(component.mimeTypeRoute).toBe('pdf')
      expect(component.actionType).toBe('Edit Content')
      expect(component.iframeUrl).toBe('/viewer/pdf/do_1?preview=true')
    })

    it('keeps edit action for Live content', () => {
      activatedRoute.data = of({ content: { identifier: 'do_2', mimeType: 'video/mp4', status: 'Live' } })
      const component = build()
      component.ngOnInit()
      expect(component.mimeTypeRoute).toBe('video')
      expect(component.actionType).toBe('Edit Content')
    })

    it('uses Take Action for other statuses', () => {
      activatedRoute.data = of({ content: { identifier: 'do_3', mimeType: 'application/pdf', status: 'Review' } })
      const component = build()
      component.ngOnInit()
      expect(component.actionType).toBe('Take Action')
    })

    it('leaves defaults when there is no content', () => {
      activatedRoute.data = of({})
      const component = build()
      component.ngOnInit()
      expect(component.identifier).toBe('')
      expect(component.actionType).toBe('Edit Content')
      expect(component.iframeUrl).toBe('/viewer//?preview=true')
    })
  })

  describe('ngOnChanges', () => {
    it('rebuilds the iframe url from the current identifier and mime route', () => {
      const component = build()
      component.identifier = 'x'
      component.mimeTypeRoute = 'audio'
      component.ngOnChanges()
      expect(component.iframeUrl).toBe('/viewer/audio/x?preview=true')
    })
  })

  describe('ngAfterViewInit', () => {
    it('rebuilds preview devices and selects the desktop option', () => {
      const component = build()
      component.ngAfterViewInit()
      expect(component.previewDevices.length).toBe(3)
      expect(component.selected).toBe(component.previewDevices[2])
      expect(component.selected.value).toBe('desktop')
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the router data subscription', () => {
      const component = build()
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('is safe when there is no subscription', () => {
      const component = build()
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('takeAction', () => {
    it('navigates to the editor for the current identifier', () => {
      const component = build()
      component.identifier = 'do_99'
      component.takeAction()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_99')
    })
  })
})
