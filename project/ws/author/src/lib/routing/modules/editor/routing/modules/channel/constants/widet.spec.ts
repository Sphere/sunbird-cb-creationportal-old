import { WIDGET_LIBRARY } from './widet'

describe('WIDGET_LIBRARY constant', () => {
  it('should be a defined, non-empty object', () => {
    expect(WIDGET_LIBRARY).toBeDefined()
    expect(typeof WIDGET_LIBRARY).toBe('object')
    expect(Object.keys(WIDGET_LIBRARY).length).toBeGreaterThan(0)
  })

  it('every entry should declare a widgetType or widgetSubType', () => {
    Object.entries(WIDGET_LIBRARY as any).forEach(([_key, widget]: [string, any]) => {
      const hasType =
        Object.prototype.hasOwnProperty.call(widget, 'widgetType') || Object.prototype.hasOwnProperty.call(widget, 'widgetSubType')
      expect(hasType).toBe(true)
    })
  })

  describe('player widgets', () => {
    it('audio should be an audio player at full size', () => {
      expect(WIDGET_LIBRARY.audio.widgetType).toBe('player')
      expect(WIDGET_LIBRARY.audio.widgetSubType).toBe('playerAudio')
      expect(WIDGET_LIBRARY.audio.widgetHostStyle).toEqual({ height: '100%', width: '100%' })
    })

    it('video should be a video player', () => {
      expect(WIDGET_LIBRARY.video.widgetType).toBe('player')
      expect(WIDGET_LIBRARY.video.widgetSubType).toBe('playerVideo')
    })

    it('sized audio variants should carry responsive dimensions', () => {
      expect(WIDGET_LIBRARY.one_audio.dimensions).toEqual({
        small: 12,
        medium: 6,
        large: 3,
        xLarge: 3,
      })
      expect(WIDGET_LIBRARY.four_audio.dimensions).toEqual({
        small: 12,
        medium: 12,
        large: 12,
        xLarge: 12,
      })
    })

    it('player data blocks should expose the default playback config', () => {
      expect(WIDGET_LIBRARY.one_video.data).toEqual(
        expect.objectContaining({
          url: '',
          autoplay: false,
          resumePoint: 0,
          setCookie: false,
          disableTelemetry: false,
        }),
      )
    })
  })

  describe('element / html widgets', () => {
    it('html should be an elementHtml element', () => {
      expect(WIDGET_LIBRARY.html.widgetSubType).toBe('elementHtml')
      expect(WIDGET_LIBRARY.html.widgetType).toBe('element')
    })

    it('one_text should carry text data and mat-elevation container class', () => {
      expect(WIDGET_LIBRARY.one_text.data.type).toBe('text')
      expect(WIDGET_LIBRARY.one_text.data.containerClass).toContain('mat-elevation-z4')
    })

    it('title widget should embed a mustache template', () => {
      expect(WIDGET_LIBRARY.title.data.template).toContain('{{title}}')
      expect(WIDGET_LIBRARY.title.data.templateData.title).toBe('Title')
    })
  })

  describe('slider widgets', () => {
    it('slider should hold a banner data array', () => {
      expect(WIDGET_LIBRARY.slider.widgetType).toBe('slider')
      expect(Array.isArray(WIDGET_LIBRARY.slider.data)).toBe(true)
      expect(WIDGET_LIBRARY.slider.data[0]).toHaveProperty('banners')
      expect(WIDGET_LIBRARY.slider.data[0].openInNewTab).toBe(true)
    })
  })

  describe('page / iframe widgets', () => {
    it('iframe should be a pageEmbedded page', () => {
      expect(WIDGET_LIBRARY.iframe.widgetSubType).toBe('pageEmbedded')
      expect(WIDGET_LIBRARY.iframe.widgetType).toBe('page')
      expect(WIDGET_LIBRARY.iframe.data).toEqual({ iframeSrc: '', title: '' })
    })

    it('solo_iframe should use widgetData rather than data', () => {
      expect(WIDGET_LIBRARY.solo_iframe.widgetData).toEqual({ iframeSrc: '', title: '' })
    })
  })

  describe('imageMap / selector / strip / gallery widgets', () => {
    it('map should be an imageMapResponsive imageMap', () => {
      expect(WIDGET_LIBRARY.map.widgetSubType).toBe('imageMapResponsive')
      expect(WIDGET_LIBRARY.map.widgetType).toBe('imageMap')
      expect(Array.isArray(WIDGET_LIBRARY.map.data.map)).toBe(true)
    })

    it('selector should be a selectorResponsive selector', () => {
      expect(WIDGET_LIBRARY.selector.widgetSubType).toBe('selectorResponsive')
      expect(WIDGET_LIBRARY.selector.widgetType).toBe('selector')
    })

    it('strip should be a contentStripMultiple contentStrip', () => {
      expect(WIDGET_LIBRARY.strip.widgetSubType).toBe('contentStripMultiple')
      expect(WIDGET_LIBRARY.strip.widgetType).toBe('contentStrip')
    })

    it('strip_single should be a contentStripSingle contentStrip', () => {
      expect(WIDGET_LIBRARY.strip_single.widgetSubType).toBe('contentStripSingle')
    })

    it('gallery should be a galleryView gallery with player/ribbon configs', () => {
      expect(WIDGET_LIBRARY.gallery.widgetSubType).toBe('galleryView')
      expect(WIDGET_LIBRARY.gallery.data.configs).toHaveProperty('widgetPlayer')
      expect(WIDGET_LIBRARY.gallery.data.configs).toHaveProperty('widgetRibbon')
    })

    it('one_resp_image should nest a selectFrom breakpoint list', () => {
      expect(WIDGET_LIBRARY.one_resp_image.widgetData.type).toBe('image')
      expect(Array.isArray(WIDGET_LIBRARY.one_resp_image.widgetData.selectFrom)).toBe(true)
      expect(WIDGET_LIBRARY.one_resp_image.widgetData.selectFrom[0].maxWidth).toBe(500090000)
    })
  })

  describe('wrapper widgets', () => {
    it('wrapper should be a videoWrapper wrapper', () => {
      expect(WIDGET_LIBRARY.wrapper.widgetType).toBe('wrapper')
      expect(WIDGET_LIBRARY.wrapper.widgetSubType).toBe('videoWrapper')
      expect(WIDGET_LIBRARY.wrapper.data).toEqual({ videoData: {}, externalData: {} })
    })

    it('gallery_wrapper should wrap a videoWrapper inside a galleryView', () => {
      expect(WIDGET_LIBRARY.gallery_wrapper.widgetSubType).toBe('galleryView')
      expect(WIDGET_LIBRARY.gallery_wrapper.widgetData.cardMenu[0].widget.widgetSubType).toBe('videoWrapper')
    })
  })

  describe('intranet widgets', () => {
    it('one_intranet should be an intranetResponsive selector with both branches', () => {
      expect(WIDGET_LIBRARY.one_intranet.widgetSubType).toBe('intranetResponsive')
      expect(WIDGET_LIBRARY.one_intranet.data).toHaveProperty('isIntranet')
      expect(WIDGET_LIBRARY.one_intranet.data).toHaveProperty('isNotIntranet')
      expect(WIDGET_LIBRARY.one_intranet.data.isNotIntranet.widget.widgetData.templateData.title).toBe('Content not available online')
    })
  })

  describe('empty widget', () => {
    it('should have empty type strings', () => {
      expect(WIDGET_LIBRARY.empty.widgetSubType).toBe('')
      expect(WIDGET_LIBRARY.empty.widgetType).toBe('')
    })
  })
})
