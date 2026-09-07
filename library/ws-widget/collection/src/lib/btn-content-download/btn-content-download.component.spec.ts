import { BtnContentDownloadComponent, IWidgetBtnDownload } from './btn-content-download.component'
import { NsContent } from '../_services/widget-content.model'

describe('BtnContentDownloadComponent', () => {
  let platform: any
  let events: any
  let mobAppSvc: any
  let configSvc: any

  const baseWidgetData = (over: Partial<IWidgetBtnDownload> = {}): IWidgetBtnDownload => ({
    identifier: 'do_1',
    contentType: NsContent.EContentTypes.RESOURCE,
    resourceType: 'Learning Resource',
    mimeType: NsContent.EMimeTypes.PDF,
    downloadUrl: 'http://cdn/download',
    isExternal: false,
    artifactUrl: '',
    ...over,
  })

  const build = () => {
    const c = new BtnContentDownloadComponent(platform, events, mobAppSvc, configSvc)
    c.widgetData = baseWidgetData()
    return c
  }

  beforeEach(() => {
    platform = { ANDROID: true }
    events = { raiseInteractTelemetry: jest.fn() }
    mobAppSvc = { isMobile: true, downloadResource: jest.fn() }
    configSvc = { instanceConfig: { isContentDownloadAvailable: true } }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('marks downloadable for a mobile, download-available, supported content', () => {
      const c = build()
      c.ngOnInit()
      expect(c.downloadable).toBe(true)
    })

    it('stays not downloadable without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()
      c.ngOnInit()
      expect(c.downloadable).toBe(false)
    })

    it('stays not downloadable when the instance disables downloads', () => {
      configSvc.instanceConfig = { isContentDownloadAvailable: false }
      const c = build()
      c.ngOnInit()
      expect(c.downloadable).toBe(false)
    })

    it('stays not downloadable when not on mobile', () => {
      mobAppSvc.isMobile = false
      const c = build()
      c.ngOnInit()
      expect(c.downloadable).toBe(false)
    })
  })

  describe('isContentDownloadable (via ngOnInit)', () => {
    const eval2 = (over: Partial<IWidgetBtnDownload>): boolean => {
      const c = build()
      c.widgetData = baseWidgetData(over)
      c.ngOnInit()
      return c.downloadable
    }

    it('is false with no identifier', () => {
      expect(eval2({ identifier: '' })).toBe(false)
    })

    it('is false for a PROGRAM content type', () => {
      expect(eval2({ contentType: NsContent.EContentTypes.PROGRAM })).toBe(false)
    })

    it('is false for an Assessment resource type', () => {
      expect(eval2({ resourceType: 'Assessment' })).toBe(false)
    })

    it('is false for a Competition resource type', () => {
      expect(eval2({ resourceType: 'Competition' })).toBe(false)
    })

    it('is false when external', () => {
      expect(eval2({ isExternal: true })).toBe(false)
    })

    it('is false for a scorm artifact url', () => {
      expect(eval2({ artifactUrl: 'https://scorm.example/pkg' })).toBe(false)
    })

    it('is false for a non-collection mime without a download url', () => {
      expect(eval2({ mimeType: NsContent.EMimeTypes.HTML, downloadUrl: '' })).toBe(false)
    })

    it('is true for an MP4', () => {
      expect(eval2({ mimeType: NsContent.EMimeTypes.MP4 })).toBe(true)
    })

    it('is true for a QUIZ', () => {
      expect(eval2({ mimeType: NsContent.EMimeTypes.QUIZ })).toBe(true)
    })

    it('is true for a COLLECTION', () => {
      expect(eval2({ mimeType: NsContent.EMimeTypes.COLLECTION })).toBe(true)
    })

    it('is false for an unsupported mime with a download url', () => {
      expect(eval2({ mimeType: NsContent.EMimeTypes.YOUTUBE, downloadUrl: 'http://x' })).toBe(false)
    })
  })

  describe('download', () => {
    it('stops propagation, raises telemetry and downloads when not a preview', () => {
      const c = build()
      const event: any = { stopPropagation: jest.fn() }
      c.download(event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(events.raiseInteractTelemetry).toHaveBeenCalled()
      expect(mobAppSvc.downloadResource).toHaveBeenCalledWith('do_1')
    })

    it('does nothing beyond stopping propagation for a preview', () => {
      const c = build()
      c.forPreview = true
      const event: any = { stopPropagation: jest.fn() }
      c.download(event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(events.raiseInteractTelemetry).not.toHaveBeenCalled()
      expect(mobAppSvc.downloadResource).not.toHaveBeenCalled()
    })
  })

  describe('raiseTelemetry', () => {
    it('raises an interact telemetry with the content details', () => {
      const c = build()
      c.raiseTelemetry()
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('download', 'content', {
        platform,
        contentId: 'do_1',
        contentType: NsContent.EContentTypes.RESOURCE,
      })
    })
  })
})
