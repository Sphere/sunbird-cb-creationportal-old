import { ResourceCollectionComponent } from './resource-collection.component'

describe('ResourceCollectionComponent (route-view container)', () => {
  let activatedRoute: any
  let configSvc: any

  const build = () => new ResourceCollectionComponent(activatedRoute, configSvc)

  beforeEach(() => {
    activatedRoute = { snapshot: { queryParams: {} } }
    configSvc = { restrictedFeatures: new Set<string>() }
  })

  it('starts with the documented defaults', () => {
    const comp = build()
    expect(comp.isFetchingDataComplete).toBe(false)
    expect(comp.isErrorOccured).toBe(false)
    expect(comp.forPreview).toBe(false)
    expect(comp.resourceCollectionData).toBeNull()
    expect(comp.discussionForumWidget).toBeNull()
    expect(comp.isPreviewMode).toBe(false)
    expect(comp.isTypeOfCollection).toBe(false)
    expect(comp.collectionId).toBeNull()
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

    it('captures the collection id when viewed inside a collection', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'Course', collectionId: 'do_456' }
      const comp = build()
      comp.ngOnInit()
      expect(comp.isTypeOfCollection).toBe(true)
      expect(comp.collectionId).toBe('do_456')
    })

    it('leaves the collection id null outside a collection', () => {
      const comp = build()
      comp.ngOnInit()
      expect(comp.isTypeOfCollection).toBe(false)
      expect(comp.collectionId).toBeNull()
    })
  })
})
