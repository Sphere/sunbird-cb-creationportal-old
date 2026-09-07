import { DashBoardService } from './dashboard.service'
import { of } from 'rxjs'

describe('DashBoardService', () => {
  let apiService: { post: jest.Mock }
  let configSvc: any
  let accessService: any
  let svc: DashBoardService

  beforeEach(() => {
    apiService = { post: jest.fn(() => of({ identifier: 'NEW-ID' })) }
    configSvc = { unMappedUser: { json_unmapped_fields: { dealer_group_code: 'DG9' } } }
    accessService = {
      locale: 'en',
      userId: 'u1',
      rootOrg: 'default',
      orgRootOrgAsQuery: '?org=O',
    }
    svc = new DashBoardService(apiService as any, configSvc, accessService)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('create posts a default content body and returns the new identifier', done => {
    svc.create({ mimeType: 'application/pdf', contentType: 'Resource' }).subscribe(id => {
      expect(id).toBe('NEW-ID')
      const [url, body] = apiService.post.mock.calls[0]
      expect(url).toContain('?org=O')
      expect(body.content).toMatchObject({
        isExternal: false,
        mimeType: 'application/pdf',
        contentType: 'Resource',
        name: 'Untitled Content',
        locale: 'en',
        createdBy: 'u1',
      })
      expect(body.content.accessPaths).toBeUndefined()
      done()
    })
  })

  it('create sets dealer accessPaths for client2 Knowledge Artifact', done => {
    accessService.rootOrg = 'client2'
    svc.create({ mimeType: 'x', contentType: 'Knowledge Artifact' }).subscribe(() => {
      const body = apiService.post.mock.calls[0][1]
      expect(body.content.accessPaths).toBe('client2/Australia/dealer_code-DG9')
      done()
    })
  })

  it('create falls back to "client2" accessPaths when dealer code lookup throws', done => {
    accessService.rootOrg = 'client2'
    configSvc.unMappedUser = null
    svc.create({ mimeType: 'x', contentType: 'Knowledge Artifact' }).subscribe(() => {
      expect(apiService.post.mock.calls[0][1].content.accessPaths).toBe('client2')
      done()
    })
  })

  it('create uses plain "client2" accessPaths for non-KA content on client2', done => {
    accessService.rootOrg = 'client2'
    svc.create({ mimeType: 'x', contentType: 'Course' }).subscribe(() => {
      expect(apiService.post.mock.calls[0][1].content.accessPaths).toBe('client2')
      done()
    })
  })
})
