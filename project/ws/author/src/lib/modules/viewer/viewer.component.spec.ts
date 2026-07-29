import { ViewerComponent } from './viewer.component'

describe('ViewerComponent', () => {
  let accessControlSvc: any

  const build = () => new ViewerComponent(accessControlSvc)

  beforeEach(() => {
    accessControlSvc = { authoringConfig: { newDesign: false } }
  })

  it('is created with default preview devices and desktop selected', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.previewDevices).toHaveLength(3)
    expect(c.selected).toBe(c.previewDevices[2])
    expect(c.selected.value).toBe('desktop')
  })

  it('ngOnInit does not throw', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  it('ngOnDestroy does not throw', () => {
    const c = build()
    expect(() => c.ngOnDestroy()).not.toThrow()
  })

  describe('ngOnChanges', () => {
    it('builds the legacy viewer url when newDesign is off', () => {
      const c = build()
      c.identifier = 'id1'
      c.mimeTypeRoute = 'pdf'
      c.ngOnChanges()
      expect(c.iframeUrl).toBe('/viewer/pdf/id1?preview=true')
    })

    it('builds the channel url when newDesign is on and route is channel', () => {
      accessControlSvc.authoringConfig.newDesign = true
      const c = build()
      c.identifier = 'id1'
      c.mimeTypeRoute = 'channel'
      c.ngOnChanges()
      expect(c.iframeUrl).toBe('author/viewer/channel/id1')
    })

    it('builds the toc overview url when newDesign is on and route is not channel', () => {
      accessControlSvc.authoringConfig.newDesign = true
      const c = build()
      c.identifier = 'id1'
      c.mimeTypeRoute = 'pdf'
      c.ngOnChanges()
      expect(c.iframeUrl).toBe('author/toc/id1/overview')
    })
  })

  describe('ngAfterViewInit', () => {
    it('reads element values into the preview device view values', () => {
      const c = build()
      c.mobile = { nativeElement: { value: 'Mobile' } } as any
      c.tab = { nativeElement: { value: 'Tablet' } } as any
      c.desktop = { nativeElement: { value: 'My Desktop' } } as any
      c.ngAfterViewInit()
      expect(c.previewDevices[0].viewValue).toBe('Mobile')
      expect(c.previewDevices[1].viewValue).toBe('Tablet')
      expect(c.previewDevices[2].viewValue).toBe('My Desktop')
      expect(c.selected).toBe(c.previewDevices[2])
    })

    it('falls back to defaults when view children are null', () => {
      const c = build()
      c.mobile = null
      c.tab = null
      c.desktop = null
      c.ngAfterViewInit()
      expect(c.previewDevices[0].viewValue).toBe('')
      expect(c.previewDevices[1].viewValue).toBe('')
      expect(c.previewDevices[2].viewValue).toBe('Desktop')
    })

    it('falls back to Desktop label when the desktop element value is empty', () => {
      const c = build()
      c.desktop = { nativeElement: { value: '' } } as any
      c.ngAfterViewInit()
      expect(c.previewDevices[2].viewValue).toBe('Desktop')
    })
  })
})
