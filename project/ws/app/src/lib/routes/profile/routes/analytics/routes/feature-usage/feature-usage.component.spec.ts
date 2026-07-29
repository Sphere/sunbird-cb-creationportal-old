import { of, throwError } from 'rxjs'
import { FeatureUsageComponent } from './feature-usage.component'

describe('FeatureUsageComponent', () => {
  let analyticsSrv: any
  let component: FeatureUsageComponent

  const nsoResponse = { some: 'nso' }
  const assessmentResponse = {
    assessment: [{ assessment_score: 80 }, { assessment_score: 40 }, { assessment_score: 95 }],
  }
  const fetchAssessmentsResponse = {
    assessments: [{ assessment_score: 70 }, { assessment_score: 30 }],
  }
  const userProgressResponse = {
    learning_history: [{ id: 1 }, { id: 2 }, { id: 3 }],
  }
  const timeSpentResponse = {
    timespent_user_vs_org_wide: { time_spent_by_user: 130 },
  }

  const wireHappyPath = () => {
    analyticsSrv = {
      nsoArtifacts: jest.fn().mockReturnValue(of(nsoResponse)),
      assessments: jest.fn().mockReturnValue(of(assessmentResponse)),
      fetchAssessments: jest.fn().mockReturnValue(of(fetchAssessmentsResponse)),
      userProgress: jest.fn().mockReturnValue(of(userProgressResponse)),
      timeSpent: jest.fn().mockReturnValue(of(timeSpentResponse)),
    }
    component = new FeatureUsageComponent(analyticsSrv)
  }

  beforeEach(() => {
    wireHappyPath()
  })

  it('should create with sensible defaults', () => {
    expect(component).toBeTruthy()
    expect(component.startDate).toBe('2018-04-01')
    expect(component.endDate).toBe('2020-03-31')
    expect(component.contentType).toBe('Course')
    expect(component.isCompleted).toBe(0)
    expect(component.timeSpentFetchStatus).toBe('fetching')
  })

  describe('ngOnInit — happy path', () => {
    beforeEach(() => component.ngOnInit())

    it('calls every analytics endpoint with the configured params', () => {
      expect(analyticsSrv.nsoArtifacts).toHaveBeenCalledWith('2018-04-01', '2020-03-31', 'Course', 0)
      expect(analyticsSrv.assessments).toHaveBeenCalledWith('2018-04-01', '2020-03-31', 'Course', 0)
      expect(analyticsSrv.fetchAssessments).toHaveBeenCalledWith('2018-04-01', '2020-03-31')
      expect(analyticsSrv.userProgress).toHaveBeenCalledWith('', 'Course')
      expect(analyticsSrv.timeSpent).toHaveBeenCalledWith('2018-04-01', '2020-03-31', 'Course', 0)
    })

    it('stores the nso response and marks it done', () => {
      expect(component.nsoData).toBe(nsoResponse as any)
      expect(component.nsoFetchStatus).toBe('done')
    })

    it('counts assessments with a passing score from both sources', () => {
      // assessments: 80 & 95 pass (2); fetchAssessments: 70 passes (1) => 3
      expect(component.assessmentComplete).toBe(3)
      expect(component.assessmentData).toBe(assessmentResponse as any)
      expect(component.assessments).toBe(fetchAssessmentsResponse as any)
      expect(component.assessmentFetchStatus).toBe('done')
    })

    it('derives pending assessments from progress length and completed count', () => {
      // |3 (learning_history) - 3 (assessmentComplete)| = 0
      expect(component.pendingAssessments).toBe(0)
      expect(component.userProgressData).toBe(userProgressResponse as any)
      expect(component.userProgressFetchStatus).toBe('done')
    })

    it('converts time spent to whole minutes', () => {
      expect(component.timeSpent).toBe(Math.ceil(130 / 60))
      expect(component.timeSpentData).toBe(timeSpentResponse as any)
      expect(component.timeSpentFetchStatus).toBe('done')
    })
  })

  describe('ngOnInit — fetchAssessments without an assessments array', () => {
    it('does not throw and leaves that source uncounted', () => {
      analyticsSrv.fetchAssessments.mockReturnValue(of({}))
      const c = new FeatureUsageComponent(analyticsSrv)

      expect(() => c.ngOnInit()).not.toThrow()
      // only the assessments() source contributes (80 & 95 => 2)
      expect(c.assessmentComplete).toBe(2)
    })
  })

  describe('ngOnInit — error branches', () => {
    it('flags each fetch status as error when its call fails', () => {
      analyticsSrv.nsoArtifacts.mockReturnValue(throwError(() => new Error('x')))
      analyticsSrv.assessments.mockReturnValue(throwError(() => new Error('x')))
      analyticsSrv.fetchAssessments.mockReturnValue(throwError(() => new Error('x')))
      analyticsSrv.userProgress.mockReturnValue(throwError(() => new Error('x')))
      analyticsSrv.timeSpent.mockReturnValue(throwError(() => new Error('x')))
      const c = new FeatureUsageComponent(analyticsSrv)

      c.ngOnInit()

      expect(c.nsoFetchStatus).toBe('error')
      expect(c.assessmentFetchStatus).toBe('error')
      expect(c.userProgressFetchStatus).toBe('error')
      expect(c.timeSpentFetchStatus).toBe('error')
    })
  })
})
