import { Subject } from 'rxjs'
import { TabComponent } from './tab.component'

describe('TabComponent', () => {
  let store: any
  let update$: Subject<string>
  let component: TabComponent

  const build = () => new TabComponent(store)

  beforeEach(() => {
    update$ = new Subject<string>()
    store = {
      update: update$,
      getUpdatedContent: jest.fn(),
      triggerEdit: jest.fn(),
    }
    component = build()
  })

  it('should create with default input state', () => {
    expect(component).toBeTruthy()
    expect(component.id).toBe('')
    expect(component.isSubmitPressed).toBe(false)
  })

  describe('initiate', () => {
    it('builds widgetDatas from the widget children', () => {
      component.id = 'root'
      const rootWidget = { children: ['c1', 'c2'] }
      store.getUpdatedContent.mockImplementation((id: string) => {
        if (id === 'root') {
          return rootWidget
        }
        if (id === 'c1') {
          return { addOnData: { title: 'First' } }
        }
        return { addOnData: { title: 'Second' } }
      })

      component.initiate()

      expect(component.widget).toBe(rootWidget)
      expect(component.widgetDatas).toEqual([
        { id: 'c1', title: 'First' },
        { id: 'c2', title: 'Second' },
      ])
    })

    it('resets widgetDatas to empty when there are no children', () => {
      component.id = 'root'
      store.getUpdatedContent.mockReturnValue({ children: [] })

      component.initiate()

      expect(component.widgetDatas).toEqual([])
    })

    it('leaves widgetDatas empty when widget is falsy', () => {
      component.id = 'root'
      store.getUpdatedContent.mockReturnValue(undefined)

      component.initiate()

      expect(component.widgetDatas).toEqual([])
      expect(component.widget).toBeUndefined()
    })
  })

  describe('ngOnChanges', () => {
    it('re-initiates on input changes', () => {
      const spy = jest.spyOn(component, 'initiate')
      store.getUpdatedContent.mockReturnValue({ children: [] })

      component.ngOnChanges()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('ngOnInit', () => {
    it('re-initiates when the store emits the matching id', () => {
      component.id = 'root'
      store.getUpdatedContent.mockReturnValue({ children: [] })
      const spy = jest.spyOn(component, 'initiate')

      component.ngOnInit()
      update$.next('root')

      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('ignores store emissions for a different id', () => {
      component.id = 'root'
      const spy = jest.spyOn(component, 'initiate')

      component.ngOnInit()
      update$.next('other')

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('triggerEdit', () => {
    it('delegates to the store', () => {
      component.triggerEdit('c1')
      expect(store.triggerEdit).toHaveBeenCalledWith('c1')
    })
  })
})
