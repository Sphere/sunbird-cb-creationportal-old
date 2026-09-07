import { of, throwError } from 'rxjs'
import { PageResolve } from './page.resolver'

describe('PageResolve', () => {
  let http: { get: jest.Mock; post: jest.Mock }
  let configSvc: any
  let resolver: PageResolve

  /** Builds an ActivatedRouteSnapshot stub with `data` and a paramMap over `params`. */
  const snapshot = (data: any, params: Record<string, string> = {}) =>
    ({
      data,
      paramMap: {
        has: (k: string) => Object.prototype.hasOwnProperty.call(params, k),
        get: (k: string) => (Object.prototype.hasOwnProperty.call(params, k) ? params[k] : null),
      },
    }) as any

  const build = (locale = 'en') => {
    resolver = new PageResolve(configSvc, http as any, locale)
    return resolver
  }

  beforeEach(() => {
    http = { get: jest.fn(), post: jest.fn() }
    configSvc = { sitePath: '/site' }
    build()
  })

  it('should be created', () => {
    expect(resolver).toBeTruthy()
  })

  it('returns a configuration error when the URL cannot be formed', () => {
    const result = resolver.resolve(snapshot({}))
    expect(result).toEqual({ data: null, error: 'CONFIGURATION_ERROR_PAGE_URL_NOT_FORMED' })
  })

  it('returns a configuration error for pageType "page" when the param is missing', () => {
    const result = resolver.resolve(snapshot({ pageType: 'page', pageKey: 'slug' }))
    expect(result).toEqual({ data: null, error: 'CONFIGURATION_ERROR_PAGE_URL_NOT_FORMED' })
  })

  it('fetches the explicit pageUrl as a .json document', done => {
    http.get.mockReturnValue(of({ title: 'home' }))
    const result: any = resolver.resolve(snapshot({ pageUrl: '/site/page/home' }))
    result.subscribe((res: any) => {
      expect(http.get).toHaveBeenCalledWith('/site/page/home.json')
      expect(res).toEqual({ data: { title: 'home' }, error: null })
      done()
    })
  })

  it('builds the feature URL from the site path and page key', done => {
    http.get.mockReturnValue(of({ title: 'feat' }))
    const result: any = resolver.resolve(snapshot({ pageType: 'feature', pageKey: 'frac' }))
    result.subscribe(() => {
      expect(http.get).toHaveBeenCalledWith('/site/feature/frac.json')
      done()
    })
  })

  it('builds the page URL from the route param value', done => {
    http.get.mockReturnValue(of({ title: 'p' }))
    const result: any = resolver.resolve(snapshot({ pageType: 'page', pageKey: 'slug' }, { slug: 'about' }))
    result.subscribe(() => {
      expect(http.get).toHaveBeenCalledWith('/site/page/about.json')
      done()
    })
  })

  it('builds the toc page URL from the page key itself', done => {
    http.get.mockReturnValue(of({ title: 'toc' }))
    const result: any = resolver.resolve(snapshot({ pageType: 'page', pageKey: 'toc' }))
    result.subscribe(() => {
      expect(http.get).toHaveBeenCalledWith('/site/page/toc.json')
      done()
    })
  })

  it('surfaces a fetch failure as { data: null, error }', done => {
    http.get.mockReturnValue(throwError(() => 'boom'))
    const result: any = resolver.resolve(snapshot({ pageUrl: '/site/page/home' }))
    result.subscribe((res: any) => {
      expect(res).toEqual({ data: null, error: 'boom' })
      done()
    })
  })

  it('prefers the localised document when one resolves', done => {
    build('hi')
    http.get.mockImplementation((url: string) => of(url.includes('.hi.json') ? { title: 'localised' } : { title: 'general' }))
    const result: any = resolver.resolve(snapshot({ pageUrl: '/site/page/home' }))
    result.subscribe((res: any) => {
      expect(res).toEqual({ data: { title: 'localised' }, error: null })
      done()
    })
  })

  it('falls back to the general document when the localised one fails', done => {
    build('hi')
    http.get.mockImplementation((url: string) => (url.includes('.hi.json') ? throwError(() => 'missing') : of({ title: 'general' })))
    const result: any = resolver.resolve(snapshot({ pageUrl: '/site/page/home' }))
    result.subscribe((res: any) => {
      expect(res).toEqual({ data: { title: 'general' }, error: null })
      done()
    })
  })

  it('does not request a localised document for en-US', done => {
    build('en-US')
    http.get.mockReturnValue(of({ title: 'general' }))
    const result: any = resolver.resolve(snapshot({ pageUrl: '/site/page/home' }))
    result.subscribe(() => {
      expect(http.get).toHaveBeenCalledTimes(1)
      done()
    })
  })

  describe('content-backed pages (lex_auth_ ids)', () => {
    const lexRoute = () => snapshot({ pageUrl: '/site/page/lex_auth_123' })

    it('sets the S3 cookie then serves the artifact payload', done => {
      // Both calls go through http.post, so branch on the URL: the first is the
      // cookie hop, the second is the content lookup that carries the artifactUrl.
      http.post.mockImplementation((url: string) => (url.includes('setCookie') ? of(true) : of({ status: 'Live', artifactUrl: 'a.json' })))
      http.get.mockReturnValue(of({ title: 'artifact' }))
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(http.post).toHaveBeenCalledWith('/apis/protected/v8/content/setCookie', {
          contentId: 'lex_auth_123',
        })
        expect(res).toEqual({ data: { title: 'artifact' }, error: null })
        done()
      })
    })

    it('returns NoContent when the content is Expired', done => {
      http.post.mockImplementation((url: string) =>
        url.includes('setCookie') ? of(true) : of({ status: 'Expired', artifactUrl: 'a.json' }),
      )
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(res).toEqual({ data: null, error: 'NoContent' })
        done()
      })
    })

    it('returns NoContent when the content is Deleted', done => {
      http.post.mockImplementation((url: string) =>
        url.includes('setCookie') ? of(true) : of({ status: 'Deleted', artifactUrl: 'a.json' }),
      )
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(res).toEqual({ data: null, error: 'NoContent' })
        done()
      })
    })

    it('returns NoContent when there is no artifactUrl', done => {
      http.post.mockImplementation((url: string) => (url.includes('setCookie') ? of(true) : of({ status: 'Live' })))
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(res).toEqual({ data: null, error: 'NoContent' })
        done()
      })
    })

    it('swallows a setCookie failure and still resolves', done => {
      http.post.mockImplementation((url: string) =>
        url.includes('setCookie') ? throwError(() => 'cookie down') : of({ status: 'Live', artifactUrl: 'a.json' }),
      )
      http.get.mockReturnValue(of({ title: 'artifact' }))
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(res).toEqual({ data: { title: 'artifact' }, error: null })
        done()
      })
    })

    it('reports an artifact fetch failure as an error payload', done => {
      http.post.mockImplementation((url: string) => (url.includes('setCookie') ? of(true) : of({ status: 'Live', artifactUrl: 'a.json' })))
      http.get.mockReturnValue(throwError(() => 'artifact down'))
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(res).toEqual({ data: null, error: 'artifact down' })
        done()
      })
    })

    it('reports a content lookup failure as an error payload', done => {
      http.post.mockImplementation((url: string) => (url.includes('setCookie') ? of(true) : throwError(() => 'content down')))
      const result: any = resolver.resolve(lexRoute())
      result.subscribe((res: any) => {
        expect(res).toEqual({ data: null, error: 'content down' })
        done()
      })
    })

    it('maps a known JSON_MAP alias onto its content id', done => {
      http.post.mockImplementation((url: string) => (url.includes('setCookie') ? of(true) : of({ status: 'Live', artifactUrl: 'a.json' })))
      http.get.mockReturnValue(of({ title: 'mapped' }))
      const result: any = resolver.resolve(snapshot({ pageUrl: '/site/page/pagename' }))
      result.subscribe(() => {
        expect(http.post).toHaveBeenCalledWith('/apis/protected/v8/content/setCookie', {
          contentId: 'lexid',
        })
        done()
      })
    })
  })
})
