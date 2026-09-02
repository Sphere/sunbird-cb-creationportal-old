import { of, throwError } from 'rxjs'
import { ContentAndDataReadMultiLangTOCResolver } from './content-and-data-read-multi-lang.service'

describe('ContentAndDataReadMultiLangTOCResolver', () => {
  let apiService: { get: jest.Mock }
  let router: { navigateByUrl: jest.Mock }
  let svc: ContentAndDataReadMultiLangTOCResolver

  beforeEach(() => {
    apiService = { get: jest.fn() }
    router = { navigateByUrl: jest.fn() }
    svc = new ContentAndDataReadMultiLangTOCResolver(apiService as any, router as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  describe('jsonVerify', () => {
    it('returns true for valid JSON', () => {
      expect(svc.jsonVerify('{"a":1}')).toBe(true)
    })

    it('returns false for invalid JSON', () => {
      expect(svc.jsonVerify('not-json')).toBe(false)
    })
  })

  describe('resolve', () => {
    it('returns null when the route id is "new"', () => {
      const result = svc.resolve({ params: { id: 'new' } } as any)
      expect(result).toBeNull()
      expect(apiService.get).not.toHaveBeenCalled()
    })

    it('calls the hierarchy endpoint with the id and edit mode', done => {
      apiService.get.mockReturnValue(
        of({
          result: {
            content: {
              creatorContacts: '[{"id":1}]',
              reviewer: '[{"r":1}]',
              creatorDetails: '[{"c":1}]',
              publisherDetails: '[{"p":1}]',
              children: [],
            },
          },
        }),
      )
      const result = svc.resolve({ params: { id: 'DO_123' } } as any)
      expect(result).not.toBeNull()
      result!.subscribe(() => {
        const url = apiService.get.mock.calls[0][0]
        expect(url).toBe('/apis/proxies/v8/action/content/v3/hierarchy/DO_123?mode=edit')
        done()
      })
    })

    it('parses stringified contact/detail fields into arrays and wraps result', done => {
      apiService.get.mockReturnValue(
        of({
          result: {
            content: {
              creatorContacts: '[{"id":1}]',
              reviewer: '[{"r":1}]',
              creatorDetails: '[{"c":1}]',
              publisherDetails: '[{"p":1}]',
              children: [],
            },
          },
        }),
      )
      svc.resolve({ params: { id: 'X1' } } as any)!.subscribe((res: any) => {
        expect(Array.isArray(res)).toBe(true)
        const content = res[0].content
        expect(content.creatorContacts).toEqual([{ id: 1 }])
        expect(content.trackContacts).toEqual([{ r: 1 }])
        expect(content.creatorDetails).toEqual([{ c: 1 }])
        expect(content.publisherDetails).toEqual([{ p: 1 }])
        done()
      })
    })

    it('defaults invalid JSON fields to empty arrays and processes children', done => {
      apiService.get.mockReturnValue(
        of({
          result: {
            content: {
              creatorContacts: 'bad',
              reviewer: 'bad',
              creatorDetails: 'bad',
              publisherDetails: 'bad',
              children: [
                {
                  creatorContacts: '[{"id":9}]',
                  reviewer: 'bad',
                  creatorDetails: 'bad',
                  publisherDetails: '[{"p":9}]',
                },
              ],
            },
          },
        }),
      )
      svc.resolve({ params: { id: 'X2' } } as any)!.subscribe((res: any) => {
        const content = res[0].content
        expect(content.creatorContacts).toEqual([])
        expect(content.trackContacts).toEqual([])
        expect(content.creatorDetails).toEqual([])
        expect(content.publisherDetails).toEqual([])
        const child = content.children[0]
        expect(child.creatorContacts).toEqual([{ id: 9 }])
        expect(child.trackContacts).toEqual([])
        expect(child.creatorDetails).toEqual([])
        expect(child.publisherDetails).toEqual([{ p: 9 }])
        done()
      })
    })

    it('navigates to the error page and passes the value through on error', done => {
      apiService.get.mockReturnValue(throwError(() => 'boom'))
      svc.resolve({ params: { id: 'X3' } } as any)!.subscribe((v: any) => {
        expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
        expect(v).toBe('boom')
        done()
      })
    })
  })
})
