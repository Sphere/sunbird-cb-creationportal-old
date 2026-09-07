import { NavigationEnd, NavigationStart } from '@angular/router'
import { BehaviorSubject, Subject } from 'rxjs'
import { BtnFeatureComponent, typeMap } from './btn-feature.component'

describe('BtnFeatureComponent', () => {
  let component: BtnFeatureComponent
  let events: any
  let configurationsSvc: any
  let btnFeatureSvc: any
  let router: any
  let routerEvents$: Subject<any>
  let pinnedApps$: BehaviorSubject<Set<string>>
  let mobileSvc: any
  let configSvc: any
  let tour: any

  const build = () => new BtnFeatureComponent(events, configurationsSvc, btnFeatureSvc, router, mobileSvc, configSvc, tour)

  beforeEach(() => {
    routerEvents$ = new Subject<any>()
    pinnedApps$ = new BehaviorSubject<Set<string>>(new Set())
    events = { raiseInteractTelemetry: jest.fn() }
    configurationsSvc = {
      appsConfig: { features: {} },
      pinnedApps: pinnedApps$,
      prefChangeNotifier: { next: jest.fn() },
    }
    btnFeatureSvc = {
      getBadgeCount: jest.fn().mockResolvedValue(0),
    }
    router = { events: routerEvents$ }
    mobileSvc = { isMobile: false }
    configSvc = {
      rootOrg: 'acme',
      restrictedFeatures: new Set<string>(),
    }
    tour = { startTour: jest.fn() }

    component = build()
    component.widgetData = { actionBtn: undefined, actionBtnId: undefined } as any
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component.displayType).toBe(typeMap)
  })

  describe('ngOnInit', () => {
    it('reads the org and pin-feature availability from config', () => {
      component.ngOnInit()

      expect(component.instanceVal).toBe('acme')
      expect(component.isPinFeatureAvailable).toBe(true)
    })

    it('disables the pin feature when it is restricted', () => {
      configSvc.restrictedFeatures = new Set(['pinFeatures'])
      const c = build()
      c.widgetData = { actionBtn: undefined, actionBtnId: undefined } as any

      c.ngOnInit()

      expect(c.isPinFeatureAvailable).toBe(false)
    })

    it('falls back to empty org when rootOrg is missing', () => {
      configSvc.rootOrg = ''
      const c = build()
      c.widgetData = { actionBtn: undefined, actionBtnId: undefined } as any

      c.ngOnInit()

      expect(c.instanceVal).toBe('')
    })

    it('resolves the action button from the apps config by id', () => {
      configurationsSvc.appsConfig.features = { search: { id: 'search' } }
      component.widgetData = { actionBtnId: 'search' } as any

      component.ngOnInit()

      expect(component.widgetData.actionBtn).toEqual({ id: 'search' })
    })

    it('subscribes to router events to refresh a badge endpoint', () => {
      configurationsSvc.appsConfig.features = {
        search: { id: 'search', badgeEndpoint: '/badge' },
      }
      component.widgetData = { actionBtnId: 'search' } as any

      component.ngOnInit()
      routerEvents$.next(new NavigationEnd(1, '/x', '/x'))

      expect(btnFeatureSvc.getBadgeCount).toHaveBeenCalledWith('/badge')
    })

    it('does not refresh a badge on non-end navigation events', () => {
      configurationsSvc.appsConfig.features = {
        search: { id: 'search', badgeEndpoint: '/badge' },
      }
      component.widgetData = { actionBtnId: 'search' } as any

      component.ngOnInit()
      routerEvents$.next(new NavigationStart(1, '/x'))

      expect(btnFeatureSvc.getBadgeCount).not.toHaveBeenCalled()
    })

    it('marks the button pinned when it is in the pinned apps set', () => {
      component.widgetData = { actionBtn: { id: 'search' } } as any

      component.ngOnInit()
      pinnedApps$.next(new Set(['search']))

      expect(component.isPinned).toBe(true)
    })

    it('defaults the host id from the action button id', () => {
      component.widgetData = { actionBtnId: 'search' } as any

      component.ngOnInit()

      expect(component.id).toBe('search')
    })
  })

  describe('updateBadge', () => {
    it('shows 99+ when the count exceeds 99', async () => {
      btnFeatureSvc.getBadgeCount.mockResolvedValue(150)
      component.widgetData = { actionBtn: { badgeEndpoint: '/b' } } as any

      component.updateBadge()
      await Promise.resolve()

      expect(component.badgeCount).toBe('99+')
    })

    it('shows the raw count when between 1 and 99', async () => {
      btnFeatureSvc.getBadgeCount.mockResolvedValue(5)
      component.widgetData = { actionBtn: { badgeEndpoint: '/b' } } as any

      component.updateBadge()
      await Promise.resolve()

      expect(component.badgeCount).toBe('5')
    })

    it('clears the badge when the count is zero', async () => {
      btnFeatureSvc.getBadgeCount.mockResolvedValue(0)
      component.badgeCount = 'stale'
      component.widgetData = { actionBtn: { badgeEndpoint: '/b' } } as any

      component.updateBadge()
      await Promise.resolve()

      expect(component.badgeCount).toBe('')
    })

    it('does nothing without a badge endpoint', () => {
      component.widgetData = { actionBtn: {} } as any

      component.updateBadge()

      expect(btnFeatureSvc.getBadgeCount).not.toHaveBeenCalled()
    })
  })

  describe('featureStatusColor', () => {
    it.each([
      ['earlyAccess', 'primary'],
      ['beta', 'accent'],
      ['alpha', 'warn'],
      ['ga', null],
    ])('maps status %s to %s', (status, expected) => {
      component.widgetData = { actionBtn: { status } } as any
      expect(component.featureStatusColor).toBe(expected)
    })

    it('returns null when there is no action button', () => {
      component.widgetData = {} as any
      expect(component.featureStatusColor).toBeNull()
    })
  })

  describe('desktopVisible', () => {
    it('hides a mobile-only feature on desktop', () => {
      mobileSvc.isMobile = false
      component.widgetData = { actionBtn: { mobileAppFunction: true } } as any

      expect(component.desktopVisible).toBe(false)
    })

    it('shows a mobile-only feature on mobile', () => {
      mobileSvc.isMobile = true
      component.widgetData = { actionBtn: { mobileAppFunction: true } } as any

      expect(component.desktopVisible).toBe(true)
    })

    it('shows a normal feature everywhere', () => {
      component.widgetData = { actionBtn: {} } as any
      expect(component.desktopVisible).toBe(true)
    })
  })

  describe('togglePin', () => {
    it('adds a feature to the pinned set when not pinned', () => {
      const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() }

      component.togglePin('search', event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('pin', 'feature', {
        featureId: 'search',
      })
      expect(component.isPinned).toBe(true)
      expect(configurationsSvc.prefChangeNotifier.next).toHaveBeenCalledWith({
        pinnedApps: 'search',
      })
      expect(pinnedApps$.value.has('search')).toBe(true)
    })

    it('removes a feature that was already pinned', () => {
      pinnedApps$.next(new Set(['search']))
      const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() }

      component.togglePin('search', event)

      expect(component.isPinned).toBe(false)
      expect(pinnedApps$.value.has('search')).toBe(false)
    })
  })

  describe('startTour', () => {
    it('delegates to the tour service', () => {
      component.startTour()
      expect(tour.startTour).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the pinned apps and navigation streams', () => {
      configurationsSvc.appsConfig.features = {
        search: { id: 'search', badgeEndpoint: '/badge' },
      }
      component.widgetData = { actionBtnId: 'search' } as any
      component.ngOnInit()

      expect(() => component.ngOnDestroy()).not.toThrow()

      const before = btnFeatureSvc.getBadgeCount.mock.calls.length
      routerEvents$.next(new NavigationEnd(1, '/x', '/x'))
      expect(btnFeatureSvc.getBadgeCount.mock.calls.length).toBe(before)
    })

    it('is safe when nothing was subscribed', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
