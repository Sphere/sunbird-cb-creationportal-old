import { LeftMenuComponent } from './left-menu.component'
import { ILeftMenu, IMenu } from './left-menu.model'

describe('LeftMenuComponent', () => {
  let component: LeftMenuComponent
  let activatedRoute: any
  let router: any

  const build = () => new LeftMenuComponent(activatedRoute, router)

  beforeEach(() => {
    activatedRoute = {
      snapshot: {
        fragment: '',
        firstChild: { params: {} },
      },
    }
    router = { url: '/app/toc' }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  it('ngOnInit and ngOnDestroy run without error', () => {
    expect(() => component.ngOnInit()).not.toThrow()
    expect(() => component.ngOnDestroy()).not.toThrow()
  })

  describe('changeToDefaultImg', () => {
    it('sets the target src to the default logo', () => {
      const event = { target: { src: 'broken.png' } }
      component.changeToDefaultImg(event)
      expect(event.target.src).toBe('/assets/instances/eagle/app_logos/default.png')
    })
  })

  describe('isLinkActive', () => {
    it('returns true when the url matches the route fragment and index is truthy', () => {
      activatedRoute.snapshot.fragment = 'overview'
      expect(component.isLinkActive('overview', 2)).toBe(true)
    })

    it('returns false when the url does not match the fragment', () => {
      activatedRoute.snapshot.fragment = 'other'
      expect(component.isLinkActive('overview', 2)).toBe(false)
    })

    it('returns true when index is 0', () => {
      expect(component.isLinkActive(undefined, 0)).toBe(true)
    })

    it('returns false when no url and index is not 0', () => {
      expect(component.isLinkActive(undefined, 3)).toBe(false)
    })

    it('returns false when nothing is provided', () => {
      expect(component.isLinkActive()).toBe(false)
    })
  })

  describe('isLinkActive2', () => {
    it('returns true when the router url (without query) equals the given url', () => {
      router.url = '/app/toc?foo=1'
      expect(component.isLinkActive2('/app/toc')).toBe(true)
    })

    it('returns false when the router url does not match', () => {
      router.url = '/app/other'
      expect(component.isLinkActive2('/app/toc')).toBe(false)
    })

    it('returns false when no url is provided', () => {
      expect(component.isLinkActive2()).toBe(false)
    })
  })

  describe('getLink', () => {
    it('replaces the <param> placeholder with the route param when custom routing is on', () => {
      activatedRoute.snapshot.firstChild.params = { id: '123' }
      const tab: IMenu = {
        name: 'Tab',
        key: 'k',
        render: true,
        enabled: true,
        routerLink: '/app/detail/<param>',
        customRouting: true,
        paramaterName: 'id',
      }
      expect(component.getLink(tab)).toBe('/app/detail/123')
    })

    it('returns undefined when custom routing is not enabled', () => {
      const tab: IMenu = {
        name: 'Tab',
        key: 'k',
        render: true,
        enabled: true,
        routerLink: '/app/detail',
      }
      expect(component.getLink(tab)).toBeUndefined()
    })

    it('returns undefined when there is no firstChild', () => {
      activatedRoute.snapshot.firstChild = null
      const tab: IMenu = {
        name: 'Tab',
        key: 'k',
        render: true,
        enabled: true,
        routerLink: '/app/detail/<param>',
        customRouting: true,
        paramaterName: 'id',
      }
      expect(component.getLink(tab)).toBeUndefined()
    })
  })

  describe('isAllowed', () => {
    const baseData: ILeftMenu = { name: 'menu', menus: [] }

    it('returns true when no required roles are set', () => {
      component.widgetData = { ...baseData }
      const tab: IMenu = { name: 'T', key: 'k', render: true, enabled: true, routerLink: '/' }
      expect(component.isAllowed(tab)).toBe(true)
    })

    it('returns true when the user has one of the required roles', () => {
      component.widgetData = { ...baseData, userRoles: new Set(['admin']) }
      const tab: IMenu = {
        name: 'T',
        key: 'k',
        render: true,
        enabled: true,
        routerLink: '/',
        requiredRoles: ['admin'],
      }
      expect(component.isAllowed(tab)).toBe(true)
    })

    it('returns false when the user has none of the required roles', () => {
      component.widgetData = { ...baseData, userRoles: new Set(['viewer']) }
      const tab: IMenu = {
        name: 'T',
        key: 'k',
        render: true,
        enabled: true,
        routerLink: '/',
        requiredRoles: ['admin'],
      }
      expect(component.isAllowed(tab)).toBe(false)
    })

    it('returns false when required roles exist but userRoles is undefined', () => {
      component.widgetData = { ...baseData }
      const tab: IMenu = {
        name: 'T',
        key: 'k',
        render: true,
        enabled: true,
        routerLink: '/',
        requiredRoles: ['admin'],
      }
      expect(component.isAllowed(tab)).toBe(false)
    })
  })
})
