import { Subject } from 'rxjs'

import { GridComponent } from './grid.component'

/**
 * Direct-instantiation unit tests for GridComponent.
 * Constructed with mocked ChannelStoreService / ChannelResolverService;
 * exercises initiate() row/gutter processing, the update subscription,
 * triggerEdit and addRow index math.
 */
describe('GridComponent', () => {
  let store: any
  let renderService: any
  let updateSubject: Subject<string>

  function makeChild(overrides: any = {}): any {
    return {
      id: 'child',
      className: 'base',
      dimensions: { small: 12, medium: 6, large: 4, xLarge: 3 },
      styles: {},
      rowNo: 0,
      ...overrides,
    }
  }

  function build(): GridComponent {
    updateSubject = new Subject<string>()
    store = {
      update: updateSubject.asObservable(),
      getUpdatedContent: jest.fn(),
      triggerEdit: jest.fn(),
      insertNewNode: jest.fn(),
    }
    renderService = {
      renderFromJSON: jest.fn(() => ({ nodeKey: { id: 'n1', parent: '', rowNo: 0 } })),
    }
    const c = new GridComponent(store, renderService)
    c.id = 'grid-1'
    return c
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs', () => {
    expect(build()).toBeTruthy()
  })

  it('ngOnChanges delegates to initiate', () => {
    const c = build()
    const spy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
    c.ngOnChanges()
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnInit re-initiates only when the store update matches this id', () => {
    const c = build()
    const spy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
    c.ngOnInit()
    updateSubject.next('other')
    expect(spy).not.toHaveBeenCalled()
    updateSubject.next('grid-1')
    expect(spy).toHaveBeenCalled()
  })

  it('initiate builds processed widgets with gutter classes and responsive suffixes', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'grid-1') {
        return { id, data: { gutter: 2 }, children: ['c1', 'c2'] }
      }
      if (id === 'c1') {
        return makeChild({ id: 'c1', className: 'card', rowNo: 0 })
      }
      return makeChild({ id: 'c2', className: 'card', rowNo: 0 })
    })
    c.initiate()
    expect(c.containerClass).toBe('-mx-2')
    expect(c.processedWidgets[0].length).toBe(2)
    const first = c.processedWidgets[0][0]
    expect(first.id).toBe('c1')
    expect(first.className).toContain('w-full')
    expect(first.className).toContain('p-2')
    expect(first.className).toContain('sm:w-full') // small: 12 -> w-full
    expect(first.className).toContain('md:w-6/12') // medium: 6
  })

  it('initiate groups children into separate rows by rowNo', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'grid-1') {
        return { id, data: { gutter: 1 }, children: ['a', 'b'] }
      }
      if (id === 'a') {
        return makeChild({ id: 'a', rowNo: 0 })
      }
      return makeChild({ id: 'b', rowNo: 1 })
    })
    c.initiate()
    expect(c.processedWidgets[0].map((w: any) => w.id)).toEqual(['a'])
    expect(c.processedWidgets[1].map((w: any) => w.id)).toEqual(['b'])
  })

  it('initiate leaves containerClass empty when gutter is null', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'grid-1') {
        return { id, data: { gutter: null }, children: [] }
      }
      return makeChild()
    })
    c.containerClass = 'stale'
    c.initiate()
    expect(c.containerClass).toBe('stale') // untouched because gutter is null
    expect(c.processedWidgets).toEqual([])
  })

  it('initiate defaults child styles to an empty object when absent', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'grid-1') {
        return { id, data: { gutter: 0 }, children: ['c1'] }
      }
      return makeChild({ id: 'c1', styles: undefined })
    })
    c.initiate()
    expect(c.processedWidgets[0][0].styles).toEqual({})
  })

  it('triggerEdit delegates to the store', () => {
    const c = build()
    c.triggerEdit('w-9')
    expect(store.triggerEdit).toHaveBeenCalledWith('w-9')
  })

  it('addRow appends a new row at the end when no rowNo is provided', () => {
    const c = build()
    c.processedWidgets = [[{}], [{}]] as any
    c.addRow()
    const [node, index, flag] = store.insertNewNode.mock.calls[0]
    expect(node.parent).toBe('grid-1')
    expect(node.rowNo).toBe(2) // processedWidgets.length
    expect(index).toBeUndefined()
    expect(flag).toBe(false)
  })

  it('addRow inserts at a computed index when a rowNo is provided', () => {
    const c = build()
    // row 0 has 2 widgets, row 1 has 3 widgets
    c.processedWidgets = [
      [{}, {}],
      [{}, {}, {}],
    ] as any
    c.addRow(2)
    const [node, index, flag] = store.insertNewNode.mock.calls[0]
    expect(node.rowNo).toBe(2)
    expect(index).toBe(5) // 2 + 3 preceding widgets
    expect(flag).toBe(true)
  })
})
