import { WidgetBaseComponent } from './widget-base.component'

describe('WidgetBaseComponent', () => {
  let comp: WidgetBaseComponent

  beforeEach(() => {
    comp = new WidgetBaseComponent()
  })

  it('initializes with default input values', () => {
    expect(comp.widgetType).toBe('')
    expect(comp.widgetSubType).toBe('')
    expect(comp.widgetHostClass).toBeUndefined()
    expect(comp.widgetInstanceId).toBeUndefined()
    expect(comp.widgetSafeStyle).toBeUndefined()
    expect(comp.className).toBeUndefined()
  })

  describe('updateBaseComponent', () => {
    it('copies all provided values onto the instance', () => {
      const style: any = 'color: red'
      comp.updateBaseComponent('card', 'content', 'id-1', 'host-cls', style)
      expect(comp.widgetType).toBe('card')
      expect(comp.widgetSubType).toBe('content')
      expect(comp.widgetInstanceId).toBe('id-1')
      expect(comp.widgetHostClass).toBe('host-cls')
      expect(comp.widgetSafeStyle).toBe(style)
    })

    it('appends the host class to className when a host class is given', () => {
      comp.className = 'base'
      comp.updateBaseComponent('t', 's', undefined, 'extra')
      expect(comp.className).toBe('base extra')
    })

    it('does not modify className when no host class is provided', () => {
      comp.className = 'base'
      comp.updateBaseComponent('t', 's')
      expect(comp.className).toBe('base')
    })
  })

  describe('ngAfterViewInit', () => {
    const originalHash = window.location.hash

    afterEach(() => {
      window.location.hash = originalHash
      jest.useRealTimers()
    })

    it('does nothing when there is no matching hash', () => {
      window.location.hash = ''
      const spy = jest.spyOn(document, 'getElementById')
      comp.ngAfterViewInit()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('scrolls the matching element into view when the hash matches the instance id', () => {
      jest.useFakeTimers()
      comp.widgetInstanceId = '42'
      window.location.hash = '#42'
      const scrollIntoView = jest.fn()
      const getById = jest.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as any)

      comp.ngAfterViewInit()
      jest.advanceTimersByTime(200)

      expect(getById).toHaveBeenCalledWith('42')
      expect(scrollIntoView).toHaveBeenCalled()
      getById.mockRestore()
    })

    it('does not throw when the matched element is not found', () => {
      jest.useFakeTimers()
      comp.widgetInstanceId = '7'
      window.location.hash = '#7'
      const getById = jest.spyOn(document, 'getElementById').mockReturnValue(null)

      comp.ngAfterViewInit()
      expect(() => jest.advanceTimersByTime(200)).not.toThrow()
      expect(getById).toHaveBeenCalledWith('7')
      getById.mockRestore()
    })

    it('ignores a non-numeric hash', () => {
      comp.widgetInstanceId = 'abc'
      window.location.hash = '#abc'
      const spy = jest.spyOn(document, 'getElementById')
      comp.ngAfterViewInit()
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
