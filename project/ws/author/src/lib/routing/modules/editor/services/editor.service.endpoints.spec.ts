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

  describe('CBP contact metadata is sent as JSON strings', () => {
    // Sunbird Spark reads these fields back as arrays. Two things break if one is
    // sent back unchanged: content/v3/update rejects an array for `reviewer`
    // ("Metadata reviewer should be a/an String value"), and the compositesearch
    // index maps them as `text`, so an object fails indexing with a
    // mapper_parsing_exception that kills the whole indexer job.
    const sentContent = () => (apiService.patch as jest.Mock).mock.calls[0][1].request.content

    it.each(['reviewer', 'creatorContacts', 'creatorDetails', 'publisherDetails', 'competencies_v1'])(
      'stringifies %s when it arrives as an array',
      field => {
        svc.updateContentV3({ request: { content: { [field]: [{ id: 'x1' }] } } } as any, 'do_1').subscribe()
        expect(sentContent()[field]).toBe('[{"id":"x1"}]')
      },
    )

    it('stringifies every contact field in one payload', () => {
      svc
        .updateContentV3(
          {
            request: {
              content: {
                reviewer: [{ id: 'r1' }],
                creatorDetails: [{ id: 'c1', name: 'creator' }],
                publisherDetails: [{ id: 'p1' }],
              },
            },
          } as any,
          'do_1',
        )
        .subscribe()
      const content = sentContent()
      expect(content.reviewer).toBe('[{"id":"r1"}]')
      expect(content.creatorDetails).toBe('[{"id":"c1","name":"creator"}]')
      expect(content.publisherDetails).toBe('[{"id":"p1"}]')
    })

    it('stringifies a reviewer array on updateContentWithFewFields', () => {
      svc.updateContentWithFewFields({ request: { content: { reviewer: [{ id: 'r1' }] } } }, 'do_1').subscribe()
      expect(sentContent().reviewer).toBe('[{"id":"r1"}]')
    })

    it('leaves a field that is already a string untouched', () => {
      svc.updateContentV3({ request: { content: { reviewer: '[{"id":"r1"}]' } } } as any, 'do_1').subscribe()
      expect(sentContent().reviewer).toBe('[{"id":"r1"}]')
    })

    it('does not invent fields the payload does not carry', () => {
      svc.updateContentV3({ request: { content: { name: 'A course' } } } as any, 'do_1').subscribe()
      const content = sentContent()
      expect(content).not.toHaveProperty('reviewer')
      expect(content).not.toHaveProperty('creatorDetails')
      expect(content).not.toHaveProperty('publisherDetails')
    })

    it('leaves unrelated list fields such as reviewerIDs as arrays', () => {
      svc.updateContentV3({ request: { content: { reviewerIDs: ['r1', 'r2'] } } } as any, 'do_1').subscribe()
      expect(sentContent().reviewerIDs).toEqual(['r1', 'r2'])
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
