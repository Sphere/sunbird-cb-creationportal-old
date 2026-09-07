import { of } from 'rxjs'

import { PdfComponent } from './pdf.component'

describe('PdfComponent', () => {
  let activatedRoute: any
  let configSvc: any
  let viewerDataSvc: any

  const build = () => new PdfComponent(activatedRoute, configSvc, viewerDataSvc)

  beforeEach(() => {
    activatedRoute = {
      snapshot: { queryParams: {} },
    }
    configSvc = {
      restrictedFeatures: new Set<string>(),
    }
    viewerDataSvc = {
      playerState: of({ tocAvailable: true }),
    }
  })

  it('should create with default input values', () => {
    const component = build()
    expect(component).toBeTruthy()
    expect(component.isFetchingDataComplete).toBe(false)
    expect(component.pdfData).toBeNull()
    expect(component.forPreview).toBe(false)
    expect(component.isPreviewMode).toBe(false)
    expect(component.isTypeOfCollection).toBe(false)
    expect(component.isRestricted).toBe(false)
    expect(component.widgetResolverPdfData.widgetSubType).toBe('playerPDF')
  })

  describe('ngOnInit', () => {
    it('should set isRestricted true when disscussionForum feature is absent', () => {
      configSvc.restrictedFeatures = new Set<string>(['someOther'])
      const component = build()

      component.ngOnInit()

      expect(component.isRestricted).toBe(true)
    })

    it('should set isRestricted false when disscussionForum feature is present', () => {
      configSvc.restrictedFeatures = new Set<string>(['disscussionForum'])
      const component = build()

      component.ngOnInit()

      expect(component.isRestricted).toBe(false)
    })

    it('should leave isRestricted false when restrictedFeatures is undefined', () => {
      configSvc.restrictedFeatures = undefined
      const component = build()

      component.ngOnInit()

      expect(component.isRestricted).toBe(false)
    })

    it('should set isTypeOfCollection true when collectionType query param present', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'course' }
      const component = build()

      component.ngOnInit()

      expect(component.isTypeOfCollection).toBe(true)
    })

    it('should set isTypeOfCollection false when collectionType query param absent', () => {
      activatedRoute.snapshot.queryParams = {}
      const component = build()

      component.ngOnInit()

      expect(component.isTypeOfCollection).toBe(false)
    })

    it('should subscribe to playerState', () => {
      const component = build()

      component.ngOnInit()

      expect(component.viewerDataServiceSubscription).toBeDefined()
      expect(typeof component.viewerDataServiceSubscription.unsubscribe).toBe('function')
    })
  })
})
