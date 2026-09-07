import { of } from 'rxjs'

import { UserAutocompleteService } from './user-autocomplete.service'

/**
 * Wave 18 — the role-filtered autocomplete (`fetchAutoCompleteV2`), the response
 * mapper (`getAutoCompleteData`) and the department-scoped lookup.
 */
describe('UserAutocompleteService (role-filtered lookup)', () => {
  let http: any
  let configSvc: any
  let service: UserAutocompleteService

  /** A user record as the identity service returns it. */
  const user = (over: any = {}) => ({
    id: 'u9',
    firstName: 'Ada',
    lastName: 'Lovelace',
    rootOrgName: 'NHM',
    roles: [{ role: 'CONTENT_REVIEWER' }],
    profileDetails: { personalDetails: { primaryEmail: 'ada@x.com' } },
    ...over,
  })

  const response = (content: any[], status = 'success') => ({
    params: { status },
    result: { response: { count: content.length, content } },
  })

  beforeEach(() => {
    http = { get: jest.fn().mockReturnValue(of(response([]))), post: jest.fn().mockReturnValue(of([])) }
    configSvc = { userProfile: { departmentName: 'NHM' }, instanceConfig: {} }
    service = new UserAutocompleteService(http, configSvc)
  })

  /** Runs the lookup and returns the mapped rows. */
  const lookup = (content: any[], roleType?: string, status = 'success') => {
    http.get.mockReturnValue(of(response(content, status)))
    let rows: any
    service.fetchAutoCompleteV2('ada', roleType).subscribe(r => (rows = r))
    return rows
  }

  describe('fetchAutoCompleteV2', () => {
    it('returns a matching reviewer', () => {
      expect(lookup([user()], 'CONTENT_REVIEWER')).toEqual([
        {
          department_name: 'NHM',
          email: 'ada@x.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          root_org: '',
          wid: 'u9',
        },
      ])
    })

    it('returns a matching publisher', () => {
      const rows = lookup([user({ roles: [{ role: 'CONTENT_PUBLISHER' }] })], 'CONTENT_PUBLISHER')
      expect(rows).toHaveLength(1)
    })

    it('returns any user for the any-role lookup', () => {
      const rows = lookup([user({ roles: [] })], 'ANY_ROLE')
      expect(rows).toHaveLength(1)
    })

    it('keeps a same-department user for any other role', () => {
      const rows = lookup([user({ roles: [{ role: 'CONTENT_CREATOR' }] })], 'CONTENT_CREATOR')
      expect(rows).toHaveLength(1)
    })

    it('drops a user from another department', () => {
      const rows = lookup([user({ roles: [{ role: 'CONTENT_CREATOR' }], rootOrgName: 'Other' })], 'CONTENT_CREATOR')
      expect(rows).toEqual([])
    })

    it('drops everyone when there is no profile to compare against', () => {
      configSvc.userProfile = null
      const rows = lookup([user({ roles: [{ role: 'CONTENT_CREATOR' }] })], 'CONTENT_CREATOR')
      expect(rows).toEqual([])
    })

    it('drops a user whose role does not match', () => {
      const rows = lookup([user({ roles: [{ role: 'CONTENT_PUBLISHER' }] })], 'CONTENT_REVIEWER')
      expect(rows).toEqual([])
    })

    it('drops a user with no roles at all', () => {
      const rows = lookup([user({ roles: [] })], 'CONTENT_REVIEWER')
      expect(rows).toEqual([])
    })

    it('accepts the upper-case success status too', () => {
      const rows = lookup([user()], 'CONTENT_REVIEWER', 'SUCCESS')
      expect(rows).toHaveLength(1)
    })

    it('returns nothing for a failed lookup', () => {
      const rows = lookup([user()], 'CONTENT_REVIEWER', 'failed')
      expect(rows).toEqual([])
    })

    it('returns nothing for an empty result set', () => {
      const rows = lookup([], 'CONTENT_REVIEWER')
      expect(rows).toEqual([])
    })

    it('returns nothing for a malformed response', () => {
      http.get.mockReturnValue(of(null))
      let rows: any
      service.fetchAutoCompleteV2('ada', 'CONTENT_REVIEWER').subscribe(r => (rows = r))
      expect(rows).toEqual([])
    })

    it('adds the dealer code and source fields to the query', () => {
      configSvc.userProfile = { dealerCode: 'D1', departmentName: 'NHM' }
      configSvc.instanceConfig = { sourceFieldsUserAutocomplete: 'firstName' }
      service.fetchAutoCompleteV2('ada').subscribe()
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('dealerCode=D1'))
      expect(http.get).toHaveBeenCalledWith(expect.stringContaining('sourceFields=firstName'))
    })

    it('leaves the query bare with nothing to add', () => {
      service.fetchAutoCompleteV2('ada').subscribe()
      expect(http.get).toHaveBeenCalledWith('/apis/proxies/v8/user/v1/autocomplete/ada')
    })
  })

  describe('getAutoCompleteData', () => {
    it('maps a full user record', () => {
      expect(service.getAutoCompleteData(user())).toEqual({
        department_name: 'NHM',
        email: 'ada@x.com',
        first_name: 'Ada',
        last_name: 'Lovelace',
        root_org: '',
        wid: 'u9',
      })
    })

    it('falls back to blanks for a sparse record', () => {
      expect(service.getAutoCompleteData({})).toEqual({
        department_name: '',
        email: '',
        first_name: '',
        last_name: '',
        root_org: '',
        wid: '',
      })
    })

    it('falls back to a blank email with no personal details', () => {
      expect(service.getAutoCompleteData({ profileDetails: {} }).email).toBe('')
    })
  })

  describe('fetchAutoCompleteByDept', () => {
    it('posts the departments to the department endpoint', () => {
      service.fetchAutoCompleteByDept('ada', ['NHM']).subscribe()
      expect(http.post).toHaveBeenCalledWith('/apis/protected/v8/user/autocomplete/department/ada', {
        departments: ['NHM'],
      })
    })

    it('adds the dealer code to the department query', () => {
      configSvc.userProfile = { dealerCode: 'D1' }
      service.fetchAutoCompleteByDept('ada', []).subscribe()
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('dealerCode=D1'), expect.anything())
    })
  })
})
