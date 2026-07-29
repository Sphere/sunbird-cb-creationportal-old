import { Subject } from 'rxjs'

import { SelectorResponsiveComponent } from './selector-responsive.component'

/**
 * Direct-instantiation unit tests for SelectorResponsiveComponent.
 * ChannelStoreService and ChannelResolverService are mocked; the store update
 * stream and the initiate() leaf-seeding branch are exercised without rendering.
 */
describe('SelectorResponsiveComponent', () => {
  let store: any
  let renderService: any
  let updateSubject: Subject<string>

  function build(): SelectorResponsiveComponent {
    updateSubject = new Subject<string>()
    store = {
      update: updateSubject.asObservable(),
      getUpdatedContent: jest.fn(() => ({ children: ['existing'] })),
      updateContent: jest.fn(),
      triggerEdit: jest.fn(),
    }
    renderService = {
      renderFromJSON: jest.fn(() => ({ nodeKey: { id: 'new-node' } })),
    }
    const c = new SelectorResponsiveComponent(store, renderService)
    c.id = 'sel-1'
    return c
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs with default inputs', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.currentIndex).toBe(0)
    expect(c.isSubmitPressed).toBe(false)
  })

  it('ngOnInit re-initiates only when the store update matches this id', () => {
    const c = build()
    c.ngOnInit()
    const spy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
    updateSubject.next('other')
    expect(spy).not.toHaveBeenCalled()
    updateSubject.next('sel-1')
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnChanges calls initiate', () => {
    const c = build()
    const spy = jest.spyOn(c, 'initiate').mockImplementation(() => undefined)
    c.ngOnChanges()
    expect(spy).toHaveBeenCalled()
  })

  it('initiate leaves a widget that already has children untouched', () => {
    const c = build()
    c.initiate()
    expect(c.widget).toEqual({ children: ['existing'] })
    expect(renderService.renderFromJSON).not.toHaveBeenCalled()
    expect(store.updateContent).not.toHaveBeenCalled()
  })

  it('initiate seeds a child leaf when the widget has an empty children array', () => {
    const c = build()
    store.getUpdatedContent = jest.fn(() => ({ children: [] }))
    c.initiate()

    expect(renderService.renderFromJSON).toHaveBeenCalled()
    expect(c.widget.children).toEqual(['new-node'])
    // the leaf node is persisted, then the parent widget is persisted
    expect(store.updateContent).toHaveBeenNthCalledWith(
      1,
      'new-node',
      expect.objectContaining({ id: 'new-node', parent: 'sel-1', addOnData: { minWidth: 0, maxWidth: 100000 } }),
      false,
    )
    expect(store.updateContent).toHaveBeenNthCalledWith(2, 'sel-1', c.widget, false)
  })

  it('initiate does nothing when the store has no widget for the id', () => {
    const c = build()
    store.getUpdatedContent = jest.fn(() => undefined)
    c.initiate()
    expect(c.widget).toBeUndefined()
    expect(store.updateContent).not.toHaveBeenCalled()
  })

  it('triggerEdit delegates to the store', () => {
    const c = build()
    c.triggerEdit()
    expect(store.triggerEdit).toHaveBeenCalledWith('sel-1')
  })
})
