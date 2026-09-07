import { UserAutocompleteService } from './user-autocomplete.service'
import { of } from 'rxjs'

describe('UserAutocompleteService', () => {
  let http: { get: jest.Mock }
  let configSvc: any
  let svc: UserAutocompleteService

  beforeEach(() => {
    http = { get: jest.fn(() => of([])) }
    configSvc = { userProfile: {}, instanceConfig: {} }
    svc = new UserAutocompleteService(http as any, configSvc)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('fetchAutoComplete hits the autocomplete endpoint with the query', done => {
    svc.fetchAutoComplete('joh').subscribe(() => {
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/user/v1/autocomplete/joh'))
      done()
    })
  })

  it('fetchAutoComplete appends dealerCode query param when present', done => {
    configSvc.userProfile = { dealerCode: 'D1' }
    svc.fetchAutoComplete('x').subscribe(() => {
      expect(http.get.mock.calls[0][0]).toContain('dealerCode=D1')
      done()
    })
  })

  it('fetchAutoCompleteV2 returns [] for a success response whose rows match no roleType', done => {
    http.get.mockReturnValue(
      of({
        params: { status: 'success' },
        result: { response: { count: 1, content: [{ wid: 'w1', firstName: 'A' }] } },
      }),
    )
    // no roleType passed + element has no roles -> nothing is pushed
    svc.fetchAutoCompleteV2('a').subscribe((rows: any) => {
      expect(rows).toEqual([])
      done()
    })
  })

  it('fetchAutoCompleteV2 returns empty array for a non-success response', done => {
    http.get.mockReturnValue(of({ params: { status: 'failed' }, result: {} }))
    svc.fetchAutoCompleteV2('a').subscribe((rows: any) => {
      expect(rows).toEqual([])
      done()
    })
  })
})
