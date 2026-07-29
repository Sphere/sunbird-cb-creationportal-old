import { SelectorResponsiveV2Component } from './selector-responsive-v2.component'

describe('SelectorResponsiveV2Component', () => {
  let component: SelectorResponsiveV2Component
  let dialog: any

  const DESKTOP_MAX = 500090000

  const strip = (minWidth: number, maxWidth: number) =>
    ({ minWidth, maxWidth, widget: { widgetType: 'x', widgetSubType: 'y', widgetData: {} } }) as any

  const build = (content: any = {}, size = 1) => {
    const c = new SelectorResponsiveV2Component(dialog)
    c.content = {
      type: 'image',
      subType: 'set1',
      selectFrom: [strip(0, DESKTOP_MAX)],
      ...content,
    } as any
    c.identifier = 'do_page1'
    c.size = size
    return c
  }

  beforeEach(() => {
    jest.useFakeTimers()
    dialog = { open: jest.fn() }
    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.index).toBe(0)
    expect(component.currentSize).toBe(1)
  })

  describe('ngOnInit', () => {
    it('selects the first strip', () => {
      component.ngOnInit()

      expect(component.currentStrip).toBe(component.content.selectFrom[0])
    })

    it('leaves a single-column widget with one common strip', () => {
      component.ngOnInit()

      expect(component.content.selectFrom.length).toBe(1)
    })

    it('splits a two-column widget into tablet+desktop and mobile strips', () => {
      const c = build({}, 2)

      c.ngOnInit()

      expect(c.content.selectFrom.length).toBe(2)
      expect(c.content.selectFrom[0]).toMatchObject({ minWidth: 481, maxWidth: DESKTOP_MAX })
      expect(c.content.selectFrom[1]).toMatchObject({ minWidth: 0, maxWidth: 480 })
    })

    it('splits a wider widget into desktop, tablet and mobile strips', () => {
      const c = build({}, 4)

      c.ngOnInit()

      expect(c.content.selectFrom.length).toBe(3)
      expect(c.content.selectFrom[0]).toMatchObject({ minWidth: 841, maxWidth: DESKTOP_MAX })
      expect(c.content.selectFrom[1]).toMatchObject({ minWidth: 481, maxWidth: 840 })
      expect(c.content.selectFrom[2]).toMatchObject({ minWidth: 0, maxWidth: 480 })
    })

    it('does not re-split a widget that already has several strips', () => {
      const c = build({ selectFrom: [strip(0, 480), strip(481, DESKTOP_MAX)] }, 2)

      c.ngOnInit()

      expect(c.content.selectFrom.length).toBe(2)
    })
  })

  describe('getType', () => {
    it.each([
      [0, 480, 'mob'],
      [481, 840, 'tab'],
      [841, DESKTOP_MAX, 'desktop'],
      [0, DESKTOP_MAX, 'common'],
      [481, DESKTOP_MAX, 'tabDesktop'],
    ])('names the %i-%i breakpoint %s', (min, max, expected) => {
      const c = build({ selectFrom: [strip(min, max)] })

      expect(c.getType(0)).toBe(expected)
    })

    it('describes an unrecognised range by its bounds', () => {
      const c = build({ selectFrom: [strip(100, 200)] })

      expect(c.getType(0)).toBe('100px - 200px')
    })

    it('names an unrecognised range custom when asked to', () => {
      const c = build({ selectFrom: [strip(100, 200)] })

      expect(c.getType(0, true)).toBe('custom')
    })
  })

  describe('onIndexChange', () => {
    const withStrips = (size = 4) => build({ selectFrom: [strip(0, 480), strip(481, 840), strip(841, DESKTOP_MAX)] }, size)

    it('selects the strip at the given index', () => {
      const c = withStrips()

      c.onIndexChange(1)

      expect(c.index).toBe(1)
      expect(c.currentStrip).toBe(c.content.selectFrom[1])
    })

    it('renders a mobile strip at one column', () => {
      const c = withStrips()

      c.onIndexChange(0)

      expect(c.currentSize).toBe(1)
    })

    it('renders a tablet strip at two columns', () => {
      const c = withStrips()

      c.onIndexChange(1)

      expect(c.currentSize).toBe(2)
    })

    it('renders a desktop strip at the widget width', () => {
      const c = withStrips(4)

      c.onIndexChange(2)

      expect(c.currentSize).toBe(4)
    })

    it('renders an unrecognised range at the widget width', () => {
      const c = build({ selectFrom: [strip(100, 200)] }, 3)

      c.onIndexChange(0)

      expect(c.currentSize).toBe(3)
    })

    it('re-initialises the image map editor for a map widget', () => {
      const c = build({ type: 'imageMap' })
      const imageMap = { ngOnInit: jest.fn(), ngAfterViewInit: jest.fn() }
      c.imageMapComponent = imageMap as any

      c.onIndexChange(0)
      jest.advanceTimersByTime(10)
      expect(imageMap.ngOnInit).toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(imageMap.ngAfterViewInit).toHaveBeenCalled()
    })

    it('tolerates a map widget whose editor is not rendered yet', () => {
      const c = build({ type: 'imageMap' })

      c.onIndexChange(0)

      expect(() => jest.advanceTimersByTime(200)).not.toThrow()
    })

    it('does not touch the image map editor for an image widget', () => {
      const imageMap = { ngOnInit: jest.fn(), ngAfterViewInit: jest.fn() }
      component.imageMapComponent = imageMap as any

      component.onIndexChange(0)
      jest.advanceTimersByTime(200)

      expect(imageMap.ngOnInit).not.toHaveBeenCalled()
    })
  })

  describe('setScreenWidth', () => {
    beforeEach(() => component.ngOnInit())

    it.each([
      ['mob', 0, 480],
      ['tabDesktop', 481, DESKTOP_MAX],
      ['tab', 481, 840],
      ['desktop', 841, DESKTOP_MAX],
      ['custom', 0, DESKTOP_MAX],
    ])('applies the %s breakpoint', (value, min, max) => {
      component.setScreenWidth({ value })

      expect(component.currentStrip.minWidth).toBe(min)
      expect(component.currentStrip.maxWidth).toBe(max)
    })

    it('ignores an unknown breakpoint', () => {
      component.setScreenWidth({ value: 'nope' })

      expect(component.currentStrip.minWidth).toBe(0)
      expect(component.currentStrip.maxWidth).toBe(DESKTOP_MAX)
    })
  })

  describe('addStrip', () => {
    it('appends a strip and selects it', () => {
      component.ngOnInit()

      component.addStrip()

      expect(component.content.selectFrom.length).toBe(2)
      expect(component.index).toBe(1)
      expect(component.currentStrip).toBe(component.content.selectFrom[1])
    })

    it('keeps the current index when asked not to advance', () => {
      component.ngOnInit()

      component.addStrip(false)

      expect(component.content.selectFrom.length).toBe(2)
      expect(component.index).toBe(0)
    })
  })

  describe('removeStrip', () => {
    it('replaces the last remaining strip with a fresh one', () => {
      component.ngOnInit()

      component.removeStrip()

      expect(component.content.selectFrom.length).toBe(1)
      expect(component.index).toBe(0)
    })

    it('steps back when the removed strip was the last of several', () => {
      const c = build({ selectFrom: [strip(0, 480), strip(481, DESKTOP_MAX)] })
      c.ngOnInit()
      c.onIndexChange(1)

      c.removeStrip()

      expect(c.content.selectFrom.length).toBe(1)
      expect(c.index).toBe(0)
    })

    it('stays put when a strip in the middle is removed', () => {
      const c = build({ selectFrom: [strip(0, 480), strip(481, 840), strip(841, DESKTOP_MAX)] })
      c.ngOnInit()
      c.onIndexChange(0)

      c.removeStrip()

      expect(c.content.selectFrom.length).toBe(2)
      expect(c.index).toBe(0)
      expect(c.currentStrip.minWidth).toBe(481)
    })
  })

  describe('generateWidget', () => {
    it('builds a map widget for an image-map selector', () => {
      const c = build({ type: 'imageMap' })

      const widget = c.generateWidget()

      expect(widget).toBeTruthy()
      expect(widget.widgetData.type).toBeUndefined()
    })

    it('builds an image widget carrying the configured subtype', () => {
      const widget = component.generateWidget()

      expect(widget.widgetData.type).toBe('set1')
    })

    it('returns a fresh copy of the library entry each time', () => {
      const first = component.generateWidget()
      const second = component.generateWidget()

      expect(first).not.toBe(second)
      expect(first).toEqual(second)
    })
  })
})
