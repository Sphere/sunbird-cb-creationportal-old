import { ImageMapResponsiveComponent } from './image-map-responsive.component'

describe('ImageMapResponsiveComponent', () => {
  let domSanitizer: any
  let component: ImageMapResponsiveComponent

  const baseWidgetData = () => ({
    imageHeight: 200,
    imageWidth: 400,
    imageSrc: 'img.png',
    mapName: 'm',
    map: [
      { coords: [10, 20, 30, 40], alt: 'a', title: 't', link: '/l' },
      { coords: [50, 60, 70, 80], alt: 'b', title: 't2', link: '/l2' },
    ],
  })

  beforeEach(() => {
    domSanitizer = { bypassSecurityTrustHtml: jest.fn((v: string) => `safe:${v}`) }
    component = new ImageMapResponsiveComponent(domSanitizer)
    component.widgetData = baseWidgetData() as any
  })

  afterEach(() => {
    jest.useRealTimers()
    if (component.interval) {
      clearInterval(component.interval)
    }
  })

  it('should create with default scale', () => {
    expect(component).toBeTruthy()
    expect(component.scale).toEqual({ height: 1, width: 1 })
    expect(component.isUpdateCoords).toBe(true)
  })

  describe('getInitialCoords', () => {
    it('maps the widget coords tuples into x/y objects', () => {
      component.getInitialCoords()

      expect(component.initialCoords).toEqual([
        { x1: 10, y1: 20, x2: 30, y2: 40 },
        { x1: 50, y1: 60, x2: 70, y2: 80 },
      ])
    })

    it('clones the coords into a separate working array', () => {
      component.getInitialCoords()

      expect(component.coords).toEqual(component.initialCoords)
      expect(component.coords).not.toBe(component.initialCoords)
      // deep clone — mutating one must not affect the other
      component.coords[0].x1 = 999
      expect(component.initialCoords[0].x1).toBe(10)
    })
  })

  describe('ngOnInit', () => {
    it('computes initial coords when there is no external data', () => {
      component.ngOnInit()

      expect(component.initialCoords).toHaveLength(2)
      expect(component.coords).toHaveLength(2)
    })

    it('extracts and sanitizes the inner map html from external data', () => {
      component.widgetData = {
        ...baseWidgetData(),
        externalData: '<map name="m"><area shape="rect" coords="1,2,3,4"/></map>',
      } as any

      component.ngOnInit()

      expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<area shape="rect" coords="1,2,3,4"/>')
      expect(component.htmlContent).toBe('safe:<area shape="rect" coords="1,2,3,4"/>')
    })
  })

  describe('updateCoords', () => {
    beforeEach(() => {
      component.getInitialCoords()
    })

    it('scales working coords by the rendered vs source dimensions', () => {
      // rendered 200x100 against source 400x200 => width scale 0.5, height scale 0.5
      component.mapElem = { nativeElement: { width: 200, height: 100 } } as any

      component.updateCoords()

      expect(component.scale).toEqual({ height: 0.5, width: 0.5 })
      expect(component.coords[0]).toEqual({ x1: 5, y1: 10, x2: 15, y2: 20 })
      expect(component.coords[1]).toEqual({ x1: 25, y1: 30, x2: 35, y2: 40 })
    })

    it('clears the polling interval once a height is available', () => {
      const spy = jest.spyOn(global, 'clearInterval')
      component.interval = 1234 as any
      component.mapElem = { nativeElement: { width: 400, height: 200 } } as any

      component.updateCoords()

      expect(spy).toHaveBeenCalledWith(1234)
      spy.mockRestore()
    })

    it('does not clear the interval while height is still zero', () => {
      const spy = jest.spyOn(global, 'clearInterval')
      component.mapElem = { nativeElement: { width: 0, height: 0 } } as any

      component.updateCoords()

      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('ngAfterViewInit', () => {
    it('schedules the coord poller for non-external data', () => {
      jest.useFakeTimers()
      const updateSpy = jest.spyOn(component, 'updateCoords').mockImplementation(() => undefined)
      component.getInitialCoords()

      component.ngAfterViewInit()
      jest.advanceTimersByTime(500)
      expect(component.interval).toBeDefined()

      jest.advanceTimersByTime(100)
      expect(updateSpy).toHaveBeenCalled()
    })

    it('does not poll when external data is present', () => {
      jest.useFakeTimers()
      component.widgetData = { ...baseWidgetData(), externalData: '<map></map>' } as any

      component.ngAfterViewInit()
      jest.advanceTimersByTime(500)

      expect(component.interval).toBeUndefined()
    })

    it('re-polls on a window resize (debounced)', () => {
      jest.useFakeTimers()
      const updateSpy = jest.spyOn(component, 'updateCoords').mockImplementation(() => undefined)
      component.getInitialCoords()

      component.ngAfterViewInit()
      // clear the initial setTimeout scheduling
      jest.advanceTimersByTime(500)
      component.interval = undefined

      window.dispatchEvent(new Event('resize'))
      jest.advanceTimersByTime(500) // debounceTime window
      expect(component.interval).toBeDefined()

      jest.advanceTimersByTime(100)
      expect(updateSpy).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the resize observer', () => {
      jest.useFakeTimers()
      component.ngAfterViewInit()
      const sub = (component as any).resizeObserver
      const spy = jest.spyOn(sub, 'unsubscribe')

      component.ngOnDestroy()

      expect(spy).toHaveBeenCalled()
    })

    it('is safe to destroy when no resize observer exists', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
