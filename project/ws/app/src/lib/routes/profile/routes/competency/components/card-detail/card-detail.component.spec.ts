import { of, throwError } from 'rxjs'

jest.mock('chart.js', () => ({
  __esModule: true,
  Chart: jest.fn().mockImplementation(() => ({})),
}))

// tslint:disable-next-line: no-import-side-effect
import { CardDetailComponent } from './card-detail.component'

describe('CardDetailComponent', () => {
  let route: any
  let assessSvc: any

  const scoreDistribution = {
    '0.0-25.0': [1, 2],
    '25.0-50.0': [3, 4],
    '50.0-75.0': [5, 6],
    '75.0-100.0': [7, 8],
  }

  const build = () => new CardDetailComponent(route, assessSvc)

  beforeEach(() => {
    route = {
      snapshot: { queryParamMap: { get: jest.fn(() => null) } },
    }
    assessSvc = { getDetails: jest.fn(() => of({ assessments: [] })) }
  })

  it('should create with default fetch status', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.apiFetchStatus).toBe('fetching')
    expect(c.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  describe('ngOnInit', () => {
    it('does nothing extra when type is not assessment', () => {
      const c = build()
      c.ngOnInit()
      expect(assessSvc.getDetails).not.toHaveBeenCalled()
      expect(c.apiFetchStatus).toBe('fetching')
    })

    it('fetches details and builds graph for the matching assessment', () => {
      route.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'type' ? 'assessment' : 'a1'))
      const assessments = [
        { id: 'a1', scoreDistribution },
        { id: 'a2', scoreDistribution },
      ]
      assessSvc.getDetails = jest.fn(() => of({ assessments }))
      const c = build()
      c.ngOnInit()
      expect(assessSvc.getDetails).toHaveBeenCalledWith('2018-04-01', c.endDate)
      expect(c.apiFetchStatus).toBe('done')
      expect(c.assessmentData.length).toBe(1)
      expect(c.assessmentData[0].id).toBe('a1')
      expect(c.orgWideGraph.widgetData.graphId).toBe('expandChart')
    })

    it('handles missing assessments array gracefully', () => {
      route.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'type' ? 'assessment' : 'a1'))
      assessSvc.getDetails = jest.fn(() => of({ assessments: null }))
      const c = build()
      c.ngOnInit()
      expect(c.apiFetchStatus).toBe('done')
    })

    it('sets error status on API failure', () => {
      route.snapshot.queryParamMap.get = jest.fn((k: string) => (k === 'type' ? 'assessment' : 'a1'))
      assessSvc.getDetails = jest.fn(() => throwError(() => new Error('boom')))
      const c = build()
      c.ngOnInit()
      expect(c.apiFetchStatus).toBe('error')
    })
  })

  describe('getGraphData', () => {
    it('populates orgWideGraph and instantiates a chart', () => {
      const c = build()
      c.getGraphData({ scoreDistribution })
      expect(c.orgWideGraph.widgetData.graphType).toBe('line')
      expect(c.orgWideGraph.widgetData.graphData.datasets.length).toBe(4)
      expect(c.orgWideGraph.widgetData.graphData.datasets[0].data).toEqual(scoreDistribution['0.0-25.0'])
      expect(c.lineChart).toBeTruthy()
    })
  })
})
