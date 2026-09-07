import { of } from 'rxjs'

import { PdfComponent } from './pdf.component'

/**
 * Direct-instantiation unit tests for PdfComponent.
 * Built with mocked collaborators; exercises public methods, ngOnInit branches,
 * telemetry dispatch and ngOnDestroy instead of full TestBed rendering.
 */
describe('PdfComponent', () => {
  let activatedRoute: any
  let viewerSvc: any
  let eventSvc: any
  let accessControlSvc: any

  function build(): PdfComponent {
    activatedRoute = {
      snapshot: {
        queryParams: {},
        queryParamMap: { get: jest.fn(() => null) },
        paramMap: { get: jest.fn(() => 'resource-1') },
      },
      data: of({ content: { data: null } }),
    }
    viewerSvc = { getContent: jest.fn(() => of(null)) }
    eventSvc = { dispatchEvent: jest.fn() }
    accessControlSvc = { authoringConfig: { newDesign: false } }
    return new PdfComponent(activatedRoute, viewerSvc, eventSvc, accessControlSvc)
  }

  beforeEach(() => {
    ;(window as any).env = { azureBucket: 'my-bucket' }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs with the default pdf widget config', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.widgetResolverPdfData.widgetSubType).toBe('playerPDF')
    expect(c.widgetResolverPdfData.widgetData.hideControls).toBe(true)
  })

  it('formDiscussionForumWidget builds the forum widget from content', () => {
    const c = build()
    c.formDiscussionForumWidget({ description: 'desc', identifier: 'id-1', name: 'Pdf name' } as any)
    expect(c.discussionForumWidget!.widgetData.id).toBe('id-1')
    expect(c.discussionForumWidget!.widgetData.title).toBe('Pdf name')
    expect(c.discussionForumWidget!.widgetType).toBe('discussionForum')
  })

  it('generateUrl returns the same url when it contains the azure bucket', () => {
    const c = build()
    const url = 'https://host/my-bucket/doc.pdf'
    expect(c.generateUrl(url)).toBe(url)
  })

  it('generateUrl returns undefined for a url without the bucket', () => {
    const c = build()
    expect(c.generateUrl('https://host/other/doc.pdf')).toBeUndefined()
  })

  it('raiseEvent dispatches a telemetry event with content details', () => {
    const c = build()
    c.raiseEvent('loaded' as any, { identifier: 'pdf-1', artifactUrl: 'u' } as any)
    expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(1)
    const event = eventSvc.dispatchEvent.mock.calls[0][0]
    expect(event.from).toBe('pdf')
    expect(event.data.identifier).toBe('pdf-1')
    expect(event.data.url).toBe('u')
  })

  it('raiseEvent is a no-op when forPreview is true', () => {
    const c = build()
    c.forPreview = true
    c.raiseEvent('loaded' as any, { identifier: 'pdf-1', artifactUrl: 'u' } as any)
    expect(eventSvc.dispatchEvent).not.toHaveBeenCalled()
  })

  it('ngOnInit (non-preview) populates pdfData, widget data and raises a loaded event', () => {
    const c = build()
    activatedRoute.data = of({
      content: { data: { identifier: 'pdf-2', artifactUrl: 'https://host/pdf-2.pdf', name: 'P', description: 'D' } },
    })
    c.ngOnInit()
    expect(c.pdfData!.identifier).toBe('pdf-2')
    expect(c.widgetResolverPdfData.widgetData.pdfUrl).toBe('https://host/pdf-2.pdf')
    expect(c.widgetResolverPdfData.widgetData.identifier).toBe('pdf-2')
    expect(c.widgetResolverPdfData.widgetData.resumePage).toBe(1)
    expect(c.alreadyRaised).toBe(true)
    expect(c.oldData!.identifier).toBe('pdf-2')
    expect(c.isFetchingDataComplete).toBe(true)
    expect(eventSvc.dispatchEvent).toHaveBeenCalled()
  })

  it('ngOnInit (non-preview) raises an unloaded event for the old data when already raised', () => {
    const c = build()
    c.alreadyRaised = true
    c.oldData = { identifier: 'old', artifactUrl: 'old-u' } as any
    activatedRoute.data = of({
      content: { data: { identifier: 'pdf-3', artifactUrl: 'u', name: 'P', description: 'D' } },
    })
    c.ngOnInit()
    // one Unloaded for the old data + one Loaded for the new data
    expect(eventSvc.dispatchEvent).toHaveBeenCalledTimes(2)
  })

  it('ngOnInit (preview branch) fetches content and disables the forum + telemetry', () => {
    const c = build()
    activatedRoute.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'preview' ? 'true' : null))
    viewerSvc.getContent = jest.fn(() =>
      of({ identifier: 'p-1', artifactUrl: 'https://host/my-bucket/p.pdf', name: 'P', description: 'D' }),
    )
    c.ngOnInit()
    expect(viewerSvc.getContent).toHaveBeenCalledWith('resource-1')
    expect(c.isPreviewMode).toBe(true)
    expect(c.pdfData!.identifier).toBe('p-1')
    expect(c.widgetResolverPdfData.widgetData.pdfUrl).toBe('https://host/my-bucket/p.pdf')
    expect(c.widgetResolverPdfData.widgetData.disableTelemetry).toBe(true)
    expect(c.discussionForumWidget!.widgetData.isDisabled).toBe(true)
    expect(c.isFetchingDataComplete).toBe(true)
  })

  it('ngOnDestroy raises an unloaded event for the current pdf and unsubscribes safely', () => {
    const c = build()
    c.pdfData = { identifier: 'pdf-9', artifactUrl: 'u' } as any
    expect(() => c.ngOnDestroy()).not.toThrow()
    expect(eventSvc.dispatchEvent).toHaveBeenCalled()
  })

  it('ngOnDestroy is safe with no active data or subscriptions', () => {
    const c = build()
    expect(() => c.ngOnDestroy()).not.toThrow()
  })
})
