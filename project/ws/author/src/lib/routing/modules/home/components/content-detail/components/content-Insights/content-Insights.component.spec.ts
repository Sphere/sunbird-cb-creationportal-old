import { of, Subject, throwError } from 'rxjs'

import { ContentInsightsComponent } from './content-Insights.component'

function buildAnalyticsData(): any {
  const participantObj = (key: string, count: number) => ({
    key,
    count,
    value: [
      { key: 'Offshore', value: count },
      { key: 'Onsite', value: count + 1 },
    ],
  })
  return {
    uniqueParticipants: [
      { key: 'Wingspan', uniqueCount: 42, otherCounts: [] },
      { key: 'Other', uniqueCount: 5, otherCounts: [] },
    ],
    participants: {
      onsiteOffshoreIndicator: [
        { key: 'Onsite', count: 10, trainingHours: 0, value: [] },
        { key: 'NA', count: 3, trainingHours: 0, value: [] },
      ],
      ibu: [participantObj('IBU-A', 3), participantObj('IBU-B', 1)],
      pu: [participantObj('PU-A', 2)],
      jl: [participantObj('JL-A', 2)],
      location: [participantObj('LOC-A', 2)],
      account: [participantObj('ACC-A', 2)],
    },
  }
}

function buildClientData(): any {
  return {
    userCount: 100,
    hits: 200,
    avg_time_spent: 120,
    department: [
      { key: 'Dept-A', doc_count: 5, total_hits: 9 },
      { key: 'Dept-B', doc_count: 3, total_hits: 4 },
    ],
    country: [
      { key: 'India', doc_count: 7, total_hits: 12 },
      { key: 'US', doc_count: 2, total_hits: 3 },
    ],
    day_wise_users: [
      { key_as_string: '2021-01-05T00:00:00.000Z', key: 1, doc_count: 4, hits_count: 8 },
      { key_as_string: '2021-02-10T00:00:00.000Z', key: 2, doc_count: 6, hits_count: 10 },
    ],
    device: [
      { key: 'mobile', doc_count: 8, total_hits: 20 },
      { key: 'desktop', doc_count: 6, total_hits: 5 },
    ],
  }
}

