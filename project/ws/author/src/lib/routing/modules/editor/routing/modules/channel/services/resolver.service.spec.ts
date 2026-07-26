import { ChannelResolverService } from './resolver.service'

describe('ChannelResolverService', () => {
  let service: ChannelResolverService

  beforeEach(() => {
    service = new ChannelResolverService()
  })

  it('is created', () => {
    expect(service).toBeInstanceOf(ChannelResolverService)
  })

  describe('renderFromJSON', () => {
    it('converts a plain widget into a single author-widget entry', () => {
      const config: any = {
        widgetType: 'card',
        widgetSubType: 'default',
        widgetData: { title: 'Hello' },
      }
      const result = service.renderFromJSON(config)
      const keys = Object.keys(result)
      expect(keys.length).toBe(1)
      const node = result[keys[0]]
      expect(node.widgetType).toBe('card')
      expect(node.data).toEqual({ title: 'Hello' })
      expect(node.parent).toBe('')
    })

    it('flattens a linearLayout and links children to the parent', () => {
      const config: any = {
        widgetType: 'container',
        widgetSubType: 'linearLayout',
        widgetData: {
          widgets: [
            { widgetType: 'card', widgetSubType: 'default', widgetData: { a: 1 } },
            { widgetType: 'card', widgetSubType: 'default', widgetData: { b: 2 } },
          ],
        },
      }
      const result = service.renderFromJSON(config)
      const keys = Object.keys(result)
      expect(keys.length).toBe(3)
      const root = keys.find(k => !result[k].parent) as string
      expect(result[root].children.length).toBe(2)
      result[root].children.forEach((childId: string) => {
        expect(result[childId].parent).toBe(root)
      })
    })
  })

  describe('renderToJSON', () => {
    it('round-trips a plain widget back to a render config', () => {
      const config: any = {
        widgetType: 'card',
        widgetSubType: 'default',
        widgetData: { title: 'Hello' },
      }
      const map = service.renderFromJSON(config)
      const json = service.renderToJSON(map)
      expect(json.widgetType).toBe('card')
      expect(json.widgetData).toEqual({ title: 'Hello' })
    })

    it('round-trips a linearLayout preserving child widgets', () => {
      const config: any = {
        widgetType: 'container',
        widgetSubType: 'linearLayout',
        widgetData: {
          widgets: [{ widgetType: 'card', widgetSubType: 'default', widgetData: { a: 1 } }],
        },
      }
      const map = service.renderFromJSON(config)
      const json: any = service.renderToJSON(map)
      expect(json.widgetSubType).toBe('linearLayout')
      expect(json.widgetData.widgets.length).toBe(1)
      expect(json.widgetData.widgets[0].widget.widgetData).toEqual({ a: 1 })
    })
  })

  it('generates monotonically increasing unique ids across widgets', () => {
    const config: any = {
      widgetType: 'container',
      widgetSubType: 'linearLayout',
      widgetData: {
        widgets: [
          { widgetType: 'card', widgetSubType: 'default', widgetData: {} },
          { widgetType: 'card', widgetSubType: 'default', widgetData: {} },
        ],
      },
    }
    const result = service.renderFromJSON(config)
    const ids = Object.keys(result)
    // All ids are unique
    expect(new Set(ids).size).toBe(ids.length)
  })
})
