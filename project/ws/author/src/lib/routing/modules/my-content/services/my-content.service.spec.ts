import { of } from 'rxjs'

import { MyContentService } from './my-content.service'
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
  UNPUBLISH_CONTENT,
} from '@ws/author/src/lib/constants/apiEndpoints'

describe('MyContentService (my-content)', () => {
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
      hasRole: jest.fn().mockReturnValue(false),
      getAction: jest.fn().mockReturnValue('PUBLISH'),
      convertToESDate: jest.fn().mockReturnValue('2026-01-01'),
    }
    authInitService = { authConfig: {} }
    configSvc = { unMappedUser: { json_unmapped_fields: { dealer_group_code: 'DG1' } } }
    service = new MyContentService(authInitService, apiService as any, accessService, configSvc)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('fetchContent POSTs to SEARCH', () => {
    service.fetchContent({ q: 'x' }).subscribe()
    expect(apiService.post).toHaveBeenCalledWith(SEARCH, { q: 'x' })
  })

  it('deleteContent POSTs to CONTENT_DELETE by default', () => {
    service.deleteContent('do_1').subscribe()
    expect(apiService.post).toHaveBeenCalledWith(
      `${CONTENT_DELETE}${accessService.orgRootOrgAsQuery}`,
      expect.objectContaining({ identifier: 'do_1', author: 'user-1', isAdmin: false }),
    )
  })

  it('deleteContent DELETEs the kb endpoint for a knowledge board', () => {
    service.deleteContent('do_1', true).subscribe()
    expect(apiService.delete).toHaveBeenCalledWith(`${CONTENT_DELETE}/do_1/kb${accessService.orgRootOrgAsQuery}`)
  })

  it('deleteOrUnpublishContent DELETEs the retire endpoint with the content id', () => {
    service.deleteOrUnpublishContent('do_1').subscribe()
    expect(apiService.delete).toHaveBeenCalledWith(UNPUBLISH_CONTENT, { body: { request: { contentIds: ['do_1'] } } })
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
    service.fetchFromSearchV6({}).subscribe()
    expect(apiService.post).toHaveBeenCalledWith(SEARCH_V6_AUTH, {})
  })

  it('readContent GETs the read endpoint', () => {
    service.readContent('do_1').subscribe()
    expect(apiService.get).toHaveBeenCalledWith(`${CONTENT_READ}do_1${accessService.orgRootOrgAsQuery}`)
  })

  it('create POSTs a wrapped body and returns the new identifier', () => {
    let id: string | undefined
    service.create({ contentType: 'Course', name: 'C1' }).subscribe(r => (id = r))
    expect(id).toBe('new-id')
    const body = apiService.post.mock.calls[0][1]
    expect(body.content).toEqual(expect.objectContaining({ isExternal: false, createdBy: 'user-1', locale: 'en' }))
    expect(apiService.post.mock.calls[0][0]).toBe(`${CONTENT_CREATE}${accessService.orgRootOrgAsQuery}`)
  })

  it('create sets a plain client2 access path for non-knowledge-artifact content', () => {
    accessService.rootOrg = 'client2'
    service.create({ contentType: 'Course' }).subscribe()
    expect(apiService.post.mock.calls[0][1].content.accessPaths).toBe('client2')
  })

  it('createInAnotherLanguage reads then creates a translation clone', () => {
    let id: string | undefined
    service.createInAnotherLanguage('do_1', 'hi').subscribe(r => (id = r))
    const createBody = apiService.post.mock.calls[0][1]
    expect(createBody.content.isTranslationOf).toBe('do_1')
    expect(createBody.content.locale).toBe('hi')
    expect(id).toBe('new-id')
  })

  it('forwardBackward POSTs a status-change action', () => {
    service.forwardBackward({ operation: 'forward' } as any, 'do_1', 'Reviewed').subscribe()
    expect(accessService.getAction).toHaveBeenCalledWith('Reviewed', 'forward')
    expect(apiService.post).toHaveBeenCalledWith(STATUS_CHANGE + 'do_1', expect.objectContaining({ action: 'PUBLISH', actor: 'user-1' }))
  })

  it('actionOnExpiry POSTs to the expiry endpoint', () => {
    service.actionOnExpiry({ isExtend: false }, 'do_1').subscribe()
    expect(apiService.post).toHaveBeenCalledWith(EXPIRY_DATE_ACTION, expect.objectContaining({ identifier: 'do_1', isExtend: false }))
  })

  it('upPublishOrDraft DELETEs the retire endpoint', () => {
    service.upPublishOrDraft('do_1').subscribe()
    expect(apiService.delete).toHaveBeenCalledWith(UNPUBLISH_CONTENT, { body: { request: { contentIds: ['do_1'] } } })
  })

  describe('getSearchBody', () => {
    it('builds an all-mode body with three filter groups for non-admin', () => {
      const body = service.getSearchBody('all')
      expect(body.filters[0].andFilters[0].creatorContacts).toEqual(['user-1'])
      expect(body.filters[1].andFilters[0].trackContacts).toEqual(['user-1'])
      expect(body.filters[2].andFilters[0].publisherDetails).toEqual(['user-1'])
    })

    it('pushes Reviewed status and publisher filter for publish mode', () => {
      const body = service.getSearchBody('publish')
      expect(body.filters[0].andFilters[0].status).toContain('Reviewed')
      expect(body.filters[0].andFilters[0].publisherDetails).toEqual(['user-1'])
      expect(body.sort).toEqual([{ lastUpdatedOn: 'asc' }])
    })

    it('drops the sort for a free-text query', () => {
      const body = service.getSearchBody('draft', [], 0, 'angular')
      expect(body.sort).toBeUndefined()
    })
  })
})
