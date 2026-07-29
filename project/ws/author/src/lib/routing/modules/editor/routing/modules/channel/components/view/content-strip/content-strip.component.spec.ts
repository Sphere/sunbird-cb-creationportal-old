import { Subject } from 'rxjs'
import { ContentStripComponent } from './content-strip.component'

describe('ContentStripComponent', () => {
  let component: ContentStripComponent
  let renderService: any
  let store: any
  let update$: Subject<string>

  const build = () => new ContentStripComponent(renderService, store)

  beforeEach(() => {
    update$ = new Subject<string>()
    renderService = { renderFromJSON: jest.fn() }
    store = {
      update: update$,
      getUpdatedContent: jest.fn(),
      updateContent: jest.fn(),
      triggerEdit: jest.fn(),
    }
    component = build()
    component.id = 'root-id'
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('initiate should bucket children into noData / error / widgets', () => {
    const contents: Record<string, any> = {
      'root-id': { id: 'root-id', children: ['c1', 'c2', 'c3'] },
      c1: { id: 'c1', purpose: 'noDataWidget' },
      c2: { id: 'c2', purpose: 'errorWidget' },
      c3: { id: 'c3', purpose: 'holder' },
    }
    store.getUpdatedContent.mockImplementation((id: string) => contents[id])

    component.initiate()

    expect(component.widget).toBe(contents['root-id'])
    expect(component.widgetMap.noData).toBe('c1')
    expect(component.widgetMap.error).toBe('c2')
    expect(component.widgetMap.widgets).toEqual(['c3'])
    // widgets present -> no render fallback
    expect(renderService.renderFromJSON).not.toHaveBeenCalled()
  })

  it('initiate should render a holder when there are no widgets', () => {
    jest.useFakeTimers()
    const rootWidget = { id: 'root-id', children: [] as string[] }
    store.getUpdatedContent.mockImplementation((id: string) => (id === 'root-id' ? rootWidget : { id, purpose: 'noDataWidget' }))
    renderService.renderFromJSON.mockReturnValue({
      'new-node': { id: 'new-node' },
    })

    component.initiate()

    expect(renderService.renderFromJSON).toHaveBeenCalled()
    // holder node wired to parent and pushed to children
    expect(rootWidget.children).toContain('new-node')
    expect(store.updateContent).toHaveBeenCalledWith(
      'new-node',
      expect.objectContaining({
        id: 'new-node',
        parent: 'root-id',
        purpose: 'holder',
      }),
      false,
    )
    expect(store.updateContent).toHaveBeenCalledWith('root-id', rootWidget, false)

    jest.advanceTimersByTime(10)
    expect(store.triggerEdit).toHaveBeenCalledWith('new-node')
  })

  it('ngOnChanges should call initiate', () => {
    const spy = jest.spyOn(component, 'initiate').mockImplementation(() => {})
    component.ngOnChanges()
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnInit should re-initiate only when store emits matching id', () => {
    const spy = jest.spyOn(component, 'initiate').mockImplementation(() => {})
    component.ngOnInit()

    update$.next('other-id')
    expect(spy).not.toHaveBeenCalled()

    update$.next('root-id')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('triggerEdit should delegate to store', () => {
    component.triggerEdit('abc')
    expect(store.triggerEdit).toHaveBeenCalledWith('abc')
  })
})
