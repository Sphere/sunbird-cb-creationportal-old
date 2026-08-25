import { of } from 'rxjs'

import { MyContentService } from './my-content.service'

describe('MyContentService', () => {
  let service: MyContentService
  let authInitService: any
  let apiService: any
  let accessService: any
  let configSvc: any

  beforeEach(() => {
    authInitService = {
      authConfig: { contentType: { defaultValue: { Resource: [{ value: 'x' }] } } },
    }
    apiService = {
      get: jest.fn().mockReturnValue(of({})),
      post: jest.fn().mockReturnValue(of({})),
      delete: jest.fn().mockReturnValue(of(null)),
    }
    accessService = {
      orgRootOrgAsQuery: '?org=o&rootOrg=r',
      userId: 'user-1',
      userName: 'User One',
      org: 'o',
      rootOrg: 'r',
      appName: 'app',
      locale: 'en',
      hasRole: jest.fn().mockReturnValue(true),
      getAction: jest.fn().mockReturnValue('SEND_FOR_REVIEW'),
      convertToESDate: jest.fn().mockReturnValue('2026-01-01'),
    }
    configSvc = { unMappedUser: { json_unmapped_fields: { dealer_group_code: 'DG1' } } }
    service = new MyContentService(authInitService, apiService, accessService, configSvc)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('fetchContent posts the search data and maps the response through', done => {
    apiService.post.mockReturnValue(of({ result: 'ok' }))
    service.fetchContent({ q: 'x' }).subscribe(res => {
      expect(res).toEqual({ result: 'ok' })
      expect(apiService.post).toHaveBeenCalledWith(expect.any(String), { q: 'x' })
      done()
    })
  })

  it('deleteContent uses DELETE for knowledge board content', () => {
    service.deleteContent('id-1', true).subscribe()
    expect(apiService.delete).toHaveBeenCalledWith(expect.stringContaining('/id-1/kb?org=o&rootOrg=r'))
    expect(apiService.post).not.toHaveBeenCalled()
  })

  it('deleteContent posts a delete payload for non-knowledge-board content', () => {
    service.deleteContent('id-2').subscribe()
    const [, body] = apiService.post.mock.calls[0]
    expect(body).toEqual({ identifier: 'id-2', author: 'user-1', isAdmin: true })
    expect(accessService.hasRole).toHaveBeenCalledWith(['editor', 'admin'])
  })

  it('restoreContent posts the identifier and author', () => {
    service.restoreContent('id-3').subscribe()
    const [, body] = apiService.post.mock.calls[0]
    expect(body.identifier).toBe('id-3')
    expect(body.author).toBe('user-1')
  })

  it('fetchFromSearchV6 targets the admin endpoint when forAdmin is true', () => {
    service.fetchFromSearchV6({ q: 1 }, true).subscribe()
    const [url] = apiService.post.mock.calls[0]
    expect(url).toContain('admin')
  })

  it('fetchFromSearchV6 targets the auth endpoint by default', () => {
    service.fetchFromSearchV6({ q: 1 }).subscribe()
    const [url] = apiService.post.mock.calls[0]
    expect(url).toContain('auth')
  })

  it('readContent GETs the content hierarchy url', () => {
    service.readContent('id-4').subscribe()
    const [url] = apiService.get.mock.calls[0]
    expect(url).toContain('id-4')
    expect(url).toContain('?org=o&rootOrg=r')
  })

  it('create posts a wrapped request body and returns the new identifier', done => {
    apiService.post.mockReturnValue(of({ identifier: 'new-id' }))
    service.create({ contentType: 'Resource', locale: 'hi' }).subscribe(id => {
      expect(id).toBe('new-id')
      const [, body] = apiService.post.mock.calls[0]
      expect(body.content.createdBy).toBe('user-1')
      expect(body.content.locale).toBe('hi')
      expect(body.content.isExternal).toBe(false)
      done()
    })
  })

  it('create sets client2 access path for Knowledge Artifact on client2 root org', done => {
    accessService.rootOrg = 'client2'
    apiService.post.mockReturnValue(of({ identifier: 'ka-id' }))
    service.create({ contentType: 'Knowledge Artifact' }).subscribe(() => {
      const [, body] = apiService.post.mock.calls[0]
      expect(body.content.accessPaths).toBe('client2/Australia/dealer_code-DG1')
      done()
    })
  })

  it('createInAnotherLanguage reads then creates a translation', done => {
    apiService.get.mockReturnValue(of({ contentType: 'Resource', identifier: 'src' }))
    apiService.post.mockReturnValue(of({ identifier: 'translated' }))
    service.createInAnotherLanguage('src', 'hi').subscribe(id => {
      expect(id).toBe('translated')
      const [, body] = apiService.post.mock.calls[0]
      expect(body.content.locale).toBe('hi')
      expect(body.content.isTranslationOf).toBe('src')
      done()
    })
  })

  it('forwardBackward posts the built action body to the status-change url', () => {
    service.forwardBackward({ operation: 'sendForReview' } as any, 'id-5', 'Draft').subscribe()
    const [url, body] = apiService.post.mock.calls[0]
    expect(url).toContain('id-5')
    expect(body.actor).toBe('user-1')
    expect(body.action).toBe('SEND_FOR_REVIEW')
    expect(accessService.getAction).toHaveBeenCalledWith('Draft', 'sendForReview')
  })

  it('actionOnExpiry posts the identifier and org context', () => {
    service.actionOnExpiry({ isExtend: true, expiryDate: '2026-12-31' }, 'id-6').subscribe()
    const [, body] = apiService.post.mock.calls[0]
    expect(body.identifier).toBe('id-6')
    expect(body.isExtend).toBe(true)
    expect(body.org).toBe('o')
  })

  it('upPublishOrDraft posts with text/plain options', () => {
    service.upPublishOrDraft('id-7').subscribe()
    const [, body, encoding, options] = apiService.post.mock.calls[0]
    expect(body).toEqual({ unpublish: true, identifier: 'id-7' })
    expect(encoding).toBe(true)
    expect(options.responseType).toBe('text')
  })

  it('getUserCourseDetail GETs the mandatory content endpoint', () => {
    service.getUserCourseDetail().subscribe()
    const [url] = apiService.get.mock.calls[0]
    expect(url).toContain('/user/mandatoryContent/checkStatus')
  })

  describe('getSearchBody', () => {
    it('builds the all-mode body for a normal user with three filter groups', () => {
      const body = service.getSearchBody('all')
      expect(body.filters).toHaveLength(3)
      expect(body.filters[0].andFilters[0].creatorContacts).toEqual(['user-1'])
      expect(body.sort).toEqual([{ lastUpdatedOn: 'desc' }])
    })

    it('builds the all-mode body for an admin without creator/track/publisher filters', () => {
      const body = service.getSearchBody('all', [], 0, '*', true)
      expect(body.filters[0].andFilters[0].creatorContacts).toBeUndefined()
      expect(body.filters[0].andFilters[0].publisherDetails).toBeUndefined()
    })

    it('adds Live status and expiry range in expiry mode', () => {
      const body = service.getSearchBody('expiry')
      expect(body.filters[0].andFilters[0].status).toContain('Live')
      expect(body.filters[0].andFilters[0].expiryDate).toBeDefined()
      expect(accessService.convertToESDate).toHaveBeenCalled()
    })

    it('sets review-mode track contacts and InReview status', () => {
      const body = service.getSearchBody('review')
      expect(body.filters[0].andFilters[0].trackContacts).toEqual(['user-1'])
      expect(body.filters[0].andFilters[0].status).toContain('InReview')
    })

    it('clears sort when a real query term is supplied', () => {
      const body = service.getSearchBody('draft', [], 0, 'angular')
      expect(body.sort).toBeUndefined()
    })
  })
})
