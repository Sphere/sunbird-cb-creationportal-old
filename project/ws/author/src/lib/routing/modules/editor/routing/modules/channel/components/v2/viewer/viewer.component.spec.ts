import { of } from 'rxjs'
import { ViewerComponent } from './viewer.component'

describe('ViewerComponent', () => {
  let store: any
  let channelResolver: any

  const build = () => {
    const c = new ViewerComponent(store, channelResolver)
    c.id = 'root'
    return c
  }

  beforeEach(() => {
    store = {
      update: of('root'),
      getUpdatedJSON: jest.fn().mockReturnValue({}),
    }
    channelResolver = {
      renderToJSON: jest.fn().mockReturnValue({ widgetSubType: 'pageEmbedded', widgetData: { iframeSrc: 'https://x' } }),
    }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('initiates and re-initiates when the store emits a matching id', () => {
      const c = build()
      const spy = jest.spyOn(c, 'initiate')
      c.ngOnInit()
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('does not re-initiate for a non-matching id', () => {
      store.update = of('other')
      const c = build()
      const spy = jest.spyOn(c, 'initiate')
      c.ngOnInit()
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  describe('initiate', () => {
    it('marks the widget populated when data is present', () => {
      const c = build()
      c.initiate()
      expect(c.emptyWidget).toBe(false)
      expect(c.isDataPresent).toBe(true)
      expect(channelResolver.renderToJSON).toHaveBeenCalledWith({}, 'root')
    })

    it('flags an empty widget when no widgetSubType is resolved', () => {
      channelResolver.renderToJSON.mockReturnValue({ widgetSubType: '', widgetData: {} })
      const c = build()
      c.initiate()
      expect(c.emptyWidget).toBe(true)
      expect(c.isDataPresent).toBe(false)
    })

    it('falls back to not-present when the widget check throws', () => {
      channelResolver.renderToJSON.mockReturnValue({ widgetSubType: 'videoWrapper', widgetData: {} })
      const c = build()
      c.initiate()
      expect(c.isDataPresent).toBe(false)
    })
  })
})
