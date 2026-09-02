import { of, throwError, Subscription } from 'rxjs'
import { AchievementsComponent } from './achievements.component'

describe('AchievementsComponent', () => {
  let route: any
  let router: any
  let changeDetect: any

  const competencyData = (): any => ({
    achievements: [{ id: 'c1' }, { id: 'c2' }],
  })

  const build = (url = '/app/profile/competency/course') => {
    route = { data: of({ competencyData: competencyData() }) }
    router = { url }
    changeDetect = { detectChanges: jest.fn() }
    return new AchievementsComponent(route, router, changeDetect)
  }

  it('is created with sensible defaults', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.contentType).toBe('Course')
    expect(c.startDate).toBe('2018-04-01')
    expect(c.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(c.redirectUrl.path).toBe('/app/search/learning')
  })

  describe('ngOnInit', () => {
    it('loads competency data and sets done status', () => {
      const c = build('/app/profile/competency/course')
      c.ngOnInit()
      expect(c.assessmentsData).not.toBeNull()
      expect(c.assessmentsList).toHaveLength(2)
      expect(c.achievementType).toBe('course')
      expect(c.apiFetchStatus).toBe('done')
    })

    it('sets an assessment redirect url when the route ends in assessment', () => {
      const c = build('/app/profile/competency/assessment')
      c.ngOnInit()
      expect(c.achievementType).toBe('assessment')
      const f = JSON.parse(c.redirectUrl.qParams.f)
      expect(f.resourceType).toEqual(['Assessment'])
      expect(f.contentType).toEqual(['Resource'])
    })

    it('resets data before loading (fetching then done)', () => {
      const c = build()
      const resetSpy = jest.spyOn(c, 'resetData')
      c.ngOnInit()
      expect(resetSpy).toHaveBeenCalled()
      expect(changeDetect.detectChanges).toHaveBeenCalled()
    })

    it('sets error status when the route data stream errors', () => {
      route = { data: throwError(() => 'boom') }
      router = { url: '/x' }
      changeDetect = { detectChanges: jest.fn() }
      const c = new AchievementsComponent(route, router, changeDetect)
      c.ngOnInit()
      expect(c.apiFetchStatus).toBe('error')
    })

    it('does nothing when there is no route', () => {
      const c = new AchievementsComponent(null as any, { url: '/x' } as any, { detectChanges: jest.fn() } as any)
      c.ngOnInit()
      expect(c.apiFetchStatus).toBeNull()
    })
  })

  describe('resetData', () => {
    it('clears data and triggers change detection', () => {
      const c = build()
      c.assessmentsData = { achievements: [] } as any
      c.assessmentsList = [{ id: 'x' } as any]
      c.resetData()
      expect(c.apiFetchStatus).toBe('fetching')
      expect(c.assessmentsData).toBeNull()
      expect(c.assessmentsList).toEqual([])
      expect(changeDetect.detectChanges).toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes the route subscription', () => {
      const c = build()
      const sub = new Subscription()
      const unsub = jest.spyOn(sub, 'unsubscribe')
      ;(c as any).routeSubscription = sub
      c.ngOnDestroy()
      expect(unsub).toHaveBeenCalled()
    })

    it('is safe when there is no subscription', () => {
      const c = build()
      ;(c as any).routeSubscription = null
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
