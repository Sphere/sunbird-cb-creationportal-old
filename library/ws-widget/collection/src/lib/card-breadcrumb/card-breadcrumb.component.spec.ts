import { CardBreadcrumbComponent } from './card-breadcrumb.component'

describe('CardBreadcrumbComponent', () => {
  let events: any

  const build = () => new CardBreadcrumbComponent(events)

  beforeEach(() => {
    events = {
      raiseInteractTelemetry: jest.fn(),
    }
  })

  it('is created', () => {
    const c = build()
    expect(c).toBeTruthy()
  })

  it('ngOnInit runs without error', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('encodeUrl', () => {
    it('returns null for a falsy url', () => {
      const c = build()
      expect(c.encodeUrl('')).toBeNull()
    })

    it('returns the url unchanged when it has no ">" separator', () => {
      const c = build()
      expect(c.encodeUrl('/home/path')).toBe('/home/path')
    })

    it('encodes only the last child segment after ">"', () => {
      const c = build()
      expect(c.encodeUrl('parent>child value')).toBe('parent>child%20value')
    })

    it('preserves multiple parent segments and encodes the last child', () => {
      const c = build()
      expect(c.encodeUrl('a>b>c d')).toBe('a>b>c%20d')
    })
  })

  describe('raiseTelemetry', () => {
    it('raises an interact telemetry event with the clicked item and path', () => {
      const c = build()
      c.widgetData = { path: [{ text: 'Home', clickUrl: '/home' }] }
      const clickedItem = { text: 'Home', clickUrl: '/home' }
      c.raiseTelemetry(clickedItem)
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('click', 'breadcrumb', {
        clickedItem,
        path: c.widgetData.path,
      })
    })
  })
})
