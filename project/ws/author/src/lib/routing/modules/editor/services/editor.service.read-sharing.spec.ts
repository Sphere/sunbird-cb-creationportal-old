import { of, Subject } from 'rxjs'

import { EditorService } from './editor.service'

/**
 * Content reads must never be cached across time.
 *
 * Hierarchies and content change on every save, so a response held beyond its request
 * would hand a caller a version from before that save. Sharing is therefore limited to
 * requests that are still in flight: it collapses the burst a single builder click
 * causes, and nothing more. These tests pin both halves of that -- the sharing and,
 * more importantly, the absence of caching.
 */
describe('EditorService content read sharing', () => {
  let apiService: any
  let svc: EditorService

  const deps = () => [
    apiService,
    { userId: 'u', orgRootOrgAsQuery: '', hasRole: () => false },
    { fetchAutoCompleteV2: () => undefined },
    { userProfile: {}, unMappedUser: { json_unmapped_fields: {} } },
    { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  ]

  beforeEach(() => {
    apiService = { get: jest.fn() }
    svc = new (EditorService as any)(...deps())
  })

  describe('readcontentV3 (hierarchy)', () => {
    it('issues one request when two callers overlap', () => {
      const response = new Subject<any>()
      apiService.get.mockReturnValue(response)

      const first: any[] = []
      const second: any[] = []
      svc.readcontentV3('do_1').subscribe(v => first.push(v))
      svc.readcontentV3('do_1').subscribe(v => second.push(v))

      expect(apiService.get).toHaveBeenCalledTimes(1)

      response.next({ result: { content: { identifier: 'do_1', name: 'first read' } } })
      response.complete()

      expect(first[0].name).toBe('first read')
      expect(second[0].name).toBe('first read')
    })

    it('goes back to the server for a read that starts after the first finished', () => {
      const first = new Subject<any>()
      apiService.get.mockReturnValueOnce(first)

      let before: any
      svc.readcontentV3('do_1').subscribe(v => (before = v))
      first.next({ result: { content: { identifier: 'do_1', name: 'before save' } } })
      first.complete()

      // ...a save happens here and the hierarchy changes...
      const second = new Subject<any>()
      apiService.get.mockReturnValueOnce(second)

      let after: any
      svc.readcontentV3('do_1').subscribe(v => (after = v))
      second.next({ result: { content: { identifier: 'do_1', name: 'after save' } } })
      second.complete()

      expect(apiService.get).toHaveBeenCalledTimes(2)
      expect(before.name).toBe('before save')
      expect(after.name).toBe('after save')
    })

    it('never shares between different ids', () => {
      apiService.get.mockImplementation((url: string) =>
        of({ result: { content: { identifier: url.includes('do_1') ? 'do_1' : 'do_2' } } }),
      )

      svc.readcontentV3('do_1').subscribe()
      svc.readcontentV3('do_2').subscribe()

      expect(apiService.get).toHaveBeenCalledTimes(2)
    })

    it('gives each caller its own object so one cannot edit another', () => {
      const response = new Subject<any>()
      apiService.get.mockReturnValue(response)

      let a: any
      let b: any
      svc.readcontentV3('do_1').subscribe(v => (a = v))
      svc.readcontentV3('do_1').subscribe(v => (b = v))
      response.next({ result: { content: { identifier: 'do_1', name: 'original' } } })
      response.complete()

      a.name = 'edited by one caller'

      expect(b.name).toBe('original')
    })
  })

  describe('readContentV2 / checkReadAPI (content read)', () => {
    it('shares one request between the two methods while it is in flight', () => {
      const response = new Subject<any>()
      apiService.get.mockReturnValue(response)

      svc.readContentV2('do_1').subscribe()
      svc.checkReadAPI('do_1').subscribe()

      expect(apiService.get).toHaveBeenCalledTimes(1)
      response.next({ result: { content: { identifier: 'do_1' } } })
      response.complete()
    })

    it('re-reads once the previous request has finished', () => {
      const first = new Subject<any>()
      apiService.get.mockReturnValueOnce(first)
      svc.checkReadAPI('do_1').subscribe()
      first.next({ result: { content: { identifier: 'do_1' } } })
      first.complete()

      const second = new Subject<any>()
      apiService.get.mockReturnValueOnce(second)
      svc.checkReadAPI('do_1').subscribe()

      expect(apiService.get).toHaveBeenCalledTimes(2)
    })

    it('returns the content asked for, not whichever was read first', () => {
      apiService.get.mockImplementation((url: string) =>
        of({ result: { content: { identifier: url.includes('do_1') ? 'do_1' : 'do_2' } } }),
      )

      let firstId: string | undefined
      let secondId: string | undefined
      svc.checkReadAPI('do_1').subscribe((r: any) => (firstId = r.result.content.identifier))
      svc.checkReadAPI('do_2').subscribe((r: any) => (secondId = r.result.content.identifier))

      expect(apiService.get).toHaveBeenCalledTimes(2)
      expect(firstId).toBe('do_1')
      expect(secondId).toBe('do_2')
    })
  })
})
