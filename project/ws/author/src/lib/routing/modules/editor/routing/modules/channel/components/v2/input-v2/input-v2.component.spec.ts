import { InputV2Component } from './input-v2.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('InputV2Component', () => {
  let component: InputV2Component
  let snackBar: any
  let dialogRef: any

  const widget = (over: any = {}) => ({
    widgetType: 'container',
    widgetSubType: 'elementHtml',
    widgetInstanceId: 'w-1',
    widgetData: {},
    ...over,
  })

  const build = (data: any = {}) => {
    const c = new InputV2Component(
      snackBar,
      {
        widget: data.widget || widget(),
        identifier: data.identifier || 'do_page1',
        size: data.size,
      } as any,
      dialogRef,
    )
    return c
  }

  beforeEach(() => {
    snackBar = { openFromComponent: jest.fn() }
    dialogRef = { close: jest.fn() }
    component = build()
  })

  describe('construction', () => {
    it('takes the widget, identifier and size from the dialog data', () => {
      const w = widget()
      const c = build({ widget: w, identifier: 'do_x', size: 3 })

      expect(c.widget).toBe(w)
      expect(c.identifier).toBe('do_x')
      expect(c.size).toBe(3)
    })

    it('defaults to a single column', () => {
      expect(component.size).toBe(1)
    })

    it('starts with every spacing property unset', () => {
      expect(component.height).toBeNull()
      expect(component.width).toBeNull()
      expect(component.marginLeft).toBeNull()
      expect(component.paddingBottom).toBeNull()
      expect(component.heightUnit).toBe('px')
      expect(component.isMarginAvailable).toBe(false)
      expect(component.isSubmitPressed).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('treats a widget with no host style as auto-sized', () => {
      component.ngOnInit()

      expect(component.commonProp).toEqual({})
      expect(component.heightProp).toBe('auto')
      expect(component.widthProp).toBe('auto')
    })

    it('recognises the standard height and width for the given column span', () => {
      const c = build({
        size: 2,
        widget: widget({ widgetHostStyle: { height: '472px', width: '662px' } }),
      })

      c.ngOnInit()

      expect(c.heightProp).toBe('standard')
      expect(c.widthProp).toBe('standard')
    })

    it('flags a non-standard height and width as custom', () => {
      const c = build({ widget: widget({ widgetHostStyle: { height: '300px', width: '900px' } }) })

      c.ngOnInit()

      expect(c.heightProp).toBe('custom')
      expect(c.widthProp).toBe('custom')
      expect(c.height).toBe('300')
      expect(c.width).toBe('900')
    })

    it('reads the container style back for a margin-capable widget', () => {
      const c = build({
        widget: widget({
          widgetSubType: 'galleryView',
          widgetData: { containerStyle: { 'margin-top': '10px', 'padding-left': '4em' } },
        }),
      })

      c.ngOnInit()

      expect(c.isMarginAvailable).toBe(true)
      expect(c.marginTop).toBe('10')
      expect(c.marginTopUnit).toBe('px')
      expect(c.paddingLeft).toBe('4')
      expect(c.paddingLeftUnit).toBe('em')
    })
  })

  describe('assignCssProp', () => {
    const withStyle = (style: any) => {
      const c = build({ widget: widget({ widgetHostStyle: style }) })
      c.commonProp = { ...style }
      c.assignCssProp()
      return c
    }

    it('splits each spacing value into a number and a unit', () => {
      const c = withStyle({
        height: '100px',
        width: '50%',
        'margin-left': '1rem',
        'margin-right': '2px',
        'margin-top': '3px',
        'margin-bottom': '4px',
        'padding-left': '5px',
        'padding-right': '6px',
        'padding-top': '7px',
        'padding-bottom': '8px',
      })

      expect([c.height, c.heightUnit]).toEqual(['100', 'px'])
      expect([c.width, c.widthUnit]).toEqual(['50', '%'])
      expect([c.marginLeft, c.marginLeftUnit]).toEqual(['1', 'rem'])
      expect([c.marginRight, c.marginRightUnit]).toEqual(['2', 'px'])
      expect([c.marginTop, c.marginTopUnit]).toEqual(['3', 'px'])
      expect([c.marginBottom, c.marginBottomUnit]).toEqual(['4', 'px'])
      expect([c.paddingLeft, c.paddingLeftUnit]).toEqual(['5', 'px'])
      expect([c.paddingRight, c.paddingRightUnit]).toEqual(['6', 'px'])
      expect([c.paddingTop, c.paddingTopUnit]).toEqual(['7', 'px'])
      expect([c.paddingBottom, c.paddingBottomUnit]).toEqual(['8', 'px'])
    })

    it('leaves unset properties alone', () => {
      const c = withStyle({})

      expect(c.height).toBeNull()
      expect(c.marginTop).toBeNull()
      expect(c.paddingBottomUnit).toBe('px')
    })
  })

  describe('getCssStyle', () => {
    beforeEach(() => {
      component.commonProp = {}
    })

    it('writes every set value back with its unit', () => {
      Object.assign(component, {
        height: 100,
        width: 200,
        marginLeft: 1,
        marginRight: 2,
        marginTop: 3,
        marginBottom: 4,
        paddingLeft: 5,
        paddingRight: 6,
        paddingTop: 7,
        paddingBottom: 8,
      })

      component.getCssStyle()

      expect(component.commonProp).toEqual({
        height: '100px',
        width: '200px',
        'margin-left': '1px',
        'margin-right': '2px',
        'margin-top': '3px',
        'margin-bottom': '4px',
        'padding-left': '5px',
        'padding-right': '6px',
        'padding-top': '7px',
        'padding-bottom': '8px',
      })
    })

    it('keeps an explicit zero', () => {
      Object.assign(component, { height: 0, marginTop: 0, paddingBottom: 0 })

      component.getCssStyle()

      expect(component.commonProp.height).toBe('0px')
      expect(component.commonProp['margin-top']).toBe('0px')
      expect(component.commonProp['padding-bottom']).toBe('0px')
    })

    it('drops every property that has been cleared', () => {
      component.commonProp = {
        height: '1px',
        width: '1px',
        'margin-left': '1px',
        'margin-right': '1px',
        'margin-top': '1px',
        'margin-bottom': '1px',
        'padding-left': '1px',
        'padding-right': '1px',
        'padding-top': '1px',
        'padding-bottom': '1px',
      }

      component.getCssStyle()

      expect(component.commonProp).toEqual({})
    })
  })

  describe('setStyleProperties', () => {
    beforeEach(() => {
      component.commonProp = {}
    })

    it('parses every supported css property into a value and unit', () => {
      component.setStyleProperties({
        height: '12px',
        width: '34%',
        'margin-right': '1em',
        'margin-left': '2px',
        'margin-top': '3px',
        'margin-bottom': '4px',
        'padding-right': '5px',
        'padding-left': '6px',
        'padding-top': '7px',
        'padding-bottom': '8px',
      })

      expect([component.height, component.heightUnit]).toEqual(['12', 'px'])
      expect([component.width, component.widthUnit]).toEqual(['34', '%'])
      expect([component.marginRight, component.marginRightUnit]).toEqual(['1', 'em'])
      expect([component.marginLeft, component.marginLeftUnit]).toEqual(['2', 'px'])
      expect([component.marginTop, component.marginTopUnit]).toEqual(['3', 'px'])
      expect([component.marginBottom, component.marginBottomUnit]).toEqual(['4', 'px'])
      expect([component.paddingRight, component.paddingRightUnit]).toEqual(['5', 'px'])
      expect([component.paddingLeft, component.paddingLeftUnit]).toEqual(['6', 'px'])
      expect([component.paddingTop, component.paddingTopUnit]).toEqual(['7', 'px'])
      expect([component.paddingBottom, component.paddingBottomUnit]).toEqual(['8', 'px'])
    })

    it('ignores an unrecognised property', () => {
      component.setStyleProperties({ color: 'red' })

      expect(component.commonProp.color).toBeUndefined()
    })

    it('handles an empty style object', () => {
      expect(() => component.setStyleProperties({})).not.toThrow()
    })
  })

  describe('setStyle', () => {
    it('clears the height when set to auto', () => {
      component.heightProp = 'auto'
      component.setStyle('height')

      expect(component.height).toBeNull()
    })

    it('uses the standard height', () => {
      component.heightProp = 'standard'
      component.setStyle('height')

      expect(component.height).toBe(472)
    })

    it('zeroes the height for a custom value', () => {
      component.heightProp = 'custom'
      component.setStyle('height')

      expect(component.height).toBe(0)
    })

    it('clears the width when set to auto', () => {
      component.widthProp = 'auto'
      component.setStyle('width')

      expect(component.width).toBeNull()
    })

    it('scales the standard width by the column span', () => {
      const c = build({ size: 3 })
      c.widthProp = 'standard'
      c.setStyle('width')

      expect(c.width).toBe(993)
    })

    it('zeroes the width for a custom value', () => {
      component.widthProp = 'custom'
      component.setStyle('width')

      expect(component.width).toBe(0)
    })
  })

  describe('checkWidgetType', () => {
    it('marks the margin-capable widget types', () => {
      ;['pageEmbedded', 'galleryView', 'elementHtml'].forEach(subType => {
        component.isMarginAvailable = false
        component.checkWidgetType(widget({ widgetSubType: subType }) as any, {}, false)
        expect(component.isMarginAvailable).toBe(true)
      })
    })

    it('marks the fixed-layout widget types as having no margin', () => {
      ;['sliderBanners', 'contentStripMultiple', 'contentStripSingle', 'imageMapResponsive', 'cardBreadcrumb', 'playerVideo'].forEach(
        subType => {
          component.isMarginAvailable = true
          const w = widget({ widgetSubType: subType })

          expect(component.checkWidgetType(w as any)).toBe(w)
          expect(component.isMarginAvailable).toBe(false)
        },
      )
    })

    it('returns an unknown widget type untouched', () => {
      const w = widget({ widgetSubType: 'somethingElse' })

      expect(component.checkWidgetType(w as any)).toBe(w)
      expect(component.isMarginAvailable).toBe(false)
    })

    it('recurses into the children of a responsive selector', () => {
      const child = widget({ widgetSubType: 'galleryView' })
      const w = widget({
        widgetSubType: 'selectorResponsive',
        widgetData: { selectFrom: [{ widget: child }] },
      })

      const result = component.checkWidgetType(w as any, { 'margin-top': '2px' })

      expect(result).toBe(w)
      expect(child.widgetData.containerStyle).toEqual({ 'margin-top': '2px' })
    })

    it('skips selector children that carry no widget subtype', () => {
      const child = { widgetType: 'x', widgetData: {} }
      const w = widget({
        widgetSubType: 'selectorResponsive',
        widgetData: { selectFrom: [{ widget: child }] },
      })

      component.checkWidgetType(w as any, {})

      expect((child as any).widgetData.containerStyle).toBeUndefined()
    })

    it('tolerates a responsive selector with nothing to select from', () => {
      const w = widget({ widgetSubType: 'selectorResponsive', widgetData: {} })

      expect(component.checkWidgetType(w as any)).toBe(w)
    })
  })

  describe('setMarginContainerStyle', () => {
    it('merges the style into the existing container style', () => {
      const w = widget({ widgetData: { containerStyle: { 'margin-top': '1px' } } })

      component.setMarginContainerStyle(w as any, { 'margin-left': '2px' })

      expect(w.widgetData.containerStyle).toEqual({
        'margin-top': '1px',
        'margin-left': '2px',
      })
    })

    it('reads the container style into the form when reading', () => {
      const w = widget({ widgetData: { containerStyle: { 'margin-top': '9px' } } })
      component.commonProp = {}

      component.setMarginContainerStyle(w as any, undefined, true)

      expect(component.marginTop).toBe('9')
    })

    it('does not write a style when the widget carries no data', () => {
      const w = { widgetType: 'x', widgetSubType: 'elementHtml' } as any

      expect(component.setMarginContainerStyle(w, { 'margin-top': '1px' })).toBe(w)
      expect(w.widgetData).toBeUndefined()
    })
  })

  describe('setMarginHostStyle', () => {
    it('merges the style into the existing host style', () => {
      const w = widget({ widgetHostStyle: { 'margin-top': '1px' } })

      component.setMarginHostStyle(w as any, { 'margin-left': '2px' })

      expect(w.widgetHostStyle).toEqual({ 'margin-top': '1px', 'margin-left': '2px' })
    })

    it('reads the host style into the form when reading', () => {
      const w = widget({ widgetHostStyle: { 'padding-top': '3rem' } })
      component.commonProp = {}

      component.setMarginHostStyle(w as any, undefined, true)

      expect(component.paddingTop).toBe('3')
      expect(component.paddingTopUnit).toBe('rem')
    })

    it('leaves a widget without data untouched', () => {
      const w = { widgetType: 'x' } as any

      expect(component.setMarginHostStyle(w, { 'margin-top': '1px' })).toBe(w)
      expect(w.widgetHostStyle).toBeUndefined()
    })
  })

  describe('update', () => {
    it('replaces the widget data', () => {
      component.update({ a: 1 } as any)

      expect(component.widget.widgetData).toEqual({ a: 1 })
    })
  })

  describe('close', () => {
    it('keeps only the size on the host style and pushes the rest to the container', () => {
      const c = build({ widget: widget({ widgetSubType: 'galleryView' }) })
      c.ngOnInit()
      Object.assign(c, { height: 100, width: 200, marginTop: 5 })

      c.close()

      expect(c.widget.widgetHostStyle).toEqual({ height: '100px', width: '200px' })
      expect(c.widget.widgetData.containerStyle).toEqual({ 'margin-top': '5px' })
      expect(dialogRef.close).toHaveBeenCalledWith(c.widget)
    })

    it('strips the size from a slider banner host style', () => {
      const c = build({ widget: widget({ widgetSubType: 'sliderBanners' }) })
      c.ngOnInit()
      Object.assign(c, { height: 100, width: 200 })

      c.close()

      expect(c.widget.widgetHostStyle).toEqual({})
      expect(dialogRef.close).toHaveBeenCalled()
    })

    it('closes with an empty host style when nothing is set', () => {
      component.ngOnInit()

      component.close()

      expect(component.widget.widgetHostStyle).toEqual({})
      expect(dialogRef.close).toHaveBeenCalledWith(component.widget)
    })
  })

  describe('copyId', () => {
    let execCommand: jest.Mock

    beforeEach(() => {
      execCommand = jest.fn()
      ;(document as any).execCommand = execCommand
    })

    it('copies the widget instance id and notifies', () => {
      component.copyId()

      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(document.querySelector('textarea')).toBeNull()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { type: Notify.COPY } }))
    })

    it('copies an empty string when the widget has no instance id', () => {
      const c = build({ widget: widget({ widgetInstanceId: undefined }) })

      expect(() => c.copyId()).not.toThrow()
      expect(execCommand).toHaveBeenCalledWith('copy')
    })
  })
})
