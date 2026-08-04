import { ChannelResolverService } from './resolver.service'

/**
 * Covers the widget subtypes the base resolver.service.spec.ts leaves out —
 * gridLayout, tabLayout, selectorResponsive, galleryView and contentStripMultiple —
 * in both directions (renderFromJSON flattening, renderToJSON rebuilding).
 */
describe('ChannelResolverService (layout subtypes)', () => {
  let service: ChannelResolverService

  const plain = (subType = 'card', data: any = { text: 'hi' }) => ({
    widgetType: 'basic',
    widgetSubType: subType,
    widgetData: data,
  })

  /** The single parent-less entry produced by renderFromJSON. */
  const rootOf = (flat: any) => flat[Object.keys(flat).find(k => !flat[k].parent) as string]

  beforeEach(() => {
    service = new ChannelResolverService()
  })

  describe('renderFromJSON — gridLayout', () => {
    const grid = () => ({
      widgetType: 'layout',
      widgetSubType: 'gridLayout',
      widgetData: {
        gutter: 8,
        fromBasicEditor: true,
        widgets: [
          [
            { widget: plain('card', { a: 1 }), dimensions: { large: 6 }, className: 'c1', styles: { color: 'red' } },
            { widget: plain('card', { a: 2 }), dimensions: { large: 6 } },
          ],
          [{ widget: plain('card', { a: 3 }) }],
        ],
      },
    })

    it('keeps the gutter and editor flag on the parent', () => {
      const flat = service.renderFromJSON(grid() as any)
      expect(rootOf(flat).data).toEqual({ gutter: 8, fromBasicEditor: true })
    })

    it('links every cell as a child and stamps its row number', () => {
      const flat = service.renderFromJSON(grid() as any)
      const root = rootOf(flat)
      expect(root.children).toHaveLength(3)
      expect(root.children.map((c: string) => flat[c].rowNo)).toEqual([0, 0, 1])
      root.children.forEach((c: string) => expect(flat[c].parent).toBe(root.id))
    })

    it('carries per-cell dimensions, className and styles across', () => {
      const flat = service.renderFromJSON(grid() as any)
      const first = flat[rootOf(flat).children[0]]
      expect(first.dimensions).toEqual({ large: 6 })
      expect(first.className).toBe('c1')
      expect(first.styles).toEqual({ color: 'red' })
    })

    it('defaults dimensions, className and styles when a cell omits them', () => {
      const flat = service.renderFromJSON(grid() as any)
      const second = flat[rootOf(flat).children[1]]
      expect(second.className).toBe('')
      expect(second.styles).toEqual({})
    })

    it('tolerates a grid with no widgets array', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'gridLayout',
        widgetData: { gutter: 0, fromBasicEditor: false },
      } as any)
      expect(rootOf(flat).children).toEqual([])
    })
  })

  describe('renderFromJSON — tabLayout', () => {
    it('turns each tab into a child carrying its key and title', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'tabLayout',
        widgetData: {
          tabs: [
            { tabKey: 'k1', tabTitle: 'One', tabContent: plain() },
            { tabKey: 'k2', tabTitle: 'Two', tabContent: plain() },
          ],
        },
      } as any)

      const root = rootOf(flat)
      expect(root.data).toBeUndefined()
      expect(root.children).toHaveLength(2)
      expect(flat[root.children[0]].addOnData).toEqual({ tabKey: 'k1', tabTitle: 'One' })
      expect(flat[root.children[1]].addOnData).toEqual({ tabKey: 'k2', tabTitle: 'Two' })
    })
  })

  describe('renderFromJSON — selectorResponsive', () => {
    it('records the breakpoint bounds on each option', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'selectorResponsive',
        widgetData: {
          type: 'T',
          subType: 'S',
          selectFrom: [
            { minWidth: 0, maxWidth: 599, widget: plain() },
            { minWidth: 600, widget: plain() },
          ],
        },
      } as any)

      const root = rootOf(flat)
      expect(root.data).toEqual({ type: 'T', subType: 'S' })
      expect(flat[root.children[0]].addOnData).toEqual({ minWidth: 0, maxWidth: 599 })
      expect(flat[root.children[1]].addOnData).toEqual({ minWidth: 600, maxWidth: undefined })
    })

    it('defaults an absent type and subType to empty strings', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'selectorResponsive',
        widgetData: { selectFrom: [] },
      } as any)
      expect(rootOf(flat).data).toEqual({ type: '', subType: '' })
    })
  })

  describe('renderFromJSON — galleryView', () => {
    it('copies the gallery configuration and each card', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'galleryView',
        widgetData: {
          designVal: 'd1',
          autoNext: true,
          delay: 500,
          loop: true,
          configs: { a: 1 },
          type: 'T',
          subType: 'S',
          cardMenu: [{ widget: plain(), cardData: { title: 'card1' } }, { widget: plain() }],
        },
      } as any)

      const root = rootOf(flat)
      expect(root.data).toEqual({ designVal: 'd1', autoNext: true, delay: 500, loop: true, configs: { a: 1 }, type: 'T', subType: 'S' })
      expect(flat[root.children[0]].addOnData).toEqual({ title: 'card1' })
      expect(flat[root.children[1]].addOnData).toEqual({})
    })

    it('falls back to gallery defaults when fields are missing', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'galleryView',
        widgetData: { cardMenu: [] },
      } as any)
      expect(rootOf(flat).data).toEqual({ designVal: '', autoNext: false, delay: 0, loop: false, configs: {}, type: '', subType: '' })
    })
  })

  describe('renderFromJSON — contentStripMultiple', () => {
    it('marks the strip as a channel strip and attaches the fallback widgets', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'contentStripMultiple',
        widgetData: {
          loader: true,
          noDataWidget: plain(),
          errorWidget: plain(),
          strips: [],
        },
      } as any)

      const root = rootOf(flat)
      expect(root.data).toEqual({ loader: true, isChannelStrip: true })
      const purposes = root.children.map((c: string) => flat[c].purpose)
      expect(purposes).toEqual(['noDataWidget', 'errorWidget'])
    })

    it('builds a holder node per strip carrying its request configuration', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'contentStripMultiple',
        widgetData: {
          strips: [
            {
              key: 'k1',
              title: 'Strip 1',
              stripConfig: { s: 1 },
              filters: ['f'],
              request: { r: 1 },
              loader: true,
              searchV6Type: 'v6',
            },
          ],
        },
      } as any)

      const holder = flat[rootOf(flat).children[0]]
      expect(holder.purpose).toBe('holder')
      expect(holder.data).toEqual({
        key: 'k1',
        title: 'Strip 1',
        stripConfig: { s: 1 },
        filters: ['f'],
        request: { r: 1 },
        loader: true,
        searchV6Type: 'v6',
      })
    })

    it('defaults every optional strip field', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'contentStripMultiple',
        widgetData: { strips: [{}] },
      } as any)

      expect(flat[rootOf(flat).children[0]].data).toEqual({
        key: '',
        title: '',
        stripConfig: {},
        filters: [],
        request: {},
        loader: false,
        searchV6Type: null,
      })
    })

    it('nests info, noData, error, pre and post widgets under the strip holder', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'contentStripMultiple',
        widgetData: {
          strips: [
            {
              key: 'k1',
              info: { mode: 'above', visibilityMode: 'hidden', icon: { i: 1 }, widget: plain() },
              noDataWidget: plain(),
              errorWidget: plain(),
              preWidgets: [plain(), plain()],
              postWidgets: [plain()],
            },
          ],
        },
      } as any)

      const holder = flat[rootOf(flat).children[0]]
      const purposes = holder.children.map((c: string) => flat[c].purpose)
      expect(purposes).toEqual(['info', 'noDataWidget', 'errorWidget', 'preWidget', 'preWidget', 'postWidget'])
      const info = flat[holder.children[0]]
      expect(info.addOnData).toEqual({ mode: 'above', visibilityMode: 'hidden', icon: { i: 1 } })
      holder.children.forEach((c: string) => expect(flat[c].parent).toBe(holder.id))
    })

    it('defaults the info display options', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'contentStripMultiple',
        widgetData: { strips: [{ info: { widget: plain() } }] },
      } as any)
      const holder = flat[rootOf(flat).children[0]]
      expect(flat[holder.children[0]].addOnData).toEqual({ mode: 'below', visibilityMode: 'visible', icon: {} })
    })

    it('skips empty pre and post widget lists', () => {
      const flat = service.renderFromJSON({
        widgetType: 'layout',
        widgetSubType: 'contentStripMultiple',
        widgetData: { strips: [{ preWidgets: [], postWidgets: [] }] },
      } as any)
      expect(flat[rootOf(flat).children[0]].children).toEqual([])
    })
  })

  describe('renderToJSON — gridLayout', () => {
    it('rebuilds rows from each child rowNo', () => {
      const data: any = {
        root: {
          id: 'root',
          parent: '',
          widgetSubType: 'gridLayout',
          widgetType: 'layout',
          data: { gutter: 4, fromBasicEditor: true },
          children: ['a', 'b', 'c'],
        },
        a: {
          id: 'a',
          parent: 'root',
          widgetSubType: 'card',
          data: { x: 1 },
          rowNo: 0,
          dimensions: { large: 6 },
          styles: {},
          className: '',
        },
        b: {
          id: 'b',
          parent: 'root',
          widgetSubType: 'card',
          data: { x: 2 },
          rowNo: 0,
          dimensions: { large: 6 },
          styles: {},
          className: '',
        },
        c: { id: 'c', parent: 'root', widgetSubType: 'card', data: { x: 3 }, rowNo: 1, dimensions: {}, styles: {}, className: '' },
      }

      const json: any = service.renderToJSON(data)

      expect(json.widgetData.gutter).toBe(4)
      expect(json.widgetData.widgets).toHaveLength(2)
      expect(json.widgetData.widgets[0]).toHaveLength(2)
      expect(json.widgetData.widgets[1]).toHaveLength(1)
      expect(json.widgetData.widgets[0][0].widget.widgetData).toEqual({ x: 1 })
    })
  })

  describe('renderToJSON — tabLayout', () => {
    it('rebuilds each tab from its addOnData', () => {
      const data: any = {
        root: { id: 'root', parent: '', widgetSubType: 'tabLayout', widgetType: 'layout', data: {}, children: ['t1'] },
        t1: { id: 't1', parent: 'root', widgetSubType: 'card', data: { x: 1 }, addOnData: { tabKey: 'k', tabTitle: 'T' }, children: [] },
      }
      const json: any = service.renderToJSON(data)
      expect(json.widgetData.tabs).toEqual([{ tabKey: 'k', tabTitle: 'T', tabContent: expect.objectContaining({ widgetSubType: 'card' }) }])
    })
  })

  describe('renderToJSON — selectorResponsive', () => {
    it('rebuilds the selectFrom breakpoints', () => {
      const data: any = {
        root: {
          id: 'root',
          parent: '',
          widgetSubType: 'selectorResponsive',
          widgetType: 'layout',
          data: { type: 'T', subType: 'S' },
          children: ['s1'],
        },
        s1: { id: 's1', parent: 'root', widgetSubType: 'card', data: {}, addOnData: { minWidth: 0, maxWidth: 599 }, children: [] },
      }
      const json: any = service.renderToJSON(data)
      expect(json.widgetData.type).toBe('T')
      expect(json.widgetData.selectFrom[0]).toEqual({ minWidth: 0, maxWidth: 599, widget: expect.any(Object) })
    })
  })

  describe('renderToJSON — galleryView', () => {
    it('rebuilds the card menu with its card data', () => {
      const data: any = {
        root: {
          id: 'root',
          parent: '',
          widgetSubType: 'galleryView',
          widgetType: 'layout',
          data: { designVal: 'd', configs: {}, autoNext: true, delay: 1, loop: false, type: 'T', subType: 'S' },
          children: ['c1'],
        },
        c1: { id: 'c1', parent: 'root', widgetSubType: 'card', data: {}, addOnData: { title: 'x' }, children: [] },
      }
      const json: any = service.renderToJSON(data)
      expect(json.widgetData.designVal).toBe('d')
      expect(json.widgetData.cardMenu[0].cardData).toEqual({ title: 'x' })
    })
  })

  describe('renderToJSON — contentStripMultiple', () => {
    it('restores the fallback widgets and every strip with its nested widgets', () => {
      const data: any = {
        root: {
          id: 'root',
          parent: '',
          widgetSubType: 'contentStripMultiple',
          widgetType: 'layout',
          data: { loader: true },
          children: ['nd', 'err', 'holder'],
        },
        nd: { id: 'nd', parent: 'root', widgetSubType: 'card', data: {}, purpose: 'noDataWidget', children: [] },
        err: { id: 'err', parent: 'root', widgetSubType: 'card', data: {}, purpose: 'errorWidget', children: [] },
        holder: {
          id: 'holder',
          parent: 'root',
          widgetSubType: 'card',
          data: { key: 'k1', title: 'S1' },
          purpose: 'holder',
          children: ['info', 'snd', 'serr', 'pre', 'post'],
        },
        info: {
          id: 'info',
          parent: 'holder',
          widgetSubType: 'card',
          data: {},
          purpose: 'info',
          addOnData: { mode: 'below' },
          children: [],
        },
        snd: { id: 'snd', parent: 'holder', widgetSubType: 'card', data: {}, purpose: 'noDataWidget', children: [] },
        serr: { id: 'serr', parent: 'holder', widgetSubType: 'card', data: {}, purpose: 'errorWidget', children: [] },
        pre: { id: 'pre', parent: 'holder', widgetSubType: 'card', data: {}, purpose: 'preWidget', children: [] },
        post: { id: 'post', parent: 'holder', widgetSubType: 'card', data: {}, purpose: 'postWidget', children: [] },
      }

      const json: any = service.renderToJSON(data)

      expect(json.widgetData.isChannelStrip).toBe(true)
      expect(json.widgetData.loader).toBe(true)
      expect(json.widgetData.noDataWidget).toBeTruthy()
      expect(json.widgetData.errorWidget).toBeTruthy()

      const strip = json.widgetData.strips.find((s: any) => s.key === 'k1')
      expect(strip).toBeTruthy()
      expect(strip.info.mode).toBe('below')
      expect(strip.noDataWidget).toBeTruthy()
      expect(strip.errorWidget).toBeTruthy()
      expect(strip.preWidgets).toHaveLength(1)
      expect(strip.postWidgets).toHaveLength(1)
    })

    it('leaves the fallback widgets undefined when no child declares them', () => {
      const data: any = {
        root: {
          id: 'root',
          parent: '',
          widgetSubType: 'contentStripMultiple',
          widgetType: 'layout',
          data: { loader: false },
          children: [],
        },
      }
      const json: any = service.renderToJSON(data)
      expect(json.widgetData.noDataWidget).toBeUndefined()
      expect(json.widgetData.errorWidget).toBeUndefined()
      expect(json.widgetData.strips).toEqual([])
    })
  })

  describe('renderToJSON — entry point', () => {
    it('starts from the explicitly requested parent', () => {
      const data: any = {
        root: { id: 'root', parent: '', widgetSubType: 'card', data: { r: 1 }, children: [] },
        other: { id: 'other', parent: 'root', widgetSubType: 'card', data: { o: 1 }, children: [] },
      }
      expect((service.renderToJSON(data, 'other') as any).widgetData).toEqual({ o: 1 })
    })

    it('falls back to the parent-less node when no parent is given', () => {
      const data: any = {
        root: { id: 'root', parent: '', widgetSubType: 'card', data: { r: 1 }, children: [] },
        other: { id: 'other', parent: 'root', widgetSubType: 'card', data: { o: 1 }, children: [] },
      }
      expect((service.renderToJSON(data) as any).widgetData).toEqual({ r: 1 })
    })
  })

  describe('round trip', () => {
    it('preserves a nested grid through renderFromJSON -> renderToJSON', () => {
      const original: any = {
        widgetType: 'layout',
        widgetSubType: 'gridLayout',
        widgetData: {
          gutter: 8,
          fromBasicEditor: true,
          widgets: [[{ widget: plain('card', { a: 1 }), dimensions: { large: 12 } }]],
        },
      }

      const flat = service.renderFromJSON(original)
      const back: any = service.renderToJSON(flat)

      expect(back.widgetSubType).toBe('gridLayout')
      expect(back.widgetData.gutter).toBe(8)
      expect(back.widgetData.widgets[0][0].widget.widgetData).toEqual({ a: 1 })
    })
  })

  describe('basic conversion defaults', () => {
    it('fills in empty defaults for a bare widget', () => {
      const flat = service.renderFromJSON({ widgetSubType: 'card' } as any)
      const root = rootOf(flat)
      expect(root.widgetType).toBe('')
      expect(root.widgetHostClass).toBe('')
      expect(root.widgetHostStyle).toEqual({})
      expect(root.data).toEqual({})
      expect(root.isValid).toBe(true)
      expect(root.widgetInstanceId).toBe(root.id)
    })

    it('keeps an explicit widgetInstanceId', () => {
      const flat = service.renderFromJSON({ widgetSubType: 'card', widgetInstanceId: 'fixed' } as any)
      expect(rootOf(flat).widgetInstanceId).toBe('fixed')
    })
  })
})
