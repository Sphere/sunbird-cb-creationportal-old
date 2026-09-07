import { of } from 'rxjs'

import { MyContentService } from './content-detail.service'
import {
  CONTENT_CREATE,
  CONTENT_DELETE,
  CONTENT_READ,
  CONTENT_RESTORE,
  EXPIRY_DATE_ACTION,
  SEARCH,
  SEARCH_V6_ADMIN,
  SEARCH_V6_AUTH,
  STATUS_CHANGE,
  UNPUBLISH,
} from '@ws/author/src/lib/constants/apiEndpoints'

describe('MyContentService (content-detail)', () => {
  let service: MyContentService
  let apiService: { post: jest.Mock; get: jest.Mock; delete: jest.Mock }
  let accessService: any
  let authInitService: any
  let configSvc: any

  beforeEach(() => {
    apiService = {
      post: jest.fn().mockReturnValue(of({ identifier: 'new-id' })),
      get: jest.fn().mockReturnValue(of({ contentType: 'Course' })),
      delete: jest.fn().mockReturnValue(of(null)),
    }
    accessService = {
      orgRootOrgAsQuery: '?org=o1&rootOrg=r1',
      userId: 'user-1',
      userName: 'User One',
      appName: 'app',
      org: ['o1'],
      rootOrg: 'r1',
      locale: 'en',
      hasRole: jest.fn().mockReturnValue(true),
      getAction: jest.fn().mockReturnValue('SEND_FOR_REVIEW'),
      convertToESDate: jest.fn().mockReturnValue('2026-01-01'),
    }
    authInitService = { authConfig: {} }
    configSvc = { unMappedUser: { json_unmapped_fields: { dealer_group_code: 'DG1' } } }
    service = new MyContentService(authInitService, apiService as any, accessService, configSvc)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('fetchContent POSTs the search payload to SEARCH', () => {
    service.fetchContent({ q: 'x' }).subscribe()
    expect(apiService.post).toHaveBeenCalledWith(SEARCH, { q: 'x' })
  })

  it('deleteContent POSTs to CONTENT_DELETE by default', () => {
    service.deleteContent('do_1').subscribe()
    expect(apiService.post).toHaveBeenCalledWith(
      `${CONTENT_DELETE}${accessService.orgRootOrgAsQuery}`,
      expect.objectContaining({ identifier: 'do_1', author: 'user-1', isAdmin: true }),
    )
  })

  it('deleteContent DELETEs the kb endpoint for a knowledge board', () => {
    service.deleteContent('do_1', true).subscribe()
    expect(apiService.delete).toHaveBeenCalledWith(`${CONTENT_DELETE}/do_1/kb${accessService.orgRootOrgAsQuery}`)
  })

  it('restoreContent POSTs to CONTENT_RESTORE', () => {
    service.restoreContent('do_1').subscribe()
    expect(apiService.post).toHaveBeenCalledWith(
      `${CONTENT_RESTORE}${accessService.orgRootOrgAsQuery}`,
      expect.objectContaining({ identifier: 'do_1' }),
    )
  })

  it('fetchFromSearchV6 selects the admin vs auth endpoint', () => {
    service.fetchFromSearchV6({}, true).subscribe()
    expect(apiService.post).toHaveBeenCalledWith(SEARCH_V6_ADMIN, {})
    service.fetchFromSearchV6({}, false).subscribe()
    expect(apiService.post).toHaveBeenCalledWith(SEARCH_V6_AUTH, {})
  })

  it('readContent GETs the read endpoint with the id and query', () => {
    service.readContent('do_1').subscribe()
    expect(apiService.get).toHaveBeenCalledWith(`${CONTENT_READ}do_1${accessService.orgRootOrgAsQuery}`)
  })

  it('create POSTs a wrapped content body and returns the identifier', () => {
    let id: string | undefined
    service.create({ contentType: 'Course', name: 'C1' }).subscribe(r => (id = r))
    expect(id).toBe('new-id')
    const body = apiService.post.mock.calls[0][1]
    expect(body.content).toEqual(expect.objectContaining({ isExternal: false, createdBy: 'user-1', name: 'C1', locale: 'en' }))
  })

  it('create applies the client2 dealer access path for Knowledge Artifact', () => {
    accessService.rootOrg = 'client2'
    service.create({ contentType: 'Knowledge Artifact' }).subscribe()
    const body = apiService.post.mock.calls[0][1]
    expect(body.content.accessPaths).toBe('client2/Australia/dealer_code-DG1')
  })

  it('createInAnotherLanguage reads then creates a translation clone', () => {
    let id: string | undefined
    service.createInAnotherLanguage('do_1', 'hi').subscribe(r => (id = r))
    expect(apiService.get).toHaveBeenCalled()
    const createBody = apiService.post.mock.calls[0][1]
    expect(createBody.content.isTranslationOf).toBe('do_1')
    expect(createBody.content.locale).toBe('hi')
    expect(id).toBe('new-id')
  })

  it('forwardBackward POSTs a status-change action for the id', () => {
    service.forwardBackward({ operation: 'forward' } as any, 'do_1', 'Draft').subscribe()
    expect(accessService.getAction).toHaveBeenCalledWith('Draft', 'forward')
    expect(apiService.post).toHaveBeenCalledWith(
      STATUS_CHANGE + 'do_1',
      expect.objectContaining({ action: 'SEND_FOR_REVIEW', actor: 'user-1' }),
    )
  })

  it('actionOnExpiry POSTs to the expiry endpoint', () => {
    service.actionOnExpiry({ isExtend: true, expiryDate: '2026-01-01' }, 'do_1').subscribe()
    expect(apiService.post).toHaveBeenCalledWith(EXPIRY_DATE_ACTION, expect.objectContaining({ identifier: 'do_1', isExtend: true }))
  })

  it('upPublishOrDraft POSTs to UNPUBLISH with the unpublish flag', () => {
    service.upPublishOrDraft('do_1').subscribe()
    expect(apiService.post).toHaveBeenCalledWith(
      `${UNPUBLISH}${accessService.orgRootOrgAsQuery}`,
      { unpublish: true, identifier: 'do_1' },
      true,
      expect.objectContaining({ responseType: 'text' }),
    )
  })

  describe('getSearchBody', () => {
    it('builds an all-mode body with three filter groups for non-admin', () => {
      const body = service.getSearchBody('all')
      expect(body.filters[0].andFilters[0].creatorContacts).toEqual(['user-1'])
      expect(body.filters[1].andFilters[0].trackContacts).toEqual(['user-1'])
      expect(body.filters[2].andFilters[0].publisherDetails).toEqual(['user-1'])
      expect(body.sort).toEqual([{ lastUpdatedOn: 'desc' }])
    })

    it('adds an expiry window and expiry sort for expiry mode', () => {
      const body = service.getSearchBody('expiry')
      expect(body.filters[0].andFilters[0].status).toContain('Live')
      expect(accessService.convertToESDate).toHaveBeenCalled()
      expect(body.sort).toEqual([{ expiryDate: 'asc' }])
    })

    it('clears creator/publisher/track filters and sort for an admin free-text query', () => {
      const body = service.getSearchBody('draft', [], 0, 'angular', true)
      expect(body.filters[0].andFilters[0].creatorContacts).toBeUndefined()
      expect(body.filters[0].andFilters[0].publisherDetails).toBeUndefined()
      expect(body.sort).toBeUndefined()
    })
  })
})
