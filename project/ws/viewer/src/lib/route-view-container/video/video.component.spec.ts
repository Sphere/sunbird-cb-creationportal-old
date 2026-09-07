import { of } from 'rxjs'

import { VideoComponent } from './video.component'

describe('VideoComponent', () => {
  let activatedRoute: any
  let configSvc: any
  let viewerDataSvc: any

  const build = () => new VideoComponent(activatedRoute, configSvc, viewerDataSvc)

  beforeEach(() => {
    activatedRoute = {
      snapshot: { queryParams: {} },
    }
    configSvc = {
      restrictedFeatures: new Set<string>(),
    }
    viewerDataSvc = {
      playerState: of({ prevResource: null, nextResource: null }),
    }
  })

  it('should construct with default input values', () => {
    const comp = build()
    expect(comp).toBeTruthy()
    expect(comp.isScreenSizeSmall).toBe(false)
    expect(comp.isNotEmbed).toBe(true)
    expect(comp.isFetchingDataComplete).toBe(false)
    expect(comp.forPreview).toBe(false)
    expect(comp.isPreviewMode).toBe(false)
    expect(comp.videoData).toBeNull()
    expect(comp.isTypeOfCollection).toBe(false)
    expect(comp.isRestricted).toBe(false)
  })

  describe('ngOnInit', () => {
    it('keeps discussion forum unrestricted when the feature is present in the set', () => {
      configSvc.restrictedFeatures = new Set<string>(['disscussionForum'])
      const comp = build()
      comp.ngOnInit()
      expect(comp.isRestricted).toBe(false)
    })

    it('marks discussion forum restricted when the feature is absent from the set', () => {
      configSvc.restrictedFeatures = new Set<string>()
      const comp = build()
      comp.ngOnInit()
      expect(comp.isRestricted).toBe(true)
    })

    it('leaves isRestricted false when restrictedFeatures is undefined', () => {
      configSvc.restrictedFeatures = undefined
      const comp = build()
      comp.ngOnInit()
      expect(comp.isRestricted).toBe(false)
    })

    it('sets isTypeOfCollection true when collectionType query param is present', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'Course' }
      const comp = build()
      comp.ngOnInit()
      expect(comp.isTypeOfCollection).toBe(true)
    })

    it('sets isTypeOfCollection false when collectionType query param is absent', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.isTypeOfCollection).toBe(false)
    })

    it('captures prev and next resource urls from the player state', () => {
      viewerDataSvc.playerState = of({ prevResource: '/prev', nextResource: '/next' })
      const comp = build()
      comp.ngOnInit()
      expect(comp.prevResourceUrl).toBe('/prev')
      expect(comp.nextResourceUrl).toBe('/next')
      expect(comp.viewerDataServiceSubscription).toBeDefined()
    })
  })
})
