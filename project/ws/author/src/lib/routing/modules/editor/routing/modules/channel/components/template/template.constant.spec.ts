import { template1Data, template2Data } from './template.constant'

describe('template.constant', () => {
  describe('template1Data', () => {
    it('should be a defined gridLayout layout widget', () => {
      expect(template1Data).toBeDefined()
      expect(template1Data.widgetSubType).toBe('gridLayout')
      expect(template1Data.widgetType).toBe('layout')
    })

    it('should carry a gutter and a rows-of-columns widget matrix', () => {
      expect(template1Data.widgetData.gutter).toBe(2)
      expect(Array.isArray(template1Data.widgetData.widgets)).toBe(true)
      expect(template1Data.widgetData.widgets.length).toBeGreaterThan(0)
      template1Data.widgetData.widgets.forEach((row: any) => {
        expect(Array.isArray(row)).toBe(true)
        row.forEach((cell: any) => {
          expect(cell).toHaveProperty('dimensions')
          expect(cell).toHaveProperty('widget')
        })
      })
    })

    it('should start with a breadcrumb card pointing Home to /page/home', () => {
      const firstWidget: any = template1Data.widgetData.widgets[0][0].widget
      expect(firstWidget.widgetSubType).toBe('cardBreadcrumb')
      expect(firstWidget.widgetType).toBe('card')
      expect(firstWidget.widgetData.path[0]).toEqual({ clickUrl: '/page/home', text: 'Home' })
    })

    it('should include contentStrip widgets with request ids', () => {
      const stripCells: any[] = []
      template1Data.widgetData.widgets.forEach((row: any) =>
        row.forEach((cell: any) => {
          if (cell.widget.widgetType === 'contentStrip') {
            stripCells.push(cell.widget)
          }
        }),
      )
      expect(stripCells.length).toBeGreaterThan(0)
      const withStrips = stripCells.find((w: any) => w.widgetData.strips)
      expect(withStrips.widgetData.strips[0].request.ids.length).toBeGreaterThan(0)
    })
  })

  describe('template2Data', () => {
    it('should be a defined gridLayout layout widget', () => {
      expect(template2Data).toBeDefined()
      expect(template2Data.widgetSubType).toBe('gridLayout')
      expect(template2Data.widgetType).toBe('layout')
    })

    it('should embed a responsive selector with an imageMap breakpoint', () => {
      let selector: any
      template2Data.widgetData.widgets.forEach((row: any) =>
        row.forEach((cell: any) => {
          if (cell.widget.widgetSubType === 'selectorResponsive') {
            selector = cell.widget
          }
        }),
      )
      expect(selector).toBeDefined()
      expect(Array.isArray(selector.widgetData.selectFrom)).toBe(true)
      const imageMap = selector.widgetData.selectFrom[0].widget
      expect(imageMap.widgetSubType).toBe('imageMapResponsive')
      expect(Array.isArray(imageMap.widgetData.map)).toBe(true)
      expect(imageMap.widgetData.map[0]).toHaveProperty('coords')
    })

    it('should include contentStripMultiple strips keyed by section', () => {
      const keys: string[] = []
      template2Data.widgetData.widgets.forEach((row: any) =>
        row.forEach((cell: any) => {
          if (cell.widget.widgetData && cell.widget.widgetData.strips) {
            cell.widget.widgetData.strips.forEach((s: any) => keys.push(s.key))
          }
        }),
      )
      expect(keys).toEqual(expect.arrayContaining(['hot_topics', 'learning_activities_df']))
    })
  })

  it('the two templates should be distinct objects', () => {
    expect(template1Data).not.toBe(template2Data)
  })
})
