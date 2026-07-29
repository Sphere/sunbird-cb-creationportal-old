import { FormArray, FormBuilder } from '@angular/forms'
import { BreadcrumComponent } from './breadcrum.component'

describe('BreadcrumComponent', () => {
  let component: BreadcrumComponent
  let fb: FormBuilder

  beforeEach(() => {
    fb = new FormBuilder()
    component = new BreadcrumComponent(fb)
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.isSubmitPressed).toBe(false)
  })

  describe('ngOnInit', () => {
    it('seeds the path array from the content path entries', () => {
      component.content = {
        path: [
          { text: 'Home', clickUrl: '/home' },
          { text: 'Search', clickUrl: '/search' },
        ],
      } as any
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.ngOnInit()
      expect(component.path.length).toBe(2)
      expect(component.path.at(0).value).toEqual({ text: 'Home', clickUrl: '/home' })
      expect(emitSpy).toHaveBeenCalledWith({
        content: component.form.value,
        isValid: component.form.valid,
      })
    })

    it('adds a single empty path when content has no path', () => {
      component.content = {} as any
      component.ngOnInit()
      expect(component.path.length).toBe(1)
      expect(component.path.at(0).value).toEqual({ text: '', clickUrl: '' })
    })

    it('adds a single empty path when content is undefined', () => {
      component.content = undefined as any
      component.ngOnInit()
      expect(component.path.length).toBe(1)
    })

    it('emits again when the form value changes (debounced)', () => {
      jest.useFakeTimers()
      component.content = {} as any
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.ngOnInit()
      emitSpy.mockClear()
      component.path.at(0).get('text')!.setValue('Changed')
      jest.advanceTimersByTime(1000)
      expect(emitSpy).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('path getter', () => {
    it('returns the path FormArray', () => {
      component.content = {} as any
      component.ngOnInit()
      expect(component.path).toBeInstanceOf(FormArray)
    })
  })

  describe('addPath', () => {
    it('pushes a new group with a required text control', () => {
      component.content = {} as any
      component.ngOnInit()
      component.addPath('New', '/new')
      const last = component.path.at(component.path.length - 1)
      expect(last.value).toEqual({ text: 'New', clickUrl: '/new' })
      expect(last.get('text')!.hasError('required')).toBe(false)
    })
  })

  describe('remove', () => {
    it('removes the path at the given index', () => {
      component.content = {} as any
      component.ngOnInit()
      component.addPath('A', '/a')
      component.addPath('B', '/b')
      const before = component.path.length
      component.remove(0)
      expect(component.path.length).toBe(before - 1)
    })
  })
})
