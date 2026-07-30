import { of, throwError } from 'rxjs'

import { LearningComponent } from './learning.component'

describe('LearningComponent', () => {
  let component: LearningComponent
  let analyticsSrv: { nsoArtifacts: jest.Mock; userProgress: jest.Mock }

  const nsoResponse: any = { result: { nso: [] } }
  const userProgressResponse: any = { result: { progress: [] } }

  beforeEach(() => {
    analyticsSrv = {
      nsoArtifacts: jest.fn().mockReturnValue(of(nsoResponse)),
      userProgress: jest.fn().mockReturnValue(of(userProgressResponse)),
    }
    component = new LearningComponent(analyticsSrv as any)
  })

  it('should create with default field values', () => {
    expect(component).toBeTruthy()
    expect(component.contentType).toBe('Course')
    expect(component.isCompleted).toBe(0)
    expect(component.nsoFetchStatus).toBe('fetching')
    expect(component.userFetchStatus).toBe('fetching')
  })

  describe('ngOnInit success', () => {
    beforeEach(() => {
      component.ngOnInit()
    })

    it('should call the analytics service with the configured args', () => {
      expect(analyticsSrv.nsoArtifacts).toHaveBeenCalledWith('2018-04-01', '2020-03-31', 'Course', 0)
      expect(analyticsSrv.userProgress).toHaveBeenCalledWith('', 'Course')
    })

    it('should store nso data and mark nso status done', () => {
      expect(component.nsoData).toBe(nsoResponse)
      expect(component.nsoFetchStatus).toBe('done')
    })

    it('should store user progress data and mark user status done', () => {
      expect(component.userProgressData).toBe(userProgressResponse)
      expect(component.userFetchStatus).toBe('done')
    })
  })

  describe('ngOnInit error handling', () => {
    it('should set nso status to error when nsoArtifacts fails', () => {
      analyticsSrv.nsoArtifacts.mockReturnValue(throwError(() => new Error('boom')))

      component.ngOnInit()

      expect(component.nsoFetchStatus).toBe('error')
      expect(component.nsoData).toBeNull()
    })

    it('should set user status to error when userProgress fails', () => {
      analyticsSrv.userProgress.mockReturnValue(throwError(() => new Error('boom')))

      component.ngOnInit()

      expect(component.userFetchStatus).toBe('error')
      expect(component.userProgressData).toBeNull()
    })
  })
})
