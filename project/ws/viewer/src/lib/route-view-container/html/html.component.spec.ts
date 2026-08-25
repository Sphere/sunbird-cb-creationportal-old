import { Subject } from 'rxjs'
import { HtmlComponent } from './html.component'

describe('HtmlComponent', () => {
  let activatedRoute: any
  let domSanitizer: any
  let pipeLimitTo: any
  let valueSvc: any
  let configSvc: any
  let viewerDataSvc: any
  let playerState$: Subject<any>
  let isLtMedium$: Subject<boolean>
  let component: HtmlComponent

  const build = () => {
    const c = new HtmlComponent(activatedRoute, domSanitizer, pipeLimitTo, valueSvc, configSvc, viewerDataSvc)
    return c
  }

  beforeEach(() => {
    playerState$ = new Subject<any>()
    isLtMedium$ = new Subject<boolean>()
    activatedRoute = { snapshot: { queryParams: {} } }
    domSanitizer = { bypassSecurityTrustHtml: jest.fn((v: string) => `safe:${v}`) }
    pipeLimitTo = { transform: jest.fn((v: string, n: number) => v.slice(0, n)) }
    valueSvc = { isLtMedium$ }
    configSvc = { restrictedFeatures: new Set<string>() }
    viewerDataSvc = { playerState: playerState$ }
    component = build()
  })

  it('should create with default input state', () => {
    expect(component).toBeTruthy()
    expect(component.isNotEmbed).toBe(true)
    expect(component.isFetchingDataComplete).toBe(false)
    expect(component.isTypeOfCollection).toBe(false)
    expect(component.isScormContent).toBe(false)
    expect(component.isRestricted).toBe(false)
  })

  describe('ngOnInit', () => {
    it('marks a collection view when a collectionType query param is present', () => {
      activatedRoute.snapshot.queryParams = { collectionType: 'course' }
      const c = build()

      c.ngOnInit()

      expect(c.isTypeOfCollection).toBe(true)
    })

    it('leaves collection flag false without the query param', () => {
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

    it('tracks prev/next resource urls from player state', () => {
      component.ngOnInit()

      playerState$.next({ prevResource: '/prev', nextResource: '/next' })

      expect(component.prevResourceUrl).toBe('/prev')
      expect(component.nextResourceUrl).toBe('/next')
    })

    it('tracks the less-than-medium breakpoint', () => {
      component.ngOnInit()

      isLtMedium$.next(true)
      expect(component.isLtMedium).toBe(true)

      isLtMedium$.next(false)
      expect(component.isLtMedium).toBe(false)
    })

    it('keeps a subscription handle for player state', () => {
      component.ngOnInit()
      expect(component.viewerDataServiceSubscription).toBeDefined()
    })
  })

  describe('ngOnChanges', () => {
    it('detects scorm content by artifact url', () => {
      component.htmlData = { artifactUrl: 'https://scorm.example.com/pkg' } as any

      component.ngOnChanges({ htmlData: {} as any })

      expect(component.isScormContent).toBe(true)
    })

    it('marks non-scorm content when the artifact url is elsewhere', () => {
      component.htmlData = { artifactUrl: 'https://cdn.example.com/pkg' } as any

      component.ngOnChanges({ htmlData: {} as any })

      expect(component.isScormContent).toBe(false)
    })

    it('sanitizes the learning objective html', () => {
      component.htmlData = {
        artifactUrl: 'https://x/y',
        learningObjective: '<b>goal</b>',
      } as any

      component.ngOnChanges({ htmlData: {} as any })

      expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<b>goal</b>')
      expect(component.learningObjective).toBe('safe:<b>goal</b>')
    })

    it('truncates then sanitizes the description', () => {
      const longDesc = 'a'.repeat(500)
      component.htmlData = { artifactUrl: 'https://x/y', description: longDesc } as any

      component.ngOnChanges({ htmlData: {} as any })

      expect(pipeLimitTo.transform).toHaveBeenCalledWith(longDesc, 450)
      expect(component.description).toBe(`safe:${longDesc.slice(0, 450)}`)
    })

    it('ignores changes to unrelated inputs', () => {
      component.htmlData = { artifactUrl: 'https://scorm.a/b' } as any

      component.ngOnChanges({ isPreviewMode: {} as any })

      // htmlData branch never ran, so scorm flag stays at its default
      expect(component.isScormContent).toBe(false)
      expect(domSanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled()
    })

    it('is a no-op when htmlData is null', () => {
      component.htmlData = null

      expect(() => component.ngOnChanges({ htmlData: {} as any })).not.toThrow()
      expect(component.isScormContent).toBe(false)
    })
  })
})
