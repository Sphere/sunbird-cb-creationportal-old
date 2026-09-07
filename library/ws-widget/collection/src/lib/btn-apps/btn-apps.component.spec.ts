import { NavigationEnd, NavigationStart } from '@angular/router'
import { BehaviorSubject, Subject } from 'rxjs'
import { BtnAppsComponent } from './btn-apps.component'

describe('BtnAppsComponent', () => {
  let component: BtnAppsComponent
  let dialog: any
  let configSvc: any
  let router: any
  let routerEvents$: Subject<any>
  let pinnedApps$: BehaviorSubject<Set<string>>

  const build = () => new BtnAppsComponent(dialog, configSvc, router)

  beforeEach(() => {
    routerEvents$ = new Subject<any>()
    pinnedApps$ = new BehaviorSubject<Set<string>>(new Set())
    dialog = { open: jest.fn() }
    router = { events: routerEvents$, url: '/app/features' }
    configSvc = {
      rootOrg: 'acme',
      restrictedFeatures: new Set<string>(),
      pinnedApps: pinnedApps$,
      appsConfig: { features: { search: { id: 'search' } } },
      instanceConfig: { featuredApps: ['search', 'missing'] },
    }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('router events subscription', () => {
    it('marks the url opened on NavigationStart at /app/features', () => {
      router.url = '/app/features'
      routerEvents$.next(new NavigationStart(1, '/app/features'))
      expect(component.isUrlOpened).toBe(true)
    })

    it('clears the flag on NavigationStart away from /app/features', () => {
      router.url = '/app/other'
      routerEvents$.next(new NavigationStart(1, '/app/other'))
      expect(component.isUrlOpened).toBe(false)
    })

    it('marks the url opened on NavigationEnd at /app/features', () => {
      router.url = '/app/features'
      routerEvents$.next(new NavigationEnd(1, '/app/features', '/app/features'))
      expect(component.isUrlOpened).toBe(true)
    })

    it('clears the flag on NavigationEnd away from /app/features', () => {
      router.url = '/app/other'
      routerEvents$.next(new NavigationEnd(1, '/app/other', '/app/other'))
      expect(component.isUrlOpened).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('reads org and pin availability, and populates the app lists', () => {
      component.ngOnInit()
      expect(component.instanceVal).toBe('acme')
      expect(component.isPinFeatureAvailable).toBe(true)
      expect(component.featuredApps.length).toBe(1)
    })

    it('falls back to an empty org when rootOrg is missing', () => {
      configSvc.rootOrg = ''
      const c = build()
      c.ngOnInit()
      expect(c.instanceVal).toBe('')
    })

    it('disables the pin feature when it is restricted', () => {
      configSvc.restrictedFeatures = new Set(['pinFeatures'])
      const c = build()
      c.ngOnInit()
      expect(c.isPinFeatureAvailable).toBe(false)
    })

    it('leaves pin availability untouched when there are no restricted features', () => {
      configSvc.restrictedFeatures = undefined
      const c = build()
      c.ngOnInit()
      expect(c.isPinFeatureAvailable).toBe(true)
    })
  })

  describe('setPinnedApps', () => {
    it('maps the pinned ids present in the apps config', () => {
      pinnedApps$.next(new Set(['search', 'missing']))
      component.setPinnedApps()
      expect(component.pinnedApps.length).toBe(1)
      expect(component.pinnedApps[0].widgetData.actionBtn).toEqual({ id: 'search' })
      expect(component.pinnedApps[0].widgetData.config.type).toBe('feature-item')
    })

    it('does nothing when there is no apps config', () => {
      configSvc.appsConfig = null
      pinnedApps$.next(new Set(['search']))
      component.setPinnedApps()
      expect(component.pinnedApps).toEqual([])
    })
  })

  describe('setFeaturedApps', () => {
    it('maps the featured ids present in the apps config with hidePin', () => {
      component.setFeaturedApps()
      expect(component.featuredApps.length).toBe(1)
      expect(component.featuredApps[0].widgetData.config.hidePin).toBe(true)
      expect(component.featuredApps[0].widgetData.actionBtn).toEqual({ id: 'search' })
    })

    it('does nothing without an instance config', () => {
      configSvc.instanceConfig = null
      component.setFeaturedApps()
      expect(component.featuredApps).toEqual([])
    })

    it('does nothing without an apps config', () => {
      configSvc.appsConfig = null
      component.setFeaturedApps()
      expect(component.featuredApps).toEqual([])
    })
  })

  describe('logout', () => {
    it('opens the logout dialog', () => {
      component.logout()
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the pinned apps and router streams', () => {
      component.ngOnInit()
      expect(() => component.ngOnDestroy()).not.toThrow()
      const before = component.isUrlOpened
      router.url = '/app/other'
      routerEvents$.next(new NavigationEnd(1, '/app/other', '/app/other'))
      // subscription torn down: flag should not have changed from the router event
      expect(component.isUrlOpened).toBe(before)
    })

    it('is safe when nothing was subscribed', () => {
      const c = build()
      c.ngOnDestroy()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
