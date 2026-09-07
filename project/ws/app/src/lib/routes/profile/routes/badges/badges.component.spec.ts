import { of, throwError } from 'rxjs'
import { BadgesComponent } from './badges.component'

// Direct-instantiation spec (house convention): instantiate with jest.fn() stubs and
// drive the public methods / lifecycle hooks directly rather than rendering the template.
describe('BadgesComponent', () => {
  let route: any
  let badgesSvc: any
  let logger: any
  let snackBar: any
  let configSvc: any

  const badgeResponse = (over: any = {}) => ({
    canEarn: [],
    closeToEarning: [],
    earned: [],
    lastUpdatedDate: '2024-01-01',
    recent: [],
    totalPoints: [{ collaborative_points: 5, learning_points: 10 }],
    ...over,
  })

  const build = () => new BadgesComponent(route, badgesSvc, logger, snackBar, configSvc)

  // A card-scroller ElementRef stub that also satisfies rxjs fromEvent (needs add/removeEventListener).
  const cardRef = (metrics: any = {}) => ({
    nativeElement: {
      clientWidth: 100,
      scrollLeft: 0,
      scrollWidth: 500,
      scrollTo: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ...metrics,
    },
  })

  beforeEach(() => {
    route = { data: of({ badges: { data: badgeResponse() } }) }
    badgesSvc = {
      reCalculateBadges: jest.fn().mockReturnValue(of({})),
      fetchBadges: jest.fn().mockReturnValue(of(badgeResponse())),
    }
    logger = { log: jest.fn() }
    snackBar = { open: jest.fn() }
    configSvc = { userProfile: { userName: 'John Doe' } }
  })

  describe('constructor', () => {
    it('seeds default badges and navigation flags', () => {
      const component = build()
      expect(component.badges.canEarn).toEqual([])
      expect(component.badges.totalPoints).toEqual([{ collaborative_points: 0, learning_points: 0 }])
      expect(component.disablePrev).toBe(true)
      expect(component.disableNext).toBe(false)
      expect(component.status).toBe('none')
    })

    it('derives the first name from the profile user name', () => {
      const component = build()
      expect(component.userName).toBe('John')
    })

    it('leaves userName undefined when there is no profile', () => {
      configSvc.userProfile = null
      const component = build()
      expect(component.userName).toBeUndefined()
    })
  })

  describe('ngOnInit', () => {
    it('loads badges from the resolver data and marks status done', () => {
      jest.useFakeTimers()
      const component = build()
      const initSpy = jest.spyOn(component, 'initializeObserver').mockImplementation(() => {})
      const navSpy = jest.spyOn(component, 'updateNavigationButtons').mockImplementation(() => {})
      component.ngOnInit()
      jest.advanceTimersByTime(200)
      expect(component.status).toBe('done')
      expect(component.badges.lastUpdatedDate).toBe('2024-01-01')
      expect(initSpy).toHaveBeenCalled()
      expect(navSpy).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('reCalculateBadges', () => {
    it('refreshes badges and shows a snackbar on success', () => {
      const refreshed = badgeResponse({ lastUpdatedDate: '2024-02-02' })
      badgesSvc.fetchBadges.mockReturnValue(of(refreshed))
      const component = build()
      component.reCalculateBadges()
      expect(badgesSvc.reCalculateBadges).toHaveBeenCalled()
      expect(badgesSvc.fetchBadges).toHaveBeenCalled()
      expect(component.badges).toBe(refreshed)
      expect(component.isUpdating).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('Badges Refreshed', 'X')
    })

    it('stops updating and logs when the fetch fails', () => {
      badgesSvc.fetchBadges.mockReturnValue(throwError(() => 'fetch-err'))
      const component = build()
      component.reCalculateBadges()
      expect(component.isUpdating).toBe(false)
      expect(logger.log).toHaveBeenCalledWith('fetch-err')
      expect(snackBar.open).not.toHaveBeenCalled()
    })

    it('stops updating and logs when the recalculate fails', () => {
      badgesSvc.reCalculateBadges.mockReturnValue(throwError(() => 'recalc-err'))
      const component = build()
      component.reCalculateBadges()
      expect(component.isUpdating).toBe(false)
      expect(logger.log).toHaveBeenCalledWith('recalc-err')
      expect(badgesSvc.fetchBadges).not.toHaveBeenCalled()
    })
  })

  describe('initializeObserver', () => {
    it('does nothing without a card container', () => {
      const component = build()
      component.cardContents = undefined
      component.initializeObserver()
      expect(component.scrollObserver).toBeUndefined()
    })

    it('subscribes to the container scroll stream when present', () => {
      const component = build()
      const ref = cardRef()
      component.cardContents = ref as any
      component.initializeObserver()
      expect(ref.nativeElement.addEventListener).toHaveBeenCalled()
      expect(ref.nativeElement.addEventListener.mock.calls[0][0]).toBe('scroll')
      expect(component.scrollObserver).toBeTruthy()
      component.scrollObserver!.unsubscribe()
    })
  })

  describe('scrollRight / scrollLeft', () => {
    it('scrolls right by 90% of the client width', () => {
      const component = build()
      const ref = cardRef({ clientWidth: 200, scrollLeft: 50 })
      component.cardContents = ref as any
      component.scrollRight()
      expect(ref.nativeElement.scrollTo).toHaveBeenCalledWith({ left: 50 + 200 * 0.9, behavior: 'smooth' })
    })

    it('scrolls left by 90% of the client width', () => {
      const component = build()
      const ref = cardRef({ clientWidth: 200, scrollLeft: 300 })
      component.cardContents = ref as any
      component.scrollLeft()
      expect(ref.nativeElement.scrollTo).toHaveBeenCalledWith({ left: 300 - 200 * 0.9, behavior: 'smooth' })
    })

    it('is a no-op without a container', () => {
      const component = build()
      component.cardContents = undefined
      expect(() => component.scrollRight()).not.toThrow()
      expect(() => component.scrollLeft()).not.toThrow()
    })
  })

  describe('updateNavigationButtons', () => {
    it('disables next when all content fits without scrolling', () => {
      const component = build()
      component.cardContents = cardRef({ scrollWidth: 100, clientWidth: 100 }) as any
      component.disableNext = false
      component.updateNavigationButtons()
      expect(component.disableNext).toBe(true)
    })

    it('leaves next enabled when there is overflow', () => {
      const component = build()
      component.cardContents = cardRef({ scrollWidth: 500, clientWidth: 100 }) as any
      component.disableNext = false
      component.updateNavigationButtons()
      expect(component.disableNext).toBe(false)
    })
  })

  describe('updateNavigationButtonStatus', () => {
    it('disables prev at the left edge and enables next mid-scroll', () => {
      const component = build()
      component.cardContents = cardRef({ scrollWidth: 500, clientWidth: 100 }) as any
      const el = { scrollLeft: 0, scrollWidth: 500, clientWidth: 100 } as HTMLElement
      component.updateNavigationButtonStatus(el)
      expect(component.disablePrev).toBe(true)
      expect(component.disableNext).toBe(false)
    })

    it('enables prev and disables next at the right edge', () => {
      const component = build()
      component.cardContents = cardRef({ scrollWidth: 500, clientWidth: 100 }) as any
      const el = { scrollLeft: 400, scrollWidth: 500, clientWidth: 100 } as HTMLElement
      component.updateNavigationButtonStatus(el)
      expect(component.disablePrev).toBe(false)
      expect(component.disableNext).toBe(true)
    })
  })

  describe('simulateDummyData', () => {
    it('clears earned and closeToEarning collections', () => {
      const component = build()
      component.badges.earned = [{ badge_id: '1' } as any]
      component.badges.closeToEarning = [{ badge_id: '2' } as any]
      component.simulateDummyData()
      expect(component.badges.earned).toEqual([])
      expect(component.badges.closeToEarning).toEqual([])
    })
  })
})