describe('ContentInsightsComponent', () => {
  let component: ContentInsightsComponent
  let route: any
  let configSvc: any
  let tocSharedSvc: any
  let prefSubject: Subject<any>
  let dataSubject: Subject<any>

  beforeEach(() => {
    prefSubject = new Subject<any>()
    dataSubject = new Subject<any>()
    route = {
      snapshot: { data: { pageData: { data: { analytics: {} } } } },
      parent: { data: dataSubject.asObservable() },
      data: dataSubject.asObservable(),
    }
    configSvc = {
      prefChangeNotifier: prefSubject.asObservable(),
      activeThemeObject: { color: { primary: '#111', accent: '#222' } },
    }
    tocSharedSvc = {
      analyticsFetchStatus: 'none',
      analyticsReplaySubject: new Subject<any>(),
      initData: jest.fn().mockReturnValue({ content: { identifier: 'do_1' } }),
      fetchContentAnalyticsData: jest.fn(),
      fetchContentAnalyticsClientData: jest.fn(),
    }
    component = new ContentInsightsComponent(route, configSvc, tocSharedSvc)
  })

  it('is created with default state', () => {
    expect(component).toBeTruthy()
    expect(component.uniqueUsers).toBe(0)
    expect(component.fetchStatus).toBe('none')
    expect(component.chartColors.length).toBeGreaterThan(0)
  })

  it('ngOnInit subscribes to preference changes and parent route data', async () => {
    const spy = jest.spyOn(component, 'populateChartData')
    await component.ngOnInit()
    expect(component.prefChangeSubscription).toBeTruthy()
    expect(component.routeParentSubscription).toBeTruthy()
    prefSubject.next(null)
    expect(spy).toHaveBeenCalled()
  })

  it('ngOnDestroy resets fetch status and unsubscribes', async () => {
    await component.ngOnInit()
    component.ngOnDestroy()
    expect(tocSharedSvc.analyticsFetchStatus).toBe('none')
  })

  it('initData handles the courseAnalytics branch', () => {
    component.apiLinkAccess = { courseAnalytics: true }
    ;(component as any).initData({ some: 'data' })
    expect(tocSharedSvc.fetchContentAnalyticsData).toHaveBeenCalledWith('do_1')
    tocSharedSvc.analyticsReplaySubject.next(buildAnalyticsData())
    expect(component.fetchStatus).toBe('done')
    expect(component.analyticsData).toBeTruthy()
  })

  it('initData handles the courseAnalyticsClient branch', () => {
    component.apiLinkAccess = { courseAnalyticsClient: true }
    ;(component as any).initData({ some: 'data' })
    expect(tocSharedSvc.fetchContentAnalyticsClientData).toHaveBeenCalledWith('do_1')
    tocSharedSvc.analyticsReplaySubject.next(buildClientData())
    expect(component.fetchStatus).toBe('done')
    expect(component.analyticsDataClient).toBeTruthy()
  })

  it('initData error callback sets error status', () => {
    component.apiLinkAccess = { courseAnalytics: true }
    tocSharedSvc.analyticsReplaySubject = throwError(() => new Error('fail'))
    ;(component as any).initData({})
    expect(component.fetchStatus).toBe('error')
    expect(component.analyticsData).toBeNull()
  })

  it('initData with no content resets state', () => {
    tocSharedSvc.initData.mockReturnValue({ content: null })
    ;(component as any).initData({})
    expect(component.fetchStatus).toBe('none')
    expect(component.analyticsData).toBeNull()
  })

  it('populateChartData builds unique users and all bar/pie charts', () => {
    component.analyticsData = buildAnalyticsData()
    component.populateChartData()
    expect(component.uniqueUsers).toBe(42)
    expect(component.onsiteOffshoreData.widgetData).toBeTruthy()
    expect(component.barChartUnitData.widgetData.graphData.labels).toContain('IBU-A')
    expect(component.barChartPuData.widgetData).toBeTruthy()
    expect(component.barChartJLData.widgetData).toBeTruthy()
    expect(component.barChartLocationData.widgetData).toBeTruthy()
    expect(component.barChartAccountData.widgetData).toBeTruthy()
  })

  it('populateChartData is a no-op when no analyticsData', () => {
    component.analyticsData = null
    component.populateChartData()
    expect(component.uniqueUsers).toBe(0)
  })

  it('chartData builds client charts and derived metrics', () => {
    component.analyticsDataClient = buildClientData()
    component.chartData()
    expect(component.uniqueUsers).toBe(100)
    expect(component.hits).toBe(200)
    expect(component.avgTimeSpent).toBe(2)
    expect(component.barChartDeptData.widgetData).toBeTruthy()
    expect(component.barChartCountryData.widgetData).toBeTruthy()
    expect(component.barChartDailyUsersData.widgetData.graphData.labels.length).toBe(2)
    expect(component.barChartDailyHitsData.widgetData).toBeTruthy()
    expect(component.pieChartDeviceData.widgetData).toBeTruthy()
    expect(component.pieChartDeviceHitsData.widgetData).toBeTruthy()
    expect(component.barChartDeptHitsData.widgetData).toBeTruthy()
    expect(component.barChartCountryHitsData.widgetData).toBeTruthy()
  })

  it('chartData is a no-op when no client data', () => {
    component.analyticsDataClient = null
    component.chartData()
    expect(component.hits).toBe(0)
  })

  it('onClose resets expand flag and repopulates', () => {
    component.analyticsData = buildAnalyticsData()
    component.isExpandTrue = true
    component.onClose()
    expect(component.isExpandTrue).toBe(false)
  })

  it('onCloseClient resets expand flag and rebuilds client charts', () => {
    component.analyticsDataClient = buildClientData()
    component.isExpandTrue = true
    component.onCloseClient()
    expect(component.isExpandTrue).toBe(false)
  })

  it('onClick scrolls to the matching element', () => {
    const el: any = { scrollIntoView: jest.fn() }
    jest.spyOn(document, 'getElementById').mockImplementation((id: string) =>
      id === 'departments' ? el : null,
    )
    component.onClick('departments')
    expect(el.scrollIntoView).toHaveBeenCalled()
  })

  it('onExpand builds expand chart from participant field', () => {
    component.analyticsData = buildAnalyticsData()
    component.onExpand('ibu')
    expect(component.isExpandTrue).toBe(true)
    expect(component.barChartOnExpandData.widgetData.graphData.labels).toContain('IBU-A')
  })

  it('onExpandClient builds expand chart for users and hits', () => {
    component.analyticsDataClient = buildClientData()
    component.onExpandClient('department', 'users')
    expect(component.isExpandTrue).toBe(true)
    expect(component.barChartExpandClientData.widgetData.graphData.datasets[0].data.length).toBe(2)
    component.onExpandClient('department', 'hits')
    expect(component.barChartExpandClientData.widgetData).toBeTruthy()
  })
})
