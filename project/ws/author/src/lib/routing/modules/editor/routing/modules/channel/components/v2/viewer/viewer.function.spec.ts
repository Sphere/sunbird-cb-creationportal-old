import { isNotEmptyWidget } from './viewer.function'

describe('isNotEmptyWidget', () => {
  const widget = (widgetSubType: string, widgetData: any = {}) => ({ widgetType: 'container', widgetSubType, widgetData }) as any

  it('rejects an unrecognised widget type', () => {
    expect(isNotEmptyWidget(widget('somethingElse'))).toBe(false)
  })

  describe('selectorResponsive', () => {
    it('delegates to the first configured child', () => {
      const inner = widget('elementHtml', { html: '<p>hi</p>' })

      expect(isNotEmptyWidget(widget('selectorResponsive', { selectFrom: [{ widget: inner }] }))).toBe(true)
    })

    it('reports empty when the delegated child is empty', () => {
      const inner = widget('elementHtml', {})

      expect(isNotEmptyWidget(widget('selectorResponsive', { selectFrom: [{ widget: inner }] }))).toBe(false)
    })

    it('skips entries with no widget subtype', () => {
      const bare = { widgetType: 'x', widgetData: {} }

      expect(isNotEmptyWidget(widget('selectorResponsive', { selectFrom: [{ widget: bare }] }))).toBe(false)
    })

    it('reports empty when there is nothing to select from', () => {
      expect(isNotEmptyWidget(widget('selectorResponsive', {}))).toBe(false)
      expect(isNotEmptyWidget(widget('selectorResponsive', { selectFrom: [] }))).toBe(false)
    })
  })

  describe('iframe-backed widgets', () => {
    it('accepts an intranet widget with a source', () => {
      const data = { isIntranet: { widget: widget('pageEmbedded', { iframeSrc: 'https://x' }) } }

      expect(isNotEmptyWidget(widget('intranetResponsive', data))).toBe(true)
    })

    it('rejects an intranet widget with no source', () => {
      const data = { isIntranet: { widget: widget('pageEmbedded', {}) } }

      expect(isNotEmptyWidget(widget('intranetResponsive', data))).toBe(false)
    })

    it('accepts an embedded page with a source', () => {
      expect(isNotEmptyWidget(widget('pageEmbedded', { iframeSrc: 'https://x' }))).toBe(true)
    })

    it('rejects an embedded page with no source', () => {
      expect(isNotEmptyWidget(widget('pageEmbedded', {}))).toBe(false)
    })
  })

  describe('elementHtml', () => {
    it('accepts raw html', () => {
      expect(isNotEmptyWidget(widget('elementHtml', { html: '<p>hi</p>' }))).toBe(true)
    })

    it.each(['imageSrc', 'title'])('accepts a template carrying a %s', field => {
      const data = { template: 'card', templateData: { [field]: 'value' } }

      expect(isNotEmptyWidget(widget('elementHtml', data))).toBe(true)
    })

    it('rejects a template with nothing filled in', () => {
      expect(isNotEmptyWidget(widget('elementHtml', { template: 'card', templateData: {} }))).toBe(false)
    })

    it('accepts a remote template url', () => {
      expect(isNotEmptyWidget(widget('elementHtml', { templateUrl: '/tpl.html' }))).toBe(true)
    })

    it('rejects an empty html widget', () => {
      expect(isNotEmptyWidget(widget('elementHtml', {}))).toBe(false)
    })
  })

  describe('imageMapResponsive', () => {
    it('accepts a map with an image', () => {
      expect(isNotEmptyWidget(widget('imageMapResponsive', { imageSrc: 'a.png' }))).toBe(true)
    })

    it('rejects a map with no image', () => {
      expect(isNotEmptyWidget(widget('imageMapResponsive', {}))).toBe(false)
    })
  })

  describe('playerVideo', () => {
    it.each(['identifier', 'url'])('accepts a video with a %s', field => {
      expect(isNotEmptyWidget(widget('playerVideo', { [field]: 'value' }))).toBe(true)
    })

    it('rejects a video with no source', () => {
      expect(isNotEmptyWidget(widget('playerVideo', {}))).toBe(false)
    })
  })

  describe('videoWrapper', () => {
    const wrapper = (externalData: any, videoData: any) => widget('videoWrapper', { externalData, videoData })

    it('accepts an embedded external video', () => {
      expect(isNotEmptyWidget(wrapper({ iframeSrc: 'https://x' }, {}))).toBe(true)
    })

    it.each(['url', 'identifier'])('accepts a wrapped video with a %s', field => {
      expect(isNotEmptyWidget(wrapper({}, { [field]: 'value' }))).toBe(true)
    })

    it('rejects a wrapper with no video at all', () => {
      expect(isNotEmptyWidget(wrapper({}, {}))).toBe(false)
    })
  })

  describe('cardBreadcrumb', () => {
    it('accepts a trail where some crumb has text', () => {
      const data = { path: [{ text: '' }, { text: 'Home' }] }

      expect(isNotEmptyWidget(widget('cardBreadcrumb', data))).toBe(true)
    })

    it('rejects a trail of blank crumbs', () => {
      const data = { path: [{ text: '' }, { text: '' }] }

      expect(isNotEmptyWidget(widget('cardBreadcrumb', data))).toBe(false)
    })

    it('rejects an absent or empty trail', () => {
      expect(isNotEmptyWidget(widget('cardBreadcrumb', {}))).toBe(false)
      expect(isNotEmptyWidget(widget('cardBreadcrumb', { path: [] }))).toBe(false)
    })
  })

  describe('galleryView', () => {
    const gallery = (cardMenu: any[]) => widget('galleryView', { cardMenu })

    it('accepts a gallery whose html card has content', () => {
      expect(isNotEmptyWidget(gallery([{ widget: widget('elementHtml', { html: 'x' }) }]))).toBe(true)
    })

    it('rejects a gallery whose only html card is blank', () => {
      expect(isNotEmptyWidget(gallery([{ widget: widget('elementHtml', {}) }]))).toBe(false)
    })

    it('accepts a gallery whose video card has a source', () => {
      expect(isNotEmptyWidget(gallery([{ widget: widget('playerVideo', { url: 'v.mp4' }) }]))).toBe(true)
    })

    it('rejects a gallery whose only video card has no source', () => {
      expect(isNotEmptyWidget(gallery([{ widget: widget('playerVideo', {}) }]))).toBe(false)
    })

    it('accepts any other card type outright', () => {
      expect(isNotEmptyWidget(gallery([{ widget: widget('cardBreadcrumb', {}) }]))).toBe(true)
    })

    it('keeps looking past an empty card', () => {
      const cards = [{ widget: widget('elementHtml', {}) }, { widget: widget('elementHtml', { html: 'x' }) }]

      expect(isNotEmptyWidget(gallery(cards))).toBe(true)
    })

    it('rejects an absent or empty gallery', () => {
      expect(isNotEmptyWidget(widget('galleryView', {}))).toBe(false)
      expect(isNotEmptyWidget(gallery([]))).toBe(false)
    })
  })

  describe('sliderBanners', () => {
    const allSizes = { l: 'l.png', m: 'm.png', s: 's.png', xl: 'xl.png', xs: 'xs.png' }

    it('accepts a slider once one banner has every size', () => {
      const data = [{ banners: { ...allSizes, l: '' } }, { banners: allSizes }]

      expect(isNotEmptyWidget(widget('sliderBanners', data))).toBe(true)
    })

    it('rejects a slider whose banners are incomplete', () => {
      const data = [{ banners: { ...allSizes, xs: '' } }]

      expect(isNotEmptyWidget(widget('sliderBanners', data))).toBe(false)
    })

    it('rejects a slider with no banners', () => {
      expect(isNotEmptyWidget(widget('sliderBanners', []))).toBe(false)
      expect(isNotEmptyWidget(widget('sliderBanners', null))).toBe(false)
    })
  })

  describe('contentStripMultiple', () => {
    const strip = (over: any = {}) => ({ request: {}, ...over })
    const strips = (list: any[]) => widget('contentStripMultiple', { strips: list })

    it.each([
      ['preWidgets', { preWidgets: [{}] }],
      ['postWidgets', { postWidgets: [{}] }],
    ])('accepts a strip carrying %s', (_label, over) => {
      expect(isNotEmptyWidget(strips([strip(over)]))).toBe(true)
    })

    it.each([
      ['searchV6', { request: { searchV6: { query: 'x' } } }],
      ['ids', { request: { ids: ['do_1'] } }],
      ['api', { request: { api: { url: '/x' } } }],
      ['search', { request: { search: { query: 'x' } } }],
      ['manualData', { request: { manualData: [{ identifier: 'do_1' }] } }],
      ['searchRegionRecommendation', { request: { searchRegionRecommendation: { region: 'x' } } }],
    ])('accepts a strip whose request carries %s', (_label, over) => {
      expect(isNotEmptyWidget(strips([strip(over)]))).toBe(true)
    })

    it('rejects strips whose requests are all empty', () => {
      expect(isNotEmptyWidget(strips([strip(), strip()]))).toBe(false)
    })

    it('skips a completely empty strip entry', () => {
      expect(isNotEmptyWidget(strips([{}]))).toBe(false)
    })

    it('keeps looking past an empty strip', () => {
      expect(isNotEmptyWidget(strips([strip(), strip({ request: { ids: ['do_1'] } })]))).toBe(true)
    })

    it('rejects a widget with no strips', () => {
      expect(isNotEmptyWidget(strips([]))).toBe(false)
    })
  })

  describe('contentStripSingle', () => {
    const single = (request: any) => widget('contentStripSingle', { request })

    it.each([
      ['searchV6', { searchV6: { query: 'x' }, manualData: [] }],
      ['ids', { ids: ['do_1'], manualData: [] }],
      ['api', { api: { url: '/x' }, manualData: [] }],
      ['search', { search: { query: 'x' }, manualData: [] }],
      ['manualData', { manualData: [{ identifier: 'do_1' }] }],
      ['searchRegionRecommendation', { searchRegionRecommendation: { region: 'x' }, manualData: [] }],
    ])('accepts a strip whose request carries %s', (_label, request) => {
      expect(isNotEmptyWidget(single(request))).toBe(true)
    })

    it('rejects a strip with an empty request', () => {
      expect(isNotEmptyWidget(single({ manualData: [] }))).toBe(false)
    })

    it('rejects a strip with no data at all', () => {
      expect(isNotEmptyWidget(widget('contentStripSingle', {}))).toBe(false)
    })
  })
})
