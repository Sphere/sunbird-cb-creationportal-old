import { EditorService } from './editor.service'
import { of, throwError } from 'rxjs'

describe('EditorService', () => {
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
      delete: jest.fn(() => of({})),
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
    http = {
      get: jest.fn(() => of({})),
      post: jest.fn(() => of({})),
      patch: jest.fn(() => of({})),
    }
    svc = new EditorService(apiService, accessService, userAutoComplete, configSvc, http)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  describe('create', () => {
    it('posts a create-meta body and maps to identifier', done => {
      http.post.mockReturnValue(of({ identifier: 'id-99' }))
      svc.create({ contentType: 'Course', name: 'C1' } as any).subscribe(id => {
        expect(id).toBe('id-99')
        const [url, body] = http.post.mock.calls[0]
        expect(url).toContain('content/v3/create')
        expect(body.content.createdBy).toBe('user-1')
        expect(body.content.category).toBe('Course')
        done()
      })
    })

    it('sets client2 access path for Knowledge Artifact when rootOrg is client2', done => {
      accessService.rootOrg = 'client2'
      http.post.mockReturnValue(of({ identifier: 'x' }))
      svc.create({ contentType: 'Knowledge Artifact' } as any).subscribe(() => {
        const body = http.post.mock.calls[0][1]
        expect(body.content.accessPaths).toContain('client2/Australia/dealer_code-DGC')
        done()
      })
    })

    it('falls back to plain client2 access path on error', done => {
      accessService.rootOrg = 'client2'
      configSvc.unMappedUser = {}
      http.post.mockReturnValue(of({ identifier: 'x' }))
      svc.create({ contentType: 'Knowledge Artifact' } as any).subscribe(() => {
        expect(http.post.mock.calls[0][1].content.accessPaths).toBe('client2')
        done()
      })
    })
  })

  describe('createV2', () => {
    it('posts a v2 body and stores/returns the identifier', done => {
      http.post.mockReturnValue(of({ result: { identifier: 'v2-id' } }))
      svc
        .createV2({ contentType: 'Resource', mimeType: 'application/html', name: 'R', primaryCategory: 'X' } as any)
        .subscribe(id => {
          expect(id).toBe('v2-id')
          expect(svc.resourseID).toBe('v2-id')
          const body = http.post.mock.calls[0][1]
          expect(body.request.content.isExternal).toBe(true)
          expect(body.request.content.createdBy).toBe('user-1')
          done()
        })
    })
  })

  describe('createTemplate', () => {
    it('posts an Asset template and stores the identifier', done => {
      http.post.mockReturnValue(of({ result: { identifier: 'tpl-1' } }))
      svc.createTemplate({ name: 'T' }).subscribe(data => {
        expect(svc.resourseID).toBe('tpl-1')
        expect(data.result.identifier).toBe('tpl-1')
        const body = http.post.mock.calls[0][1]
        expect(body.request.content.name).toBe('T')
        expect(body.request.content.contentType).toBe('Asset')
        done()
      })
    })
  })

  describe('read helpers', () => {
    it('readContent delegates to apiService.get and stores lexid', () => {
      svc.readContent('id-1')
      expect(svc.newCreatedLexid).toBe('id-1')
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('id-1'))
    })

    it('readContentV2 maps result.content', done => {
      apiService.get.mockReturnValue(of({ result: { content: { name: 'x' } } }))
      svc.readContentV2('id-2').subscribe(c => {
        expect(c).toEqual({ name: 'x' })
        expect(svc.newCreatedLexid).toBe('id-2')
        done()
      })
    })

    it('readcontentV3 maps result.content from hierarchy endpoint', done => {
      apiService.get.mockReturnValue(of({ result: { content: { id: 'z' } } }))
      svc.readcontentV3('id-3').subscribe(c => {
        expect(c).toEqual({ id: 'z' })
        expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('hierarchy/id-3'))
        done()
      })
    })

    it('contentRead hits the .img hierarchy endpoint', () => {
      svc.contentRead('id-4')
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('id-4.img'))
    })

    it('checkReadAPI caches the observable', () => {
      const first = svc.checkReadAPI('id-5')
      const second = svc.checkReadAPI('id-5')
      expect(first).toBe(second)
      expect(apiService.get).toHaveBeenCalledTimes(1)
    })

    it('readMultipleContent joins ids', () => {
      svc.readMultipleContent(['a', 'b'])
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('a,b'))
    })
  })

  describe('entity search', () => {
    it('getAllEntities posts a Competency search body', () => {
      svc.getAllEntities('hi')
      const [url, body] = http.post.mock.calls[0]
      expect(url).toBe('/apis/proxies/v8/entity/v1/search')
      expect(body.language).toBe('hi')
      expect(body.strict).toBe('false')
    })

    it('getEntities posts a strict query for the id', () => {
      svc.getEntities(42)
      const body = http.post.mock.calls[0][1]
      expect(body.query).toBe('42')
      expect(body.strict).toBe('true')
    })
  })

  describe('module helpers', () => {
    it('createModule returns the non-do_ identifier', done => {
      apiService.patch.mockReturnValue(
        of({ result: { identifiers: { 'client_new': 'new-id', 'do_123': 'x' } } }),
      )
      svc.createModule({}).subscribe(id => {
        expect(id).toBe('new-id')
        done()
      })
    })

    it('getModuleContent picks the matching child by identifier', done => {
      apiService.get.mockReturnValue(
        of({ result: { content: { children: [{ identifier: 'm1' }, { identifier: 'm2' }] } } }),
      )
      svc.getModuleContent('parent', 'm2').subscribe(child => {
        expect(child.identifier).toBe('m2')
        expect(svc.newCreatedLexid).toBe('m2')
        done()
      })
    })

    it('createAndReadModule chains create then read', done => {
      apiService.patch.mockReturnValue(of({ result: { identifiers: { c: 'm2' } } }))
      apiService.get.mockReturnValue(
        of({ result: { content: { children: [{ identifier: 'm2' }] } } }),
      )
      svc.createAndReadModule({}, 'parent').subscribe(child => {
        expect(child.identifier).toBe('m2')
        done()
      })
    })
  })

  describe('update methods', () => {
    it('updateContent posts to the save endpoint with org query', () => {
      svc.updateContent({} as any)
      expect(apiService.post).toHaveBeenCalledWith(expect.stringContaining('?org='), {})
    })

    it('updateContentV3 patches the update endpoint', () => {
      svc.updateContentV3({} as any, 'id-9')
      expect(apiService.patch).toHaveBeenCalledWith(expect.stringContaining('update/id-9'), {})
    })

    it('updateNewContentV3 patches via http', () => {
      svc.updateNewContentV3({}, 'id-10')
      expect(http.patch).toHaveBeenCalledWith(expect.stringContaining('update/id-10'), {})
    })

    it('updateContentV4 patches the hierarchy update endpoint', () => {
      svc.updateContentV4({} as any)
      expect(apiService.patch).toHaveBeenCalledWith(expect.stringContaining('hierarchy/update'), {})
    })

    it('resourceToModule patches the hierarchy add endpoint', () => {
      svc.resourceToModule({})
      expect(http.patch).toHaveBeenCalledWith(expect.stringContaining('hierarchy/add'), {})
    })

    it('updateContentForReviwer patches updateReviewStatus', () => {
      svc.updateContentForReviwer({}, 'id-11')
      expect(apiService.patch).toHaveBeenCalledWith(
        expect.stringContaining('updateReviewStatus/id-11'),
        {},
      )
    })
  })

  describe('workflow', () => {
    it('sendToReview posts when parent status is Draft', () => {
      svc.sendToReview('id-1', 'Draft')
      expect(apiService.post).toHaveBeenCalledWith(expect.stringContaining('review/id-1'), {})
    })

    it('sendToReview returns EMPTY otherwise', done => {
      apiService.post.mockClear()
      const obs = svc.sendToReview('id-1', 'Live')
      let emitted = false
      obs.subscribe({
        next: () => (emitted = true),
        complete: () => {
          expect(emitted).toBe(false)
          expect(apiService.post).not.toHaveBeenCalled()
          done()
        },
      })
    })

    it('publishContent posts publisher info', () => {
      svc.publishContent('id-2')
      const body = apiService.post.mock.calls[0][1]
      expect(body.request.content.publisher).toBe('User One')
    })

    it('rejectContentApi posts to reject endpoint', () => {
      svc.rejectContentApi({}, 'id-3')
      expect(apiService.post).toHaveBeenCalledWith(expect.stringContaining('reject/id-3'), {})
    })

    it('forwardBackward builds an action body with actor/rootOrg', () => {
      svc.forwardBackward({ operation: 'op' } as any, 'id-4', 'Draft')
      const body = apiService.post.mock.calls[0][1]
      expect(body.actor).toBe('user-1')
      expect(body.action).toBe('ACTION')
      expect(accessService.getAction).toHaveBeenCalledWith('Draft', 'op')
    })
  })

  describe('search & lists', () => {
    it('fetchEmployeeList maps autocomplete results', done => {
      userAutoComplete.fetchAutoCompleteV2.mockReturnValue(
        of([{ first_name: 'A', last_name: 'B', wid: 'w1', email: 'e', department_name: 'd' }]),
      )
      svc.fetchEmployeeList('q', 'role').subscribe(list => {
        expect(list[0]).toEqual({ displayName: 'A B', id: 'w1', mail: 'e', department: 'd' })
        done()
      })
    })

    it('fetchEmployeeList swallows errors to an empty list', done => {
      userAutoComplete.fetchAutoCompleteV2.mockReturnValue(throwError(() => 'err'))
      svc.fetchEmployeeList('q').subscribe(list => {
        expect(list).toEqual([])
        done()
      })
    })

    it('searchSkills maps skill results', done => {
      apiService.get.mockReturnValue(
        of([{ identifier: 'i', name: 'n', skill: 's', category: 'c' }]),
      )
      svc.searchSkills('foo').subscribe(list => {
        expect(list[0].name).toBe('n')
        expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('search_text=foo'))
        done()
      })
    })

    it('searchV6Content uses the admin endpoint when the user has role', done => {
      accessService.hasRole.mockReturnValue(true)
      apiService.post.mockReturnValue(of({ result: [{ id: 1 }] }))
      svc.searchV6Content('q', 'en').subscribe(res => {
        expect(res).toEqual([{ id: 1 }])
        expect(apiService.post.mock.calls[0][0]).toContain('admin')
        done()
      })
    })

    it('searchV6Content falls back to auth endpoint and empty result on error', done => {
      accessService.hasRole.mockReturnValue(false)
      apiService.post.mockReturnValue(throwError(() => 'x'))
      svc.searchV6Content('q', 'en').subscribe(res => {
        expect(res).toEqual([])
        expect(apiService.post.mock.calls[0][0]).toContain('auth')
        done()
      })
    })

    it('searchContent passes the payload through', () => {
      svc.searchContent({ q: 1 })
      expect(apiService.post).toHaveBeenCalledWith(expect.any(String), { q: 1 })
    })
  })

  describe('roles & access', () => {
    it('checkRole concatenates default and user roles', done => {
      apiService.get.mockReturnValue(of({ default_roles: ['a'], user_roles: ['b'] }))
      svc.checkRole('id').subscribe(roles => {
        expect(roles).toEqual(['a', 'b'])
        done()
      })
    })

    it('checkRole returns [] when response is empty', done => {
      apiService.get.mockReturnValue(of(null))
      svc.checkRole('id').subscribe(roles => {
        expect(roles).toEqual([])
        done()
      })
    })

    it('getAccessPath fetches and flattens access paths', done => {
      apiService.get.mockReturnValue(
        of({ special: [{ accessPaths: ['p1'] }, { accessPaths: ['p2'] }] }),
      )
      svc.getAccessPath().subscribe(paths => {
        expect(paths).toEqual(['p1', 'p2'])
        done()
      })
    })

    it('getAccessPath returns EMPTY when already populated', done => {
      svc.accessPath = ['existing']
      let emitted = false
      svc.getAccessPath().subscribe({
        next: () => (emitted = true),
        complete: () => {
          expect(emitted).toBe(false)
          expect(apiService.get).not.toHaveBeenCalled()
          done()
        },
      })
    })
  })

  describe('misc endpoints', () => {
    it('getBatchforCert posts and maps content', done => {
      http.post.mockReturnValue(of({ result: { response: { content: [{ b: 1 }] } } }))
      svc.getBatchforCert({}).subscribe(res => {
        expect(res).toEqual([{ b: 1 }])
        done()
      })
    })

    it('createBatch posts the payload', () => {
      svc.createBatch({ x: 1 })
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('batch/create'), { x: 1 })
    })

    it('checkUrl delegates to apiService.get', () => {
      svc.checkUrl('/some/url')
      expect(apiService.get).toHaveBeenCalledWith('/some/url')
    })

    it('readJSON encodes the artifact url', () => {
      svc.readJSON('http://a b/c')
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('http://a b/c')))
    })

    it('copy builds destination/location and posts', () => {
      svc.copy('lex.img', 'a/b/c/d/e/f/g/h')
      const [, body] = apiService.post.mock.calls[0]
      expect(body.destination).toContain('lex')
      expect(body.location).toBeDefined()
    })

    it('deleteContent uses the kb endpoint for knowledge boards', () => {
      svc.deleteContent('id-1', true)
      expect(apiService.delete).toHaveBeenCalledWith(expect.stringContaining('/id-1/kb'))
    })

    it('deleteContent posts a payload for normal content', () => {
      svc.deleteContent('id-2')
      const body = apiService.post.mock.calls[0][1]
      expect(body.identifier).toBe('id-2')
      expect(body.author).toBe('user-1')
    })

    it('getDataForContent catches errors and re-emits them', done => {
      apiService.get.mockReturnValue(throwError(() => ({ err: true })))
      svc.getDataForContent('id-3').subscribe(res => {
        expect(res).toEqual({ err: true })
        done()
      })
    })

    it('sendEmailNotificationAPI posts to notify endpoint', () => {
      svc.sendEmailNotificationAPI({ to: 'x' })
      expect(apiService.post).toHaveBeenCalledWith(expect.stringContaining('notifyContentState'), { to: 'x' })
    })

    it('rolesMappingAPI maps response', done => {
      apiService.get.mockReturnValue(of({ response: [{ r: 1 }] }))
      svc.rolesMappingAPI().subscribe(res => {
        expect(res).toEqual([{ r: 1 }])
        done()
      })
    })

    it('rolesMapped maps roles', done => {
      apiService.get.mockReturnValue(of({ roles: ['r1'] }))
      svc.rolesMapped().subscribe(res => {
        expect(res).toEqual(['r1'])
        done()
      })
    })

    it('sourceNames maps sourceName', done => {
      apiService.get.mockReturnValue(of({ sourceName: ['s1'] }))
      svc.sourceNames().subscribe(res => {
        expect(res).toEqual(['s1'])
        done()
      })
    })

    it('languageList maps languageList', done => {
      apiService.get.mockReturnValue(of({ languageList: ['en'] }))
      svc.languageList().subscribe(res => {
        expect(res).toEqual(['en'])
        done()
      })
    })
  })
})
