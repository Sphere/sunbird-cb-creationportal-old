import { of, throwError } from 'rxjs'

import { PlansComponent } from './plans.component'

describe('PlansComponent', () => {
  let analyticsSrv: any

  const build = () => new PlansComponent(analyticsSrv)

  beforeEach(() => {
    analyticsSrv = { userProgress: jest.fn().mockReturnValue(of({ result: [] })) }
  })

  it('starts with the default reporting window and filters', () => {
    const comp = build()
    expect(comp.startDate).toBe('2018-04-01')
    expect(comp.endDate).toBe('2020-03-31')
    expect(comp.contentType).toBe('Course')
    expect(comp.filterType).toBe('')
    expect(comp.isCompleted).toBe(0)
    expect(comp.userFetchStatus).toBe('fetching')
    expect(comp.userProgressData).toBeNull()
  })

  describe('ngOnInit', () => {
    it('requests progress for the current filter and content type', () => {
      const comp = build()
      comp.filterType = 'mandatory'
      comp.contentType = 'Resource'
      comp.ngOnInit()
      expect(analyticsSrv.userProgress).toHaveBeenCalledWith('mandatory', 'Resource')
    })

    it('stores the response and marks the fetch done', () => {
      const response = { result: [{ id: 1 }] }
      analyticsSrv.userProgress.mockReturnValue(of(response))
      const comp = build()
      comp.ngOnInit()
      expect(comp.userProgressData).toBe(response)
      expect(comp.userFetchStatus).toBe('done')
    })

    it('marks the fetch as errored when the request fails', () => {
      analyticsSrv.userProgress.mockReturnValue(throwError(() => new Error('api down')))
      const comp = build()
      comp.ngOnInit()
      expect(comp.userFetchStatus).toBe('error')
      expect(comp.userProgressData).toBeNull()
    })
  })
})
