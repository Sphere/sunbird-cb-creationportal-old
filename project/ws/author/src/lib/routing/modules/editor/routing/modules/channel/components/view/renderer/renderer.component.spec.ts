import { of, Subject } from 'rxjs'

import { RendererComponent } from './renderer.component'

/**
 * Direct-instantiation unit tests for RendererComponent.
 * Constructed with mocked store / dialog / snackbar / resolver collaborators;
 * exercises public methods and the initiate() branches instead of full render.
 */
describe('RendererComponent', () => {
  let store: any
  let snackBar: any
  let dialog: any
  let renderService: any
  let updateSubject: Subject<string>

  function makeWidget(overrides: any = {}): any {
    return {
      widgetSubType: '',
      widgetType: '',
      widgetHostClass: '',
      widgetHostStyle: '',
      data: {},
      children: [],
      parent: 'root',
      rowNo: 0,
      purpose: '',
      addOnData: {},
      ...overrides,
    }
  }

  function build(): RendererComponent {
    updateSubject = new Subject<string>()
    store = {
      update: updateSubject.asObservable(),
      getUpdatedContent: jest.fn((id: string) => makeWidget({ id })),
      triggerEdit: jest.fn(),
      deleteNode: jest.fn(),
      addWidget: jest.fn(),
      insertNewNode: jest.fn(),
      updateContent: jest.fn(),
    }
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(true) })) }
    renderService = { renderFromJSON: jest.fn(() => ({ key1: makeWidget() })) }
    const c = new RendererComponent(store, snackBar, dialog, renderService)
    c.id = 'w-1'
    return c
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs', () => {
    expect(build()).toBeTruthy()
  })

  it('ngOnInit re-initiates only when the store update matches this id', () => {
    const c = build()
    c.ngOnInit()
    const spy = jest.spyOn(c, 'initiate')
    updateSubject.next('other')
    expect(spy).not.toHaveBeenCalled()
    updateSubject.next('w-1')
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnChanges calls initiate', () => {
    const c = build()
    const spy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
    c.ngOnChanges()
    expect(spy).toHaveBeenCalled()
  })

  it('initiate builds a leaf widget when there are no children', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'w-1') {
        return makeWidget({ widgetSubType: 'card', widgetType: 'cardType', parent: 'p', children: [] })
      }
      return makeWidget({ widgetSubType: 'plain' })
    })
    c.initiate()
    expect(c.widget.widgetSubType).toBe('card')
    expect(c.widget.widgetType).toBe('cardType')
    expect(c.canHaveChild).toBe(false)
  })

  it('initiate sets canHaveSibling when the parent is a gridLayout', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'w-1') {
        return makeWidget({ parent: 'p', children: [] })
      }
      return makeWidget({ widgetSubType: 'gridLayout' })
    })
    c.initiate()
    expect(c.canHaveSibling).toBe(true)
  })

  it('initiate sets canHaveChild for a container widget subtype', () => {
    const c = build()
    store.getUpdatedContent = jest.fn((id: string) => {
      if (id === 'w-1') {
        return makeWidget({ widgetSubType: 'linearLayout', parent: 'p', children: [] })
      }
      return makeWidget()
    })
    c.initiate()
    expect(c.canHaveChild).toBe(true)
  })

  it('loadSelectorWidget collects child addOnData for a selectorResponsive widget', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'selectorResponsive', children: ['c1', 'c2'] })
    store.getUpdatedContent = jest.fn((id: string) => makeWidget({ addOnData: { tag: id } }))
    c.loadSelectorWidget()
    expect(c.selectorWidget).toEqual([{ tag: 'c1' }, { tag: 'c2' }])
  })

  it('loadSelectorWidget does nothing for non-selector widgets', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'card', children: ['c1'] })
    c.selectorWidget = undefined as any
    c.loadSelectorWidget()
    expect(c.selectorWidget).toBeUndefined()
  })

  it('loadContentStripWidget buckets children into info / error / noData / widgets', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'contentStripMultiple', children: ['info1', 'err1', 'nd1', 'w1'] })
    store.getUpdatedContent = jest.fn((id: string) => {
      const map: any = {
        info1: { purpose: 'info' },
        err1: { purpose: 'errorWidget' },
        nd1: { purpose: 'noDataWidget' },
        w1: { purpose: 'card' },
      }
      return map[id]
    })
    c.loadContentStripWidget()
    expect(c.widgetMap.info).toBe('info1')
    expect(c.widgetMap.error).toBe('err1')
    expect(c.widgetMap.noData).toBe('nd1')
    expect(c.widgetMap.widgets).toEqual(['w1'])
  })

  it('loadContentStripWidget does nothing for unrelated widgets', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'card', children: [] })
    c.widgetMap = undefined
    c.loadContentStripWidget()
    expect(c.widgetMap).toBeUndefined()
  })

  it('triggerEdit delegates to the store', () => {
    const c = build()
    c.triggerEdit()
    expect(store.triggerEdit).toHaveBeenCalledWith('w-1')
  })

  it('triggerDelete deletes the node and shows a snackbar when confirmed', () => {
    const c = build()
    dialog.open = jest.fn(() => ({ afterClosed: () => of(true) }))
    c.triggerDelete()
    expect(store.deleteNode).toHaveBeenCalledWith('w-1')
    expect(snackBar.openFromComponent).toHaveBeenCalled()
  })

  it('triggerDelete does nothing when the dialog is dismissed', () => {
    const c = build()
    dialog.open = jest.fn(() => ({ afterClosed: () => of(false) }))
    c.triggerDelete()
    expect(store.deleteNode).not.toHaveBeenCalled()
    expect(snackBar.openFromComponent).not.toHaveBeenCalled()
  })

  it('dragover_handler prevents default and sets copy effect', () => {
    const c = build()
    const ev = { preventDefault: jest.fn(), dataTransfer: {} as any }
    c.dragover_handler(ev)
    expect(ev.preventDefault).toHaveBeenCalled()
    expect(ev.dataTransfer.dropEffect).toBe('copy')
  })

  it('drop_handler adds a widget and triggers edit for non-strip drops', () => {
    jest.useFakeTimers()
    const c = build()
    const editSpy = jest.spyOn(c, 'triggerEdit')
    const ev = { preventDefault: jest.fn(), dataTransfer: { getData: jest.fn(() => 'card') } }
    c.drop_handler(ev)
    expect(store.addWidget).toHaveBeenCalledWith('w-1', 'card')
    jest.runAllTimers()
    expect(editSpy).toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('drop_handler does not trigger edit for a strip drop', () => {
    jest.useFakeTimers()
    const c = build()
    const editSpy = jest.spyOn(c, 'triggerEdit')
    const ev = { preventDefault: jest.fn(), dataTransfer: { getData: jest.fn(() => 'strip') } }
    c.drop_handler(ev)
    expect(store.addWidget).toHaveBeenCalledWith('w-1', 'strip')
    jest.runAllTimers()
    expect(editSpy).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('generateNextNode inserts a sibling node using the parent index + 1', () => {
    const c = build()
    c.widgetData = makeWidget({ parent: 'parent-1', rowNo: 3, purpose: 'holder', widgetSubType: 'card' })
    renderService.renderFromJSON = jest.fn(() => ({ nodeKey: makeWidget() }))
    store.getUpdatedContent = jest.fn(() => makeWidget({ children: ['a', 'w-1', 'b'] }))
    c.generateNextNode(false)
    expect(store.insertNewNode).toHaveBeenCalledWith(expect.objectContaining({ parent: 'parent-1', rowNo: 3 }), 2)
  })

  it('generateNextNode inserts a child node with an info addOnData when purpose is info', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'card' })
    renderService.renderFromJSON = jest.fn(() => ({ nodeKey: makeWidget() }))
    c.generateNextNode(true, 'info')
    const inserted = store.insertNewNode.mock.calls[0][0]
    expect(inserted.parent).toBe('w-1')
    expect(inserted.addOnData.mode).toBe('below')
    expect(inserted.addOnData.icon.icon).toBe('info')
  })

  it('generateNextNode sets currentIndex for a selectorResponsive widget', () => {
    jest.useFakeTimers()
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'selectorResponsive', children: ['a', 'b', 'c'] })
    renderService.renderFromJSON = jest.fn(() => ({ nodeKey: makeWidget() }))
    c.generateNextNode(true)
    jest.runAllTimers()
    expect(c.currentIndex).toBe(2)
    jest.useRealTimers()
  })

  it('generateNextNode updates showData for a contentStripMultiple noData widget', () => {
    jest.useFakeTimers()
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'contentStripMultiple', children: [] })
    renderService.renderFromJSON = jest.fn(() => ({ nodeKey: makeWidget() }))
    c.generateNextNode(true, 'noDataWidget')
    jest.runAllTimers()
    expect(c.showData).toBe('noData')
    jest.useRealTimers()
  })

  it('toggleDefault switches a plain widget into an errorResolver and persists it', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: '', widgetType: '', purpose: 'noDataWidget' })
    c.toggleDefault()
    expect(c.widgetData.widgetSubType).toBe('errorResolver')
    expect(c.widgetData.data.errorType).toBe('contentUnavailable')
    expect(store.updateContent).toHaveBeenCalledWith('w-1', c.widgetData)
  })

  it('toggleDefault switches an errorResolver back to a plain widget', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: 'errorResolver', widgetType: 'errorResolver', data: { errorType: 'x' } })
    c.toggleDefault()
    expect(c.widgetData.widgetSubType).toBe('')
    expect(c.widgetData.widgetType).toBe('')
    expect(c.widgetData.data).toEqual({})
    expect(store.updateContent).toHaveBeenCalledWith('w-1', c.widgetData)
  })

  it('toggleDefault uses internalServer errorType for a non-noData purpose', () => {
    const c = build()
    c.widgetData = makeWidget({ widgetSubType: '', purpose: 'errorWidget' })
    c.toggleDefault()
    expect(c.widgetData.data.errorType).toBe('internalServer')
  })
})
