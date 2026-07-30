import { IntranetSelectorComponent } from './intranet-selector.component'

describe('IntranetSelectorComponent', () => {
  const contentWith = (iframeSrc: string | undefined) => ({
    isIntranet: {
      widget: {
        widgetData: { iframeSrc },
      },
    },
  })

  const build = () => new IntranetSelectorComponent()

  it('is created with default inputs', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.identifier).toBe('')
    expect(c.isSubmitPressed).toBe(false)
    expect(c.size).toBe(1)
    expect(c.iframeSrc).toBe('')
  })

  it('ngOnInit runs without error', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('ngOnChanges', () => {
    it('copies the iframeSrc from the widget data', () => {
      const c = build()
      c.content = contentWith('http://intranet') as any
      c.ngOnChanges()
      expect(c.iframeSrc).toBe('http://intranet')
    })

    it('defaults to an empty string when widget iframeSrc is missing', () => {
      const c = build()
      c.content = contentWith(undefined) as any
      c.ngOnChanges()
      expect(c.iframeSrc).toBe('')
    })

    it('leaves iframeSrc untouched when isIntranet is absent', () => {
      const c = build()
      c.content = {} as any
      c.ngOnChanges()
      expect(c.iframeSrc).toBe('')
    })
  })

  describe('update', () => {
    it('sets the widget iframeSrc and emits a valid payload', () => {
      const c = build()
      c.content = contentWith('') as any
      const spy = jest.spyOn(c.data, 'emit')
      c.update('http://new-url')
      expect(c.content.isIntranet!.widget.widgetData.iframeSrc).toBe('http://new-url')
      expect(spy).toHaveBeenCalledWith({ content: c.content, isValid: true })
    })

    it('emits isValid false when the value is empty', () => {
      const c = build()
      c.content = contentWith('existing') as any
      const spy = jest.spyOn(c.data, 'emit')
      c.update('')
      expect(spy).toHaveBeenCalledWith({ content: c.content, isValid: false })
    })

    it('does not emit when isIntranet widget data is absent', () => {
      const c = build()
      c.content = {} as any
      const spy = jest.spyOn(c.data, 'emit')
      c.update('anything')
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
