import { Subject } from 'rxjs'
import { SortableListDirective } from './sortable-list.directive'

class FakeQueryList<T> {
  changes = new Subject<void>()
  constructor(private items: T[]) {}
  get length(): number {
    return this.items.length
  }
  forEach(fn: (item: T) => void): void {
    this.items.forEach(fn)
  }
  map<R>(fn: (item: T) => R): R[] {
    return this.items.map(fn)
  }
  toArray(): T[] {
    return this.items.slice()
  }
}

const makeSortable = (rect: any) => ({
  dragStart: new Subject<void>(),
  dragMove: new Subject<any>(),
  element: { nativeElement: { getBoundingClientRect: jest.fn().mockReturnValue(rect) } },
})

const rectOf = (over: any = {}) =>
  ({
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    top: 0,
    right: 20,
    bottom: 20,
    left: 0,
    ...over,
  }) as any

describe('SortableListDirective', () => {
  let directive: SortableListDirective
  let changeDetector: any
  let elementRef: any
  let scrollHelper: any

  beforeEach(() => {
    changeDetector = { detach: jest.fn(), detectChanges: jest.fn() }
    elementRef = {
      nativeElement: {
        children: [{ children: [{}, { scrollLeft: 5, scrollTop: 7 }] }],
      },
    }
    scrollHelper = { scrollIfNecessary: jest.fn() }
    directive = new SortableListDirective(changeDetector, elementRef, scrollHelper)
  })

  it('should be created', () => {
    expect(directive).toBeTruthy()
  })

  it('initialises with a blank client rect', () => {
    expect(directive.newClientRect).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  })

  describe('ngOnDestroy', () => {
    it('detaches change detection and unsubscribes', () => {
      const sub = { unsubscribe: jest.fn() }
      directive.subscriptions = [sub as any]
      directive.ngOnDestroy()
      expect(changeDetector.detach).toHaveBeenCalled()
      expect(sub.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('ngAfterContentInit / initializeSortable', () => {
    it('subscribes to drag start and move for each sortable', () => {
      const s0 = makeSortable(rectOf())
      directive.sortables = new FakeQueryList([s0]) as any
      directive.ngAfterContentInit()
      expect(directive.subscriptions.length).toBe(2)
    })

    it('measures rects on drag start', () => {
      const s0 = makeSortable(rectOf())
      directive.sortables = new FakeQueryList([s0]) as any
      directive.ngAfterContentInit()
      s0.dragStart.next()
      expect(directive.clientRects.length).toBe(1)
      expect(s0.element.nativeElement.getBoundingClientRect).toHaveBeenCalled()
    })

    it('scrolls and detects sorting on drag move', () => {
      const s0 = makeSortable(rectOf())
      directive.sortables = new FakeQueryList([s0]) as any
      directive.ngAfterContentInit()
      const event = { pageX: 1, pageY: 1 }
      s0.dragMove.next(event)
      expect(scrollHelper.scrollIfNecessary).toHaveBeenCalledWith(elementRef, event)
    })
  })

  describe('ngAfterViewInit', () => {
    it('records the sortable count and re-initialises when it changes', () => {
      const list = new FakeQueryList([makeSortable(rectOf())])
      directive.sortables = list as any
      directive.ngAfterViewInit()
      expect(directive.numberOfSortable).toBe(1)

      const unsub = jest.fn()
      directive.subscriptions = [{ unsubscribe: unsub } as any]
      ;(list as any).items = [makeSortable(rectOf()), makeSortable(rectOf())]
      list.changes.next()

      expect(unsub).toHaveBeenCalled()
      expect(changeDetector.detectChanges).toHaveBeenCalled()
      expect(directive.numberOfSortable).toBe(2)
    })

    it('does nothing when the count is unchanged', () => {
      const list = new FakeQueryList([makeSortable(rectOf())])
      directive.sortables = list as any
      directive.ngAfterViewInit()
      list.changes.next()
      expect(changeDetector.detectChanges).not.toHaveBeenCalled()
    })
  })

  describe('unSubscribeEvents', () => {
    it('unsubscribes each stored subscription', () => {
      const a = { unsubscribe: jest.fn() }
      const b = { unsubscribe: jest.fn() }
      directive.subscriptions = [a as any, b as any]
      directive.unSubscribeEvents()
      expect(a.unsubscribe).toHaveBeenCalled()
      expect(b.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('measureClientRects', () => {
    it('offsets each rect by the scroll position', () => {
      const s0 = makeSortable(rectOf({ x: 10, left: 10, right: 30, y: 5, top: 5, bottom: 25 }))
      directive.sortables = new FakeQueryList([s0]) as any
      directive['measureClientRects']()
      const r = directive.clientRects[0] as any
      expect(r.width).toBe(20)
      expect(r.left).toBe(15) // 10 + scrollLeft 5
      expect(r.top).toBe(12) // 5 + scrollTop 7
    })
  })

  describe('detectSorting', () => {
    it('emits a sort event when the pointer moves past a neighbour', () => {
      const s0 = makeSortable(rectOf())
      const s1 = makeSortable(rectOf())
      directive.sortables = new FakeQueryList([s0, s1]) as any
      directive.clientRects = [rectOf({ left: 0, width: 20, top: 0 }), rectOf({ left: 100, width: 20, top: 0 })]
      const emitted: any[] = []
      directive.sort.subscribe(e => emitted.push(e))
      directive['detectSorting'](s0 as any, { pageX: 200, pageY: 0 } as any)
      expect(emitted).toEqual([{ currentIndex: 0, newIndex: 1 }])
    })

    it('does not emit when the pointer stays put', () => {
      const s0 = makeSortable(rectOf())
      const s1 = makeSortable(rectOf())
      directive.sortables = new FakeQueryList([s0, s1]) as any
      directive.clientRects = [rectOf({ left: 0, width: 20, top: 0 }), rectOf({ left: 100, width: 20, top: 0 })]
      const emitted: any[] = []
      directive.sort.subscribe(e => emitted.push(e))
      directive['detectSorting'](s0 as any, { pageX: 1, pageY: 0 } as any)
      expect(emitted).toEqual([])
    })
  })
})
