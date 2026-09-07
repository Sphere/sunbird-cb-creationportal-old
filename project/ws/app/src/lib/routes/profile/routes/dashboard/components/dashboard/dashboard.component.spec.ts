import { of, throwError } from 'rxjs'
import { DashboardComponent } from './dashboard.component'

describe('DashboardComponent', () => {
  let configSvc: any
  let profileSvc: any
  let learnHstSvc: any
  let interestSvc: any
  let activatedRoute: any

  const enabledTabs = (subFeatures: any) => ({
    snapshot: { data: { pageData: { data: { enabledTabs: { dashboard: { subFeatures } } } } } },
  })

  const timeSpentResponse = () => ({
    points_and_ranks: {
      user_points_earned: 120,
      points_user_vs_org_wide: { points_percent: 55.6 },
    },
    timespent_user_vs_org_wide: { usage_percent: 44.4 },
    time_spent_by_user: 12.7,
    date_wise: [
      { key: 1577856600000, value: 42 },
      { key: 1000, value: 0 },
      { key: 2000, value: 7 },
    ],
  })

  const build = (subFeatures: any = { calendar: false, pendingCourses: false }) => {
    activatedRoute = enabledTabs(subFeatures)
    return new DashboardComponent(configSvc, profileSvc, learnHstSvc, interestSvc, activatedRoute)
  }

  beforeEach(() => {
    configSvc = {
      userProfile: { givenName: 'Jane', email: 'jane@x.org', departmentName: 'Eng' },
    }
    profileSvc = { timeSpent: jest.fn().mockReturnValue(of(timeSpentResponse())) }
    learnHstSvc = { fetchContentProgress: jest.fn().mockReturnValue(of({ result: [] })) }
    interestSvc = { fetchUserInterestsV2: jest.fn().mockReturnValue(of(['ai', 'ml'])) }
  })

  it('should be created and read the user profile', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userName).toBe('Jane')
    expect(c.userEmail).toBe('jane@x.org')
    expect(c.departmentName).toBe('Eng')
  })

  it('leaves user fields blank when no profile is present', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userName).toBe('')
    expect(c.userEmail).toBe('')
    expect(c.departmentName).toBe('')
  })

  it('reads the enabled dashboard tabs from the route snapshot', () => {
    const c = build({ calendar: true })
    expect(c.enabledTabs.subFeatures.calendar).toBe(true)
  })

  describe('ngOnInit', () => {
    it('loads interests on success', () => {
      const c = build()
      c.ngOnInit()
      expect(c.interests).toEqual(['ai', 'ml'])
      expect(c.interestFetchStatus).toBe('done')
    })

    it('marks interests errored on failure', () => {
      interestSvc.fetchUserInterestsV2.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.ngOnInit()
      expect(c.interestFetchStatus).toBe('error')
    })

    it('does not call time-spent or history when subfeatures are off', () => {
      const c = build({ calendar: false, pendingCourses: false })
      c.ngOnInit()
      expect(profileSvc.timeSpent).not.toHaveBeenCalled()
      expect(learnHstSvc.fetchContentProgress).not.toHaveBeenCalled()
    })

    it('computes the time-spent summary when the calendar tab is enabled', () => {
      const c = build({ calendar: true, pendingCourses: false })
      c.ngOnInit()
      expect(profileSvc.timeSpent).toHaveBeenCalledWith('2018-04-01', '2020-03-31', 'Course', 0)
      expect(c.apiFetchStatus).toBe('done')
      expect(c.userPointsEarned).toBe(120)
      expect(c.orgWideTimePercent).toBe(44)
      expect(c.orgWidePointsPercent).toBe(56)
      expect(c.totalLearningHours).toBe(13)
      expect(c.specialDates).toEqual([1577856600000, 2000])
    })

    it('marks the api errored when time-spent fails', () => {
      profileSvc.timeSpent.mockReturnValue(throwError(() => 'boom'))
      const c = build({ calendar: true, pendingCourses: false })
      c.ngOnInit()
      expect(c.apiFetchStatus).toBe('error')
    })

    it('loads and sorts pending courses when that tab is enabled', () => {
      learnHstSvc.fetchContentProgress.mockReturnValue(of({ result: [{ timeLeft: 5 }, { timeLeft: 1 }, { timeLeft: 3 }] }))
      const c = build({ calendar: false, pendingCourses: true })
      c.ngOnInit()
      expect(learnHstSvc.fetchContentProgress).toHaveBeenCalledWith('', 10, 'inprogress', 'course')
      expect(c.coursePending.map((x: any) => x.timeLeft)).toEqual([1, 3, 5])
      expect(c.historyFetchStatus).toBe('done')
    })

    it('sets history done even when pending-course fetch fails', () => {
      learnHstSvc.fetchContentProgress.mockReturnValue(throwError(() => 'boom'))
      const c = build({ calendar: false, pendingCourses: true })
      c.ngOnInit()
      expect(c.historyFetchStatus).toBe('done')
    })
  })

  describe('specialDatesSet', () => {
    it('keeps only non-zero date keys', () => {
      const c = build()
      c.timeSpentData = timeSpentResponse() as any
      c.specialDatesSet()
      expect(c.specialDates).toEqual([1577856600000, 2000])
    })

    it('is a no-op without time-spent data', () => {
      const c = build()
      c.timeSpentData = null
      c.specialDatesSet()
      expect(c.specialDates).toEqual([])
    })
  })

  describe('calendarEvent', () => {
    it('sets the time spent for the matching (IST-offset) date', () => {
      const c = build()
      c.timeSpentData = timeSpentResponse() as any
      c.calendarEvent('2020-01-01')
      expect(c.timeEvent instanceof Date).toBe(true)
      expect(c.timeSpent).toBe(42)
    })

    it('tolerates missing time-spent data', () => {
      const c = build()
      c.timeSpentData = null
      expect(() => c.calendarEvent('2020-01-01')).not.toThrow()
    })
  })
})
