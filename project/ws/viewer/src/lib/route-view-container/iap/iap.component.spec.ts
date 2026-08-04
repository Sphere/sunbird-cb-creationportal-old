import { IapComponent } from './iap.component'

describe('IapComponent (route-view container)', () => {
  let activatedRoute: any
  let configSvc: any

  const build = () => new IapComponent(activatedRoute, configSvc)

  beforeEach(() => {
    activatedRoute = { snapshot: { queryParams: {} } }
    configSvc = { restrictedFeatures: new Set<string>() }
  })

  it('starts with the documented defaults', () => {
    const comp = build()
    expect(comp.isFetchingDataComplete).toBe(false)
    expect(comp.iapData).toBeNull()
    expect(comp.discussionForumWidget).toBeNull()
    expect(comp.isPreviewMode).toBe(false)
    expect(comp.forPreview).toBe(false)
    expect(comp.isTypeOfCollection).toBe(false)
    expect(comp.isRestricted).toBe(false)
  })

  describe('ngOnInit', () => {
    it('enables the discussion forum when it is not restricted', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.isRestricted).toBe(true)
    })

    it('disables the discussion forum when it is restricted', () => {
      configSvc.restrictedFeatures = new Set(['disscussionForum'])
      const comp = build()
      comp.ngOnInit()
      expect(comp.isRestricted).toBe(false)
    })

    it('leaves isRestricted untouched when there is no restricted-feature set', () => {
      configSvc.restrictedFeatures = undefined
      const comp = build()
      comp.ngOnInit()
      expect(comp.isRestricted).toBe(false)
    })

    it('flags collection mode from the collectionType query param', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'Course' }
      const comp = build()
      comp.ngOnInit()
      expect(comp.isTypeOfCollection).toBe(true)
    })

    it('is not in collection mode without the query param', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.isTypeOfCollection).toBe(false)
    })
  })
})
