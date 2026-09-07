import { of, Subject } from 'rxjs'
import { ContentDetailHomeComponent } from './content-detail-home.component'
import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE } from '@ws/author/src/lib/constants/content-role'

describe('ContentDetailHomeComponent', () => {
  let valueSvc: any
  let accessService: any
  let toc: any
  let activeRoute: any
  let isLtMedium$: Subject<boolean>

  const build = () => new ContentDetailHomeComponent(valueSvc, accessService, toc, activeRoute)

  beforeEach(() => {
    isLtMedium$ = new Subject<boolean>()
    valueSvc = { isLtMedium$ }
    accessService = {
      hasRole: jest.fn().mockReturnValue(false),
      authoringConfig: {
        allowRedo: true,
        allowRestore: true,
        allowExpiry: false,
        allowReview: true,
        allowPublish: true,
        newDesign: true,
      },
    }
    toc = {}
    activeRoute = {
      snapshot: { data: { pageData: { data: { menus: [{ id: 1 }] } } } },
    }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  it('should expose isLtMedium$ and a derived mode$ observable', done => {
    const c = build()
    const emitted: string[] = []
    c.mode$.subscribe(m => emitted.push(m))
    isLtMedium$.next(true)
    isLtMedium$.next(false)
    setTimeout(() => {
      expect(emitted).toEqual(['over', 'side'])
      done()
    }, 0)
  })

  describe('canShow', () => {
    it('returns hasRole(REVIEW_ROLE) for review', () => {
      accessService.hasRole.mockReturnValue(true)
      expect(build().canShow('review')).toBe(true)
      expect(accessService.hasRole).toHaveBeenCalledWith(REVIEW_ROLE)
    })
    it('returns hasRole(PUBLISH_ROLE) for publish', () => {
      accessService.hasRole.mockReturnValue(true)
      expect(build().canShow('publish')).toBe(true)
      expect(accessService.hasRole).toHaveBeenCalledWith(PUBLISH_ROLE)
    })
    it('returns hasRole(CREATE_ROLE) for author', () => {
      accessService.hasRole.mockReturnValue(true)
      expect(build().canShow('author')).toBe(true)
      expect(accessService.hasRole).toHaveBeenCalledWith(CREATE_ROLE)
    })
    it('returns false for an unknown role', () => {
      expect(build().canShow('nope')).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('wires the allow flags from config and roles', () => {
      accessService.hasRole.mockReturnValue(true)
      const c = build()
      c.ngOnInit()
      expect(c.allowAuthor).toBe(true)
      expect(c.allowRedo).toBe(true)
      expect(c.allowRestore).toBe(true)
      expect(c.allowExpiry).toBe(false)
      expect(c.allowReview).toBe(true)
      expect(c.allowPublish).toBe(true)
      expect(c.isNewDesign).toBe(true)
      expect(c.leftmenues).toEqual([{ id: 1 }])
    })

    it('gates review/publish behind both role and config', () => {
      accessService.hasRole.mockReturnValue(false)
      const c = build()
      c.ngOnInit()
      expect(c.allowReview).toBe(false)
      expect(c.allowPublish).toBe(false)
      expect(c.allowAuthor).toBe(false)
    })

    it('subscribes to isLtMedium$ updating sideNavBarOpened and screenSizeIsLtMedium', () => {
      const c = build()
      c.ngOnInit()
      isLtMedium$.next(true)
      expect(c.sideNavBarOpened).toBe(false)
      expect(c.screenSizeIsLtMedium).toBe(true)
      isLtMedium$.next(false)
      expect(c.sideNavBarOpened).toBe(true)
      expect(c.screenSizeIsLtMedium).toBe(false)
    })

    it('defaults leftmenues to [] when menus are absent', () => {
      activeRoute.snapshot.data = { pageData: { data: {} } }
      const c = build()
      c.ngOnInit()
      expect(c.leftmenues).toEqual([])
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes the isLtMedium subscription', () => {
      const c = build()
      c.ngOnInit()
      const sub = (c as any).defaultSideNavBarOpenedSubscription
      const spy = jest.spyOn(sub, 'unsubscribe')
      c.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
    })
    it('does nothing when there is no subscription', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })

  describe('back', () => {
    let backSpy: jest.SpyInstance
    beforeEach(() => {
      backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => undefined)
    })
    afterEach(() => backSpy.mockRestore())

    it('calls history.back when top-level window', () => {
      const c = build()
      // window.self === window.top in jsdom by default
      c.back()
      expect(backSpy).toHaveBeenCalled()
    })

    it('returns early (no history.back) when embedded in an iframe', () => {
      const c = build()
      const selfSpy = jest.spyOn(window, 'self', 'get').mockReturnValue({} as any)
      c.back()
      expect(backSpy).not.toHaveBeenCalled()
      selfSpy.mockRestore()
    })

    it('falls back to history.back when the frame check throws', () => {
      const c = build()
      jest.spyOn(window, 'self', 'get').mockImplementation(() => {
        throw new Error('cross-origin')
      })
      c.back()
      expect(backSpy).toHaveBeenCalled()
    })
  })

  it('marks isLtMedium$ helper via of() based value service too', () => {
    valueSvc.isLtMedium$ = of(false)
    const c = build()
    expect(c.isLtMedium$).toBeTruthy()
  })
})
