import { BehaviorSubject } from 'rxjs'
import { GalleryComponent } from './gallery.component'

describe('GalleryComponent', () => {
  let component: GalleryComponent
  let store: any
  let renderService: any

  const childData = (over: any = {}) => ({
    addOnData: { thumbnail: 'thumb.png', title: 'A title', description: 'A description' },
    ...over,
  })

  const build = () => new GalleryComponent(store, renderService)

  beforeEach(() => {
    store = {
      update: new BehaviorSubject<string>(''),
      getUpdatedContent: jest.fn(),
      updateContent: jest.fn(),
      triggerEdit: jest.fn(),
    }
    renderService = {
      renderFromJSON: jest.fn(),
    }
    component = build()
    component.id = 'root'
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.defaultVal).toBe('set1')
    expect(component.currentIndex).toBe(0)
  })

  describe('ngOnInit', () => {
    it('runs initiate when the store emits the matching id', () => {
      const spy = jest.spyOn(component, 'initiate').mockImplementation(() => {})
      component.ngOnInit()
      store.update.next('root')
      expect(spy).toHaveBeenCalled()
    })

    it('ignores an emission for another widget', () => {
      const spy = jest.spyOn(component, 'initiate').mockImplementation(() => {})
      component.ngOnInit()
      spy.mockClear()
      store.update.next('some-other-id')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('ngOnChanges', () => {
    it('delegates to initiate', () => {
      const spy = jest.spyOn(component, 'initiate').mockImplementation(() => {})
      component.ngOnChanges()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('initiate', () => {
    it('builds widgetDatas from children when designVal is set1', () => {
      const widget = { data: { designVal: 'set1' }, children: ['c1', 'c2'] }
      store.getUpdatedContent.mockImplementation((id: string) => {
        if (id === 'root') {
          return widget
        }
        return childData({ addOnData: { thumbnail: `${id}.png`, title: id, description: `desc-${id}` } })
      })
      component.initiate()
      expect(component.defaultVal).toBe('set1')
      expect(component.currentWidget).toBe('c1')
      expect(component.widgetDatas.length).toBe(2)
      expect(component.widgetDatas[0]).toEqual({ id: 'c1', thumbnail: 'c1.png', title: 'c1', description: 'desc-c1' })
    })

    it('honours a custom designVal and does not populate the set1 gallery', () => {
      const widget = { data: { designVal: 'set2' }, children: ['c1'] }
      store.getUpdatedContent.mockReturnValue(widget)
      component.initiate()
      expect(component.defaultVal).toBe('set2')
      expect(component.widgetDatas.length).toBe(0)
    })

    it('keeps the current widget when it is still a valid child', () => {
      const widget = { data: { designVal: 'set1' }, children: ['c1', 'c2'] }
      store.getUpdatedContent.mockImplementation((id: string) => (id === 'root' ? widget : childData()))
      component.currentWidget = 'c2'
      component.initiate()
      expect(component.currentWidget).toBe('c2')
    })

    it('creates a child node when the widget has no children', () => {
      const widget = { data: {}, children: [] as string[] }
      store.getUpdatedContent.mockReturnValue(widget)
      renderService.renderFromJSON.mockReturnValue({ nodeA: { id: 'nodeA', parent: '' } })
      component.initiate()
      expect(widget.children).toContain('nodeA')
      expect(store.updateContent).toHaveBeenCalledWith('nodeA', expect.objectContaining({ id: 'nodeA', parent: 'root' }), false)
      expect(store.updateContent).toHaveBeenCalledWith('root', widget, false)
    })

    it('does nothing when there is no widget', () => {
      store.getUpdatedContent.mockReturnValue(undefined)
      component.initiate()
      expect(component.widgetDatas).toEqual([])
      expect(renderService.renderFromJSON).not.toHaveBeenCalled()
    })
  })

  describe('changeWidget', () => {
    it('updates the current widget', () => {
      component.changeWidget('c9')
      expect(component.currentWidget).toBe('c9')
    })
  })

  describe('slideTo', () => {
    beforeEach(() => {
      component.widget = { children: ['a', 'b', 'c'] } as any
    })

    it('sets the index inside the valid range', () => {
      component.slideTo(1)
      expect(component.currentIndex).toBe(1)
    })

    it('wraps to zero when index equals the length', () => {
      component.slideTo(3)
      expect(component.currentIndex).toBe(0)
    })

    it('wraps a negative index to the end of the list', () => {
      component.slideTo(-1)
      expect(component.currentIndex).toBe(2)
    })
  })

  describe('triggerEdit', () => {
    it('forwards the id to the store', () => {
      component.triggerEdit('c1')
      expect(store.triggerEdit).toHaveBeenCalledWith('c1')
    })
  })
})
