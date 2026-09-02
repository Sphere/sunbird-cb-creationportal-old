import { Subject } from 'rxjs'
import { DraggableHelperDirective } from './draggable-helper.directive'

describe('DraggableHelperDirective', () => {
  let draggable: any
  let templateRef: any
  let viewContainerRef: any
  let overlay: any
  let overlayRef: any
  let positionStrategy: any
  let directive: DraggableHelperDirective

  const rect = { left: 10, top: 20, width: 100, height: 40 }

  beforeEach(() => {
    draggable = {
      dragStart: new Subject<any>(),
      dragMove: new Subject<any>(),
      dragEnd: new Subject<void>(),
      element: { nativeElement: { getBoundingClientRect: jest.fn().mockReturnValue(rect) } },
    }
    templateRef = {}
    viewContainerRef = {}
    overlayRef = {
      overlayElement: { style: {}, firstChild: { style: {} } },
      hasAttached: jest.fn().mockReturnValue(false),
      attach: jest.fn(),
      detach: jest.fn(),
      dispose: jest.fn(),
    }
    overlay = { create: jest.fn().mockReturnValue(overlayRef) }
    directive = new DraggableHelperDirective(draggable, templateRef, viewContainerRef, overlay)
    // Replace the real CDK GlobalPositionStrategy so apply() does not touch an unattached overlay.
    positionStrategy = { left: jest.fn(), top: jest.fn(), apply: jest.fn() }
    directive['positionStrategy'] = positionStrategy as any
  })

  it('should be created', () => {
    expect(directive).toBeTruthy()
    expect(directive.subscriptions).toEqual([])
  })

  describe('ngOnInit', () => {
    it('subscribes to the three drag events and creates the overlay', () => {
      directive.ngOnInit()
      expect(directive.subscriptions.length).toBe(3)
      expect(overlay.create).toHaveBeenCalledWith({ positionStrategy })
      expect(directive['overlayRef']).toBe(overlayRef)
    })
  })

  describe('onDragStart', () => {
    it('records the start offset and sizes the overlay element', () => {
      directive.ngOnInit()
      draggable.dragStart.next({ clientX: 30, clientY: 55 })
      expect(draggable.element.nativeElement.getBoundingClientRect).toHaveBeenCalled()
      expect(directive['startPosition']).toEqual({ x: 20, y: 35 }) // 30-10, 55-20
      expect(overlayRef.overlayElement.style.width).toBe('100px')
    })
  })

  describe('onDragMove', () => {
    it('attaches the portal on first move and applies the new position', () => {
      directive.ngOnInit()
      draggable.dragStart.next({ clientX: 30, clientY: 55 })
      draggable.dragMove.next({ clientX: 130, clientY: 155 })

      expect(overlayRef.attach).toHaveBeenCalledTimes(1)
      const root = overlayRef.overlayElement.firstChild
      expect(root.style.width).toBe('100%')
      expect(root.style.boxSizing).toBe('border-box')
      expect(positionStrategy.left).toHaveBeenCalledWith('110px') // 130-20
      expect(positionStrategy.top).toHaveBeenCalledWith('120px') // 155-35
      expect(positionStrategy.apply).toHaveBeenCalled()
    })

    it('does not re-attach when the overlay is already attached', () => {
      overlayRef.hasAttached.mockReturnValue(true)
      directive.ngOnInit()
      directive['startPosition'] = { x: 0, y: 0 }
      draggable.dragMove.next({ clientX: 5, clientY: 6 })
      expect(overlayRef.attach).not.toHaveBeenCalled()
      expect(positionStrategy.apply).toHaveBeenCalled()
    })

    it('skips positioning when there is no start position', () => {
      directive.ngOnInit()
      draggable.dragMove.next({ clientX: 5, clientY: 6 })
      expect(overlayRef.attach).toHaveBeenCalled()
      expect(positionStrategy.apply).not.toHaveBeenCalled()
    })
  })

  describe('onDragEnd', () => {
    it('detaches the overlay', () => {
      directive.ngOnInit()
      draggable.dragEnd.next()
      expect(overlayRef.detach).toHaveBeenCalled()
    })
  })

  describe('unSubscribeEvents', () => {
    it('unsubscribes every stored subscription', () => {
      const a = { unsubscribe: jest.fn() }
      const b = { unsubscribe: jest.fn() }
      directive.subscriptions = [a as any, b as any]
      directive.unSubscribeEvents()
      expect(a.unsubscribe).toHaveBeenCalled()
      expect(b.unsubscribe).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes and disposes the overlay', () => {
      directive.ngOnInit()
      const spy = jest.spyOn(directive, 'unSubscribeEvents')
      directive.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
      expect(overlayRef.dispose).toHaveBeenCalled()
    })
  })
})
