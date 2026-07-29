import { of, Subject } from 'rxjs'
import { RendererV2Component } from './renderer-v2.component'

describe('RendererV2Component', () => {
  let store: any
  let snackBar: any
  let dialog: any
  let renderService: any

  const build = () => {
    const c = new RendererV2Component(store, snackBar, dialog, renderService)
    c.id = 'root'
    return c
  }

  beforeEach(() => {
    store = {
      update: of('root'),
      getUpdatedContent: jest.fn(),
      triggerEdit: jest.fn(),
      insertNewNode: jest.fn(),
      addWidget: jest.fn(),
      deleteNode: jest.fn(),
      swapPosition: jest.fn(),
    }
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn() }
    renderService = {
      renderFromJSON: jest.fn().mockReturnValue({ n1: { id: 'n1' } }),
    }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('should call initiate when store emits matching id', () => {
      store.update = of('root')
      store.getUpdatedContent.mockReturnValue({ data: { gutter: null }, children: [] })
      const c = build()
      const spy = jest.spyOn(c, 'initiate')
      c.ngOnInit()
      expect(spy).toHaveBeenCalled()
    })

    it('should not call initiate when id does not match', () => {
      store.update = of('other')
      const c = build()
      const spy = jest.spyOn(c, 'initiate')
      c.ngOnInit()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('ngOnChanges', () => {
    it('should call initiate', () => {
      store.getUpdatedContent.mockReturnValue({ data: { gutter: null }, children: [] })
      const c = build()
      const spy = jest.spyOn(c, 'initiate')
      c.ngOnChanges()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('initiate', () => {
    it('should build processedWidgets grouped by rowNo and set containerClass on gutter', () => {
      store.getUpdatedContent.mockImplementation((id: string) => {
        if (id === 'root') {
          return { data: { gutter: 2 }, children: ['c1', 'c2'] }
        }
        return {
          id,
          className: 'cls',
          dimensions: { small: 12, medium: 6, large: 3, xLarge: 3 },
          styles: {},
          widgetSubType: 'elementHtml',
          rowNo: 0,
        }
      })
      const c = build()
      c.initiate()
      expect(c.containerClass).toBe('-mx-2')
      expect(c.processedWidgets[0].length).toBe(2)
      expect(c.processedWidgets[0][0].isEmpty).toBe(false)
    })

    it('should mark empty widgets and place across rows', () => {
      store.getUpdatedContent.mockImplementation((id: string) => {
        if (id === 'root') {
          return { data: { gutter: null }, children: ['c1', 'c2'] }
        }
        return {
          id,
          className: 'cls',
          dimensions: { small: 12, medium: 12, large: 12, xLarge: 12 },
          styles: undefined,
          widgetSubType: '',
          rowNo: id === 'c1' ? 0 : 1,
        }
      })
      const c = build()
      c.initiate()
      expect(c.processedWidgets[0][0].isEmpty).toBe(true)
      expect(c.processedWidgets[1][0].isEmpty).toBe(true)
    })
  })

  describe('triggerEdit', () => {
    it('should delegate to store', () => {
      const c = build()
      c.triggerEdit('x')
      expect(store.triggerEdit).toHaveBeenCalledWith('x')
    })
  })

  describe('addRow', () => {
    it('should insert a new full-width node at end when no rowNo', () => {
      const c = build()
      c.processedWidgets = [[{ id: 'a' } as any]]
      c.addRow()
      expect(renderService.renderFromJSON).toHaveBeenCalled()
      const node = store.insertNewNode.mock.calls[0][0]
      expect(node.parent).toBe('root')
      expect(node.rowNo).toBe(1)
      expect(node.dimensions.large).toBe(12)
      expect(store.insertNewNode).toHaveBeenCalledWith(node, undefined, false)
    })

    it('should compute insertion index when rowNo provided', () => {
      const c = build()
      c.processedWidgets = [[{ id: 'a' } as any, { id: 'b' } as any], [{ id: 'c' } as any]]
      c.addRow(1)
      const args = store.insertNewNode.mock.calls[0]
      expect(args[1]).toBe(2)
      expect(args[2]).toBe(true)
    })
  })

  describe('dragover_handler', () => {
    it('should prevent default and set copy dropEffect', () => {
      const ev = { preventDefault: jest.fn(), dataTransfer: {} as any }
      build().dragover_handler(ev, 0)
      expect(ev.preventDefault).toHaveBeenCalled()
      expect(ev.dataTransfer.dropEffect).toBe('copy')
    })
  })

  describe('drop_handler', () => {
    const makeEv = (data: string) => ({
      preventDefault: jest.fn(),
      dataTransfer: { getData: jest.fn().mockReturnValue(data) },
    })

    it('should add widget into a single empty cell', () => {
      jest.useFakeTimers()
      store.getUpdatedContent.mockReturnValue({ widgetSubType: '' })
      const c = build()
      c.processedWidgets = [[{ id: 'cell0' } as any]]
      const editSpy = jest.spyOn(c, 'triggerEdit')
      const initSpy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
      c.drop_handler(makeEv('one_html'), 0)
      expect(store.addWidget).toHaveBeenCalledWith('cell0', 'one_html')
      jest.runAllTimers()
      expect(editSpy).toHaveBeenCalled()
      initSpy.mockRestore()
      jest.useRealTimers()
    })

    it('should show resolution-mismatch snackbar when total size exceeds 12', () => {
      // existing cell occupies large 12; adding another large widget overflows
      store.getUpdatedContent.mockReturnValue({
        widgetSubType: 'elementHtml',
        dimensions: { large: 12, xLarge: 12 },
      })
      const c = build()
      c.processedWidgets = [[{ id: 'a' } as any, { id: 'b' } as any]]
      c.drop_handler(makeEv('four_html'), 0)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(store.insertNewNode).not.toHaveBeenCalled()
    })

    it('should insert a new node and widget when capacity allows', () => {
      jest.useFakeTimers()
      store.getUpdatedContent.mockReturnValue({
        widgetSubType: 'elementHtml',
        dimensions: { large: 3, xLarge: 3 },
      })
      renderService.renderFromJSON.mockReturnValue({ nn: { id: 'nn' } })
      const c = build()
      c.processedWidgets = [[{ id: 'a' } as any]]
      const initSpy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
      c.drop_handler(makeEv('one_html'), 0)
      expect(store.insertNewNode).toHaveBeenCalled()
      expect(store.addWidget).toHaveBeenCalledWith('nn', 'one_html')
      jest.runAllTimers()
      initSpy.mockRestore()
      jest.useRealTimers()
    })
  })

  describe('triggerDelete', () => {
    it('should delete a string node id on confirm', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const c = build()
      c.triggerDelete('node1')
      expect(store.deleteNode).toHaveBeenCalledWith('node1')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('should delete all nodes in a row when id is numeric', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const c = build()
      c.processedWidgets = [[{ id: 'a' } as any, { id: 'b' } as any]]
      const initSpy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
      c.triggerDelete(0)
      expect(store.deleteNode).toHaveBeenCalledWith('a', false)
      expect(store.deleteNode).toHaveBeenCalledWith('b', false)
      initSpy.mockRestore()
    })

    it('should do nothing when not confirmed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      const c = build()
      c.triggerDelete('node1')
      expect(store.deleteNode).not.toHaveBeenCalled()
    })
  })

  describe('swapPosition', () => {
    it('should delegate to store and re-initiate', () => {
      store.getUpdatedContent.mockReturnValue({ data: { gutter: null }, children: [] })
      const c = build()
      const spy = jest.spyOn(c, 'initiate')
      c.swapPosition('up', 2)
      expect(store.swapPosition).toHaveBeenCalledWith('up', 2, 'root')
      expect(spy).toHaveBeenCalled()
    })
  })
})
