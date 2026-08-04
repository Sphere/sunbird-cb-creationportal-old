import { of } from 'rxjs'

import { WIDGET_LIBRARY } from './../constants/widet'
import { ChannelStoreService } from './store.service'

/**
 * Covers the paths the base store.service.spec.ts leaves untouched: triggerEdit in
 * both edit modes, and every gridLayout-aware branch of deleteNode / insertNewNode /
 * addWidget / swapPosition (row reflow, sibling collapse, moveTop / moveBottom).
 */
describe('ChannelStoreService (grid + edit dialogs)', () => {
  let service: ChannelStoreService
  let contentService: any
  let matDialog: any
  let resolver: any

  const widget = (over: Partial<any> = {}): any => ({
    id: 'w',
    parent: 'root',
    children: [],
    rowNo: 0,
    dimensions: { large: 12, xLarge: 12 },
    ...over,
  })

  beforeEach(() => {
    contentService = { currentContent: 'c1' }
    matDialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(null) }) }
    resolver = { renderToJSON: jest.fn().mockReturnValue({}), renderFromJSON: jest.fn().mockReturnValue({}) }
    service = new ChannelStoreService(contentService, matDialog, resolver)
    service.originalContent = { c1: {} } as any
    service.updatedContent = {} as any
  })

  describe('triggerEdit — Advanced mode', () => {
    beforeEach(() => {
      service.editMode = 'Advanced'
    })

    it('opens the advanced input dialog with the widget and its parent type', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['w1'] }),
          w1: widget({ id: 'w1', parent: 'root' }),
        },
      } as any

      service.triggerEdit('w1')

      expect(matDialog.open).toHaveBeenCalledTimes(1)
      const config = matDialog.open.mock.calls[0][1]
      expect(config.width).toBe('1000px')
      expect(config.data.identifier).toBe('c1')
      expect(config.data.widget.id).toBe('w1')
      expect(config.data.parentType).toBe('gridLayout')
    })

    it('passes an empty parentType for a root widget', () => {
      service.originalContent = { c1: { root: widget({ id: 'root', parent: '' }) } } as any
      service.triggerEdit('root')
      expect(matDialog.open.mock.calls[0][1].data.parentType).toBe('')
    })

    it('stores the edited widget and republishes its parent on close', () => {
      service.originalContent = {
        c1: { root: widget({ id: 'root', parent: '' }), w1: widget({ id: 'w1', parent: 'root' }) },
      } as any
      const result = { id: 'w1', parent: 'root', children: [], label: 'edited' }
      matDialog.open.mockReturnValue({ afterClosed: () => of(result) })
      const emitted: string[] = []
      service.update.subscribe(v => emitted.push(v))

      service.triggerEdit('w1')

      expect((service.updatedContent as any).c1.w1.label).toBe('edited')
      expect(emitted).toContain('root')
    })

    it('does nothing when the advanced dialog is dismissed', () => {
      service.originalContent = { c1: { w1: widget({ id: 'w1', parent: '' }) } } as any
      matDialog.open.mockReturnValue({ afterClosed: () => of(undefined) })
      service.triggerEdit('w1')
      expect((service.updatedContent as any).c1).toBeUndefined()
    })
  })

  describe('triggerEdit — Basic mode', () => {
    beforeEach(() => {
      service.editMode = 'Basic'
    })

    it('sizes the dialog from the largest configured dimension', () => {
      service.originalContent = {
        c1: { w1: widget({ id: 'w1', parent: '', dimensions: { large: 6, xLarge: 9 } }) },
      } as any
      service.triggerEdit('w1')
      expect(matDialog.open.mock.calls[0][1].data.size).toBe(3)
    })

    it('defaults the dialog size when dimensions are absent', () => {
      service.originalContent = { c1: { w1: widget({ id: 'w1', parent: '', dimensions: {} }) } } as any
      service.triggerEdit('w1')
      expect(matDialog.open.mock.calls[0][1].data.size).toBe(4)
    })

    it('rebuilds the node from the returned render config, keeping the original id', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', children: ['w1'] }),
          w1: widget({ id: 'w1', parent: 'root', children: [] }),
        },
      } as any
      matDialog.open.mockReturnValue({ afterClosed: () => of({ some: 'renderConfig' }) })
      resolver.renderFromJSON.mockReturnValue({
        tmpRoot: { id: 'tmpRoot', parent: '', children: [], data: { text: 'hi' }, widgetHostClass: 'cls', widgetHostStyle: {} },
      })

      service.triggerEdit('w1')

      const stored = (service.updatedContent as any).c1.w1
      expect(stored.data).toEqual({ text: 'hi' })
      expect(stored.widgetHostClass).toBe('cls')
      expect(stored.id).toBe('w1')
    })

    it('lifts host height and width into styles when present', () => {
      service.originalContent = {
        c1: { root: widget({ id: 'root', parent: '', children: ['w1'] }), w1: widget({ id: 'w1', parent: 'root', children: [] }) },
      } as any
      matDialog.open.mockReturnValue({ afterClosed: () => of({}) })
      resolver.renderFromJSON.mockReturnValue({
        tmpNode: { id: 'tmpNode', parent: '', children: [], data: {}, widgetHostStyle: { height: '10px', width: '20px' } },
      })

      service.triggerEdit('w1')

      const stored = (service.updatedContent as any).c1.w1
      expect(stored.styles.height).toBe('10px')
      expect(stored.styles.width).toBe('20px')
    })

    it('strips stale height and width when the new config has none', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', children: ['w1'] }),
          w1: widget({ id: 'w1', parent: 'root', children: [], styles: { height: '9px', width: '9px' } }),
        },
      } as any
      matDialog.open.mockReturnValue({ afterClosed: () => of({}) })
      resolver.renderFromJSON.mockReturnValue({ tmpNode: { id: 'tmpNode', parent: '', children: [], data: {}, widgetHostStyle: {} } })

      service.triggerEdit('w1')

      const stored = (service.updatedContent as any).c1.w1
      expect(stored.styles.height).toBeUndefined()
      expect(stored.styles.width).toBeUndefined()
    })

    it('deletes the previous children of the edited node', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', children: ['w1'] }),
          w1: widget({ id: 'w1', parent: 'root', children: ['old1'] }),
          old1: widget({ id: 'old1', parent: 'w1', children: [] }),
        },
      } as any
      matDialog.open.mockReturnValue({ afterClosed: () => of({}) })
      resolver.renderFromJSON.mockReturnValue({ tmpNode: { id: 'tmpNode', parent: '', children: [], data: {}, widgetHostStyle: {} } })

      service.triggerEdit('w1')

      expect((service.originalContent as any).c1.old1).toBeUndefined()
    })

    it('does nothing when the basic dialog is dismissed', () => {
      service.originalContent = { c1: { w1: widget({ id: 'w1', parent: '' }) } } as any
      matDialog.open.mockReturnValue({ afterClosed: () => of(null) })
      service.triggerEdit('w1')
      expect((service.updatedContent as any).c1).toBeUndefined()
    })
  })

  describe('deleteNode — gridLayout row reflow', () => {
    it('pulls later rows up when the deleted node was alone on its row', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 1 }),
        },
      } as any

      service.deleteNode('a')

      expect((service.updatedContent as any).c1.b.rowNo).toBe(0)
      expect((service.updatedContent as any).c1.root.children).toEqual(['b'])
    })

    it('leaves rows alone when an elder sibling shares the row', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b', 'c'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 0 }),
          c: widget({ id: 'c', parent: 'root', rowNo: 1 }),
        },
      } as any

      service.deleteNode('b')

      // No reflow: 'c' is never rewritten, so it keeps its original row.
      expect((service.updatedContent as any).c1.c).toBeUndefined()
      expect(service.getUpdatedContent('c').rowNo).toBe(1)
    })

    it('leaves rows alone when a younger sibling shares the row', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b', 'c'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 0 }),
          c: widget({ id: 'c', parent: 'root', rowNo: 1 }),
        },
      } as any

      service.deleteNode('a')

      expect((service.updatedContent as any).c1.c).toBeUndefined()
      expect(service.getUpdatedContent('c').rowNo).toBe(1)
    })

    it('recursively removes descendants', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', children: ['a'] }),
          a: widget({ id: 'a', parent: 'root', children: ['a1'] }),
          a1: widget({ id: 'a1', parent: 'a', children: ['a2'] }),
          a2: widget({ id: 'a2', parent: 'a1', children: [] }),
        },
      } as any

      service.deleteNode('a')

      expect((service.originalContent as any).c1.a).toBeUndefined()
      expect((service.originalContent as any).c1.a1).toBeUndefined()
      expect((service.originalContent as any).c1.a2).toBeUndefined()
    })

    it('also clears the node from updatedContent', () => {
      service.originalContent = {
        c1: { root: widget({ id: 'root', parent: '', children: ['a'] }), a: widget({ id: 'a', parent: 'root' }) },
      } as any
      service.updatedContent = { c1: { a: widget({ id: 'a', parent: 'root' }) } } as any

      service.deleteNode('a')

      expect((service.updatedContent as any).c1.a).toBeUndefined()
    })

    it('emits the parent id only when canTrigger is set', () => {
      const base = () =>
        ({
          c1: {
            root: widget({ id: 'root', parent: '', children: ['a'] }),
            a: widget({ id: 'a', parent: 'root' }),
          },
        }) as any
      service.originalContent = base()
      const emitted: string[] = []
      service.update.subscribe(v => emitted.push(v))

      service.deleteNode('a', false)
      expect(emitted.filter(Boolean)).toEqual([])

      service.originalContent = base()
      service.updatedContent = {} as any
      service.deleteNode('a', true)
      expect(emitted).toContain('root')
    })
  })

  describe('addWidget — composite widgets', () => {
    it('expands a selectorResponsive definition through the resolver', () => {
      service.originalContent = {
        c1: { root: widget({ id: 'root', parent: '', children: ['a'] }), a: widget({ id: 'a', parent: 'root', rowNo: 2 }) },
      } as any
      resolver.renderFromJSON.mockReturnValue({
        tmp: { id: 'tmp', parent: '', children: ['leaf'] },
        leaf: { id: 'leaf', parent: 'tmp', children: [] },
      })
      const library = WIDGET_LIBRARY as any
      const original = library.selectorResponsive
      library.selectorResponsive = {
        widgetSubType: 'selectorResponsive',
        widgetData: { some: 'data' },
        dimensions: { large: 6, xLarge: 6 },
        widgetHostClass: 'hc',
        widgetHostStyle: { color: 'red' },
      }

      service.addWidget('a', 'selectorResponsive' as any)

      const stored = (service.updatedContent as any).c1.a
      expect(stored.rowNo).toBe(2)
      expect(stored.parent).toBe('root')
      expect(stored.widgetHostClass).toBe('hc')
      expect(stored.dimensions).toEqual({ large: 6, xLarge: 6 })
      library.selectorResponsive = original
    })
  })

  describe('insertNewNode — gridLayout', () => {
    it('resizes existing row siblings when changeSize is requested', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
        },
      } as any
      const incoming = widget({ id: 'b', parent: 'root', rowNo: 0 })

      service.insertNewNode(incoming, null, false, true)

      expect((service.updatedContent as any).c1.a.dimensions.large).toBe(6)
      expect(incoming.dimensions).toEqual({ xLarge: 6, large: 6 })
    })

    it('does not resize when changeSize is false', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
        },
      } as any

      service.insertNewNode(widget({ id: 'b', parent: 'root', rowNo: 0 }), null, false, false)

      // The existing sibling is left untouched, so it keeps its full-width dimensions.
      expect((service.updatedContent as any).c1.a).toBeUndefined()
      expect(service.getUpdatedContent('a').dimensions.large).toBe(12)
    })

    it('pushes later rows down when inserting a new row', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 1 }),
        },
      } as any

      service.insertNewNode(widget({ id: 'c', parent: 'root', rowNo: 1 }), null, true, false)

      expect((service.updatedContent as any).c1.b.rowNo).toBe(2)
      // Rows above the insertion point are untouched.
      expect((service.updatedContent as any).c1.a).toBeUndefined()
      expect(service.getUpdatedContent('a').rowNo).toBe(0)
    })
  })

  describe('swapPosition — row moves', () => {
    const threeRows = () =>
      ({
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b', 'c'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 1 }),
          c: widget({ id: 'c', parent: 'root', rowNo: 2 }),
        },
      }) as any

    it('moveTop swaps a row with the one above it', () => {
      service.originalContent = threeRows()
      service.swapPosition('moveTop', 1, 'root')
      expect((service.updatedContent as any).c1.b.rowNo).toBe(0)
      expect((service.updatedContent as any).c1.a.rowNo).toBe(1)
    })

    it('moveTop on the first row wraps it to the bottom', () => {
      service.originalContent = threeRows()
      service.swapPosition('moveTop', 0, 'root')
      expect((service.updatedContent as any).c1.a.rowNo).toBe(2)
      expect((service.updatedContent as any).c1.b.rowNo).toBe(0)
      expect((service.updatedContent as any).c1.c.rowNo).toBe(1)
    })

    it('moveBottom swaps a row with the one below it', () => {
      service.originalContent = threeRows()
      service.swapPosition('moveBottom', 1, 'root')
      expect((service.updatedContent as any).c1.b.rowNo).toBe(2)
      expect((service.updatedContent as any).c1.c.rowNo).toBe(1)
    })

    it('moveBottom on the last row wraps it to the top', () => {
      service.originalContent = threeRows()
      service.swapPosition('moveBottom', 2, 'root')
      expect((service.updatedContent as any).c1.c.rowNo).toBe(0)
      expect((service.updatedContent as any).c1.a.rowNo).toBe(1)
      expect((service.updatedContent as any).c1.b.rowNo).toBe(2)
    })

    it('rebuilds the parent children order from the row buckets', () => {
      service.originalContent = threeRows()
      service.swapPosition('moveTop', 1, 'root')
      expect((service.updatedContent as any).c1.root.children).toEqual(['b', 'a', 'c'])
    })

    it('moveRight wraps the last node of a row back to its start', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 0 }),
        },
      } as any

      service.swapPosition('moveRight', 'b', 'root')

      expect((service.updatedContent as any).c1.root.children).toEqual(['b', 'a'])
    })

    it('moveLeft swaps a node with its left neighbour', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 0 }),
        },
      } as any

      service.swapPosition('moveLeft', 'b', 'root')

      expect((service.updatedContent as any).c1.root.children).toEqual(['b', 'a'])
    })

    it('moveLeft on the first node of a row sends it to the row end', () => {
      service.originalContent = {
        c1: {
          root: widget({ id: 'root', parent: '', widgetSubType: 'gridLayout', children: ['a', 'b'] }),
          a: widget({ id: 'a', parent: 'root', rowNo: 0 }),
          b: widget({ id: 'b', parent: 'root', rowNo: 0 }),
        },
      } as any

      service.swapPosition('moveLeft', 'a', 'root')

      expect((service.updatedContent as any).c1.root.children).toEqual(['b', 'a'])
    })
  })
})
