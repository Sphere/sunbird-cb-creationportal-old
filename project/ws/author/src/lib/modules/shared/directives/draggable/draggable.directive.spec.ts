import { ElementRef } from '@angular/core'
import { DraggableDirective } from './draggable.directive'

describe('DraggableDirective', () => {
  let directive: DraggableDirective
  let element: ElementRef

  const pointerEvent = (over: Partial<PointerEvent> = {}): PointerEvent =>
    ({
      button: 0,
      pointerId: 1,
      preventDefault: jest.fn(),
      ...over,
    }) as unknown as PointerEvent

  beforeEach(() => {
    element = new ElementRef({})
    directive = new DraggableDirective(element)
  })

  it('should be created with sane defaults', () => {
    expect(directive).toBeTruthy()
    expect(directive.dragging).toBe(false)
    expect(directive.pointerId).toBeUndefined()
    expect(directive.element).toBe(element)
  })

  describe('onPointerDown', () => {
    it('starts dragging and emits dragStart for the primary button', () => {
      const emit = jest.spyOn(directive.dragStart, 'emit')
      const event = pointerEvent({ pointerId: 7 })

      directive.onPointerDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(directive.dragging).toBe(true)
      expect(directive.pointerId).toBe(7)
      expect(emit).toHaveBeenCalledWith(event)
    })

    it('ignores non-primary buttons but still prevents default', () => {
      const emit = jest.spyOn(directive.dragStart, 'emit')
      const event = pointerEvent({ button: 2 })

      directive.onPointerDown(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(directive.dragging).toBe(false)
      expect(directive.pointerId).toBeUndefined()
      expect(emit).not.toHaveBeenCalled()
    })
  })

  describe('onPointerMove', () => {
    it('emits dragMove for the active pointer while dragging', () => {
      directive.onPointerDown(pointerEvent({ pointerId: 3 }))
      const emit = jest.spyOn(directive.dragMove, 'emit')
      const moveEvent = pointerEvent({ pointerId: 3 })

      directive.onPointerMove(moveEvent)

      expect(emit).toHaveBeenCalledWith(moveEvent)
    })

    it('does nothing when not dragging', () => {
      const emit = jest.spyOn(directive.dragMove, 'emit')
      directive.onPointerMove(pointerEvent())
      expect(emit).not.toHaveBeenCalled()
    })

    it('ignores moves from a different pointer', () => {
      directive.onPointerDown(pointerEvent({ pointerId: 3 }))
      const emit = jest.spyOn(directive.dragMove, 'emit')

      directive.onPointerMove(pointerEvent({ pointerId: 99 }))

      expect(emit).not.toHaveBeenCalled()
    })
  })

  describe('onPointerUp', () => {
    it('ends dragging and emits dragEnd for the active pointer', () => {
      directive.onPointerDown(pointerEvent({ pointerId: 5 }))
      const emit = jest.spyOn(directive.dragEnd, 'emit')
      const upEvent = pointerEvent({ pointerId: 5 })

      directive.onPointerUp(upEvent)

      expect(upEvent.preventDefault).toHaveBeenCalled()
      expect(directive.dragging).toBe(false)
      expect(emit).toHaveBeenCalledWith(upEvent)
    })

    it('does nothing (beyond preventDefault) when not dragging', () => {
      const emit = jest.spyOn(directive.dragEnd, 'emit')
      const upEvent = pointerEvent()

      directive.onPointerUp(upEvent)

      expect(upEvent.preventDefault).toHaveBeenCalled()
      expect(emit).not.toHaveBeenCalled()
    })

    it('ignores an up from a different pointer', () => {
      directive.onPointerDown(pointerEvent({ pointerId: 5 }))
      const emit = jest.spyOn(directive.dragEnd, 'emit')

      directive.onPointerUp(pointerEvent({ pointerId: 42 }))

      expect(emit).not.toHaveBeenCalled()
      expect(directive.dragging).toBe(true)
    })
  })
})
