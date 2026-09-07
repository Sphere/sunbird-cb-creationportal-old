import { Subject } from 'rxjs'
import { AudioComponent } from './audio.component'

describe('AudioComponent (route-view-container)', () => {
  let activatedRoute: any
  let configSvc: any
  let viewerDataSvc: any
  let playerState$: Subject<any>
  let component: AudioComponent

  const build = () => new AudioComponent(activatedRoute, configSvc, viewerDataSvc)

  beforeEach(() => {
    playerState$ = new Subject<any>()
    activatedRoute = { snapshot: { queryParams: {} } }
    configSvc = { restrictedFeatures: new Set<string>() }
    viewerDataSvc = { playerState: playerState$ }
    component = build()
  })

  it('should create with default input state', () => {
    expect(component).toBeTruthy()
    expect(component.isNotEmbed).toBe(true)
    expect(component.isFetchingDataComplete).toBe(false)
    expect(component.isTypeOfCollection).toBe(false)
    expect(component.isRestricted).toBe(false)
  })

  describe('ngOnInit', () => {
    it('marks a collection view when the collectionType query param is present', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'course' }
      const c = build()

      c.ngOnInit()

      expect(c.isTypeOfCollection).toBe(true)
    })

    it('leaves the collection flag false without the query param', () => {
      component.ngOnInit()
      expect(component.isTypeOfCollection).toBe(false)
    })

    it('restricts the discussion forum when it is not an allowed feature', () => {
      configSvc.restrictedFeatures = new Set<string>(['somethingElse'])
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(true)
    })

    it('does not restrict when the discussion forum is an allowed feature', () => {
      configSvc.restrictedFeatures = new Set<string>(['disscussionForum'])
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(false)
    })

    it('leaves restriction untouched when there are no restricted features', () => {
      configSvc.restrictedFeatures = undefined
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(false)
    })

    it('tracks prev/next resource urls from complete player state', () => {
      component.ngOnInit()

      playerState$.next({
        tocAvailable: true,
        prevResource: '/prev',
        nextResource: '/next',
      })

      expect(component.prevResourceUrl).toBe('/prev')
      expect(component.nextResourceUrl).toBe('/next')
    })

    it('keeps a subscription handle for player state', () => {
      component.ngOnInit()
      expect(component.viewerDataServiceSubscription).toBeDefined()
    })
  })
})
