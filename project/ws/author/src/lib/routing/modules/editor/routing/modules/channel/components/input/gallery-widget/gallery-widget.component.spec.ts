import { FormBuilder } from '@angular/forms'
import { GalleryWidgetComponent } from './gallery-widget.component'

describe('GalleryWidgetComponent', () => {
  let component: GalleryWidgetComponent
  let formBuilder: FormBuilder

  beforeEach(() => {
    formBuilder = new FormBuilder()
    component = new GalleryWidgetComponent(formBuilder)
  })

  it('should be created with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.identifier).toBe('')
    expect(component.isSubmitPressed).toBe(false)
  })

  describe('ngOnInit', () => {
    it('builds the form from the provided content values', () => {
      component.content = {
        designVal: 'set2',
        autoNext: true,
        delay: 5,
        loop: true,
        configs: { widgetPlayer: 'player1', widgetRibbon: 'ribbon1' },
      } as any
      component.ngOnInit()
      expect(component.form.value).toEqual({
        designVal: 'set2',
        autoNext: true,
        delay: 5,
        loop: true,
        widgetPlayer: 'player1',
        widgetRibbon: 'ribbon1',
      })
    })

    it('applies default values when content fields are empty', () => {
      component.content = {} as any
      component.ngOnInit()
      expect(component.form.value).toEqual({
        designVal: 'set1',
        autoNext: false,
        delay: '',
        loop: false,
        widgetPlayer: '',
        widgetRibbon: '',
      })
    })

    it('emits form value and validity when the form changes (debounced)', () => {
      jest.useFakeTimers()
      component.content = {} as any
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.ngOnInit()
      component.form.controls['designVal'].setValue('set3')
      jest.advanceTimersByTime(100)
      expect(emitSpy).toHaveBeenCalledWith({
        content: component.form.value,
        isValid: component.form.valid,
      })
      jest.useRealTimers()
    })
  })

  describe('update', () => {
    it('sets the given control value', () => {
      component.content = {} as any
      component.ngOnInit()
      component.update('loop', true)
      expect(component.form.controls['loop'].value).toBe(true)
    })
  })
})
