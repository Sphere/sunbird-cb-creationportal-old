import { of } from 'rxjs'

import { EditorService } from './editor.service'

/**
 * Wave 18 — the access-path branch of `create`, the reviewer/publisher endpoints
 * and the `category` normalisation applied before a partial content update.
 */
describe('EditorService (endpoints and payload shaping)', () => {
  let apiService: any
  let accessService: any
  let userAutoComplete: any
  let configSvc: any
  let http: any
  let svc: EditorService

  beforeEach(() => {
    apiService = {
      get: jest.fn(() => of({})),
      post: jest.fn(() => of({})),
      patch: jest.fn(() => of({})),
    }
    accessService = {
      userId: 'user-1',
      userName: 'User One',
      rootOrg: 'root org',
      org: 'my org',
      appName: 'app',
      orgRootOrgAsQuery: '?org=my%20org',
      hasRole: jest.fn(() => false),
      getAction: jest.fn(() => 'ACTION'),
    }
    userAutoComplete = { fetchAutoCompleteV2: jest.fn(() => of([])) }
    configSvc = {
      userProfile: { rootOrgId: 'ro-1', departmentName: 'dept' },
      unMappedUser: { json_unmapped_fields: { dealer_group_code: 'DGC' } },
    }
    http = { get: jest.fn(() => of({})), post: jest.fn(() => of({ identifier: 'do_new' })), patch: jest.fn(() => of({})) }
    svc = new EditorService(apiService, accessService, userAutoComplete, configSvc, http)
  })

  afterEach(() => {
    svc.clearCbpDataCache()
    jest.clearAllMocks()
  })

  const created = () => http.post.mock.calls[0][1]

  describe('create', () => {
    it('leaves the access path unset for a normal organisation', () => {
      svc.create({ contentType: 'Course', name: 'A course' } as any).subscribe()
      expect(created().content.accessPaths).toBeUndefined()
      expect(created().content.createdBy).toBe('user-1')
    })

    it('scopes a knowledge artifact to the dealer group', () => {
      accessService.rootOrg = 'client2'
      svc.create({ contentType: 'Knowledge Artifact', name: 'A doc' } as any).subscribe()
      expect(created().content.accessPaths).toBe('client2/Australia/dealer_code-DGC')
    })

    it('falls back to the organisation when the dealer group is unknown', () => {
      accessService.rootOrg = 'client2'
      configSvc.unMappedUser = null
      svc.create({ contentType: 'Knowledge Artifact', name: 'A doc' } as any).subscribe()
      expect(created().content.accessPaths).toBe('client2')
    })

    it('scopes any other content type to the organisation', () => {
      accessService.rootOrg = 'client2'
      svc.create({ contentType: 'Course', name: 'A course' } as any).subscribe()
      expect(created().content.accessPaths).toBe('client2')
    })
  })

  describe('reviewer endpoints', () => {
    it('rejects a content by identifier', () => {
      svc.rejectContentApi({ request: {} }, 'do_1').subscribe()
      expect(apiService.post).toHaveBeenCalledWith(expect.stringContaining('do_1'), { request: {} })
    })

    it('updates the review status of a content', () => {
      svc.updateContentForReviwer({ request: {} }, 'do_1').subscribe()
      expect(apiService.patch).toHaveBeenCalledWith('/apis/proxies/v8/action/content/v3/updateReviewStatus/do_1', { request: {} })
    })

    it('updates the hierarchy on the reviewer endpoint', () => {
      svc.updateHierarchyForReviwer({ request: { data: {} } } as any).subscribe()
      expect(apiService.patch).toHaveBeenCalledWith('/apis/proxies/v8/action/content/v3/hierarchyUpdate', {
        request: { data: {} },
      })
    })

    it('reads several contents in one call', () => {
      svc.readMultipleContent(['do_1', 'do_2']).subscribe()
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('do_1,do_2'))
    })
  })

  describe('updateContentWithFewFields', () => {
    const sent = () => apiService.patch.mock.calls[0][1]

    it('wraps a single category in an array', () => {
      svc.updateContentWithFewFields({ request: { content: { category: 'Course' } } }, 'do_1').subscribe()
      expect(sent().request.content.category).toEqual(['Course'])
    })

    it('leaves an existing array alone', () => {
      svc.updateContentWithFewFields({ request: { content: { category: ['Course'] } } }, 'do_1').subscribe()
      expect(sent().request.content.category).toEqual(['Course'])
    })

    it('turns an empty category into an empty array', () => {
      svc.updateContentWithFewFields({ request: { content: { category: '' } } }, 'do_1').subscribe()
      expect(sent().request.content.category).toEqual([])
    })

    it('turns a null category into an empty array', () => {
      svc.updateContentWithFewFields({ request: { content: { category: null } } }, 'do_1').subscribe()
      expect(sent().request.content.category).toEqual([])
    })

    it('passes a payload with no category straight through', () => {
      svc.updateContentWithFewFields({ request: { content: { name: 'x' } } }, 'do_1').subscribe()
      expect(sent()).toEqual({ request: { content: { name: 'x' } } })
    })

    it('passes a payload with no content straight through', () => {
      svc.updateContentWithFewFields({ request: {} }, 'do_1').subscribe()
      expect(sent()).toEqual({ request: {} })
    })

    it('targets the identifier it was given', () => {
      svc.updateContentWithFewFields({ request: { content: {} } }, 'do_9').subscribe()
      expect(apiService.patch).toHaveBeenCalledWith('/apis/proxies/v8/action/content/v3/update/do_9', expect.anything())
    })
  })

  describe('cbp configuration cache', () => {
    it('fetches the configuration once and serves the rest from cache', () => {
      apiService.get.mockReturnValue(of({ roles: ['a'], sourceName: ['NHM'] }))
      svc.rolesMapped().subscribe()
      svc.sourceNames().subscribe()
      expect(apiService.get).toHaveBeenCalledTimes(1)
    })

    it('hands each caller its own copy', () => {
      apiService.get.mockReturnValue(of({ roles: ['a'] }))
      let first: any
      let second: any
      svc.rolesMapped().subscribe(v => (first = v))
      svc.rolesMapped().subscribe(v => (second = v))
      expect(first).toEqual(['a'])
      expect(first).not.toBe(second)
    })

    it('re-fetches once the cache is cleared', () => {
      apiService.get.mockReturnValue(of({ roles: ['a'] }))
      svc.rolesMapped().subscribe()
      svc.clearCbpDataCache()
      svc.rolesMapped().subscribe()
      expect(apiService.get).toHaveBeenCalledTimes(2)
    })
  })
})
