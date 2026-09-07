import { CreateService } from './create.service'
import { of } from 'rxjs'

describe('CreateService', () => {
  let http: { post: jest.Mock }
  let configSvc: any
  let accessService: any
  let svc: CreateService

  beforeEach(() => {
    http = { post: jest.fn(() => of({ identifier: 'ID1', result: 'RES1' })) }
    configSvc = {
      userProfile: { rootOrgId: 'ro', departmentName: 'dep' },
      unMappedUser: { json_unmapped_fields: { dealer_group_code: 'DG' } },
    }
    accessService = { userId: 'u1', userName: 'User One', rootOrg: 'default' }
    svc = new CreateService(configSvc, accessService, http as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('create posts to v3/create with defaults and returns identifier', done => {
    svc.create({ mimeType: 'application/pdf', contentType: 'Resource', locale: 'en' }).subscribe(id => {
      expect(id).toBe('ID1')
      const [url, body] = http.post.mock.calls[0]
      expect(url).toContain('content/v3/create')
      expect(body.content).toMatchObject({
        name: 'untitled content',
        description: '',
        category: 'Resource',
        createdBy: 'u1',
        isExternal: false,
      })
      done()
    })
  })

  it('create marks isExternal true for application/html', done => {
    svc.create({ mimeType: 'application/html', contentType: 'Resource', locale: 'en' }).subscribe(() => {
      expect(http.post.mock.calls[0][1].content.isExternal).toBe(true)
      done()
    })
  })

  it('create sets client2 dealer accessPaths for Knowledge Artifact', done => {
    accessService.rootOrg = 'client2'
    svc.create({ mimeType: 'x', contentType: 'Knowledge Artifact', locale: 'en' }).subscribe(() => {
      expect(http.post.mock.calls[0][1].content.accessPaths).toBe('client2/Australia/dealer_code-DG')
      done()
    })
  })

  it('create falls back to client2 accessPaths when dealer lookup throws', done => {
    accessService.rootOrg = 'client2'
    configSvc.unMappedUser = null
    svc.create({ mimeType: 'x', contentType: 'Knowledge Artifact', locale: 'en' }).subscribe(() => {
      expect(http.post.mock.calls[0][1].content.accessPaths).toBe('client2')
      done()
    })
  })

  it('createV2 posts a v2 request and returns result', done => {
    const meta: any = {
      mimeType: 'text/x-url',
      contentType: 'Course',
      locale: 'en',
      primaryCategory: 'Course',
      name: { courseName: ' C ', courseDescription: ' D ', courseIntroduction: 'I' },
    }
    svc.createV2(meta).subscribe(res => {
      expect(res).toBe('RES1')
      const body = http.post.mock.calls[0][1]
      expect(body.request.content.name).toBe('C')
      expect(body.request.content.instructions).toBe('D')
      expect(body.request.content.isExternal).toBe(true)
      expect(body.request.content.code).toHaveLength(16)
      done()
    })
  })

  it('createForum posts the request to the forum endpoint', done => {
    svc.createForum({ x: 1 }).subscribe(() => {
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/discussion/forum/v3/create'), { x: 1 })
      done()
    })
  })
})
