import { of, throwError } from 'rxjs'

import { InitResolver } from './init-resolve.service'

/**
 * Wave 18 — the per-job loading branches of InitResolver: which configuration
 * files it fetches, how it maps each response onto AuthInitService, and the
 * error redirect.
 */
describe('InitResolver (configuration loading)', () => {
  let apiService: any
  let router: any
  let ckEditorInject: any
  let configurationsService: any
  let accessService: any
  let authInitService: any
  let zipJSInject: any
  let resolver: InitResolver

  /** The auth-config.json payload. */
  const config = () => ({
    optimizedWorkFlow: { a: 1 },
    workFlowTable: { b: 2 },
    ownerDetails: { c: 3 },
    permissionDetails: { d: 4 },
  })

  beforeEach(() => {
    apiService = { get: jest.fn() }
    router = { navigateByUrl: jest.fn() }
    ckEditorInject = { inject: jest.fn().mockReturnValue(of(true)) }
    configurationsService = { baseUrl: '/assets' }
    accessService = { hasRole: jest.fn().mockReturnValue(true) }
    authInitService = {
      workFlowTable: null,
      authConfig: null,
      ordinals: null,
      collectionConfig: null,
      creationEntity: new Map(),
    }
    zipJSInject = { inject: jest.fn().mockReturnValue(of(true)) }

    resolver = new InitResolver(apiService, router, ckEditorInject, configurationsService, accessService, authInitService, zipJSInject)
  })

  const route = (load?: string[]) => ({ data: load ? { load } : undefined }) as any

  /** Answers each configuration request in the order the resolver issues them. */
  const answerWith = (...responses: any[]) => {
    let call = 0
    apiService.get.mockImplementation(() => {
      const response = responses[call]
      call = call + 1
      return of(response)
    })
  }

  it('loads only the workflow configuration by default', done => {
    answerWith(config())
    resolver.resolve(route()).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledTimes(1)
      expect(apiService.get).toHaveBeenCalledWith('/assets/feature/auth-config.json')
      expect(authInitService.workFlowTable).toEqual({ b: 2 })
      expect(authInitService.optimizedWorkFlow).toEqual({ a: 1 })
      expect(authInitService.ownerDetails).toEqual({ c: 3 })
      expect(authInitService.permissionDetails).toEqual({ d: 4 })
      done()
    })
  })

  it('skips the workflow configuration once it is already loaded', done => {
    authInitService.workFlowTable = { already: true }
    resolver.resolve(route()).subscribe(() => {
      expect(apiService.get).not.toHaveBeenCalled()
      done()
    })
  })

  it('loads the metadata form when asked', done => {
    answerWith(config(), { name: {} })
    resolver.resolve(route(['meta'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith('/assets/feature/auth-meta-form.json')
      expect(authInitService.authConfig).toEqual({ name: {} })
      done()
    })
  })

  it('skips the metadata form once it is already loaded', done => {
    authInitService.authConfig = { already: true }
    answerWith(config())
    resolver.resolve(route(['meta'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledTimes(1)
      done()
    })
  })

  it('filters the ordinal subtitles down to the supported locales', done => {
    answerWith(config(), { subTitles: [{ srclang: 'en' }, { srclang: 'zz' }] })
    resolver.resolve(route(['ordinals'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith('/assets/feature/ordinals.json')
      expect(authInitService.ordinals.subTitles).toEqual([{ srclang: 'en' }])
      done()
    })
  })

  it('prefers an explicit locale list over the subtitles', done => {
    answerWith(config(), { locale: [{ srclang: 'hi' }], subTitles: [{ srclang: 'en' }] })
    resolver.resolve(route(['ordinals'])).subscribe(() => {
      expect(authInitService.ordinals.subTitles).toEqual([{ srclang: 'hi' }])
      done()
    })
  })

  it('skips the ordinals once they are already loaded', done => {
    authInitService.ordinals = { already: true }
    answerWith(config())
    resolver.resolve(route(['ordinals'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledTimes(1)
      done()
    })
  })

  it('registers each creation entity the user may use', done => {
    answerWith(config(), [
      { id: 'course', enabled: true, hasRole: ['content_creator'] },
      { id: 'resource', enabled: false, hasRole: ['content_creator'] },
    ])
    resolver.resolve(route(['create'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith('/assets/feature/auth-create.json')
      expect(authInitService.creationEntity.get('course').enabled).toBe(true)
      expect(authInitService.creationEntity.get('resource').enabled).toBe(false)
      done()
    })
  })

  it('disables a creation entity the user has no role for', done => {
    accessService.hasRole.mockReturnValue(false)
    answerWith(config(), [{ id: 'course', enabled: true, hasRole: ['admin'] }])
    resolver.resolve(route(['create'])).subscribe(() => {
      expect(authInitService.creationEntity.get('course').enabled).toBe(false)
      done()
    })
  })

  it('skips the creation entities once they are already loaded', done => {
    authInitService.creationEntity = new Map([['course', {}]])
    answerWith(config())
    resolver.resolve(route(['create'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledTimes(1)
      done()
    })
  })

  it('loads the collection editor configuration when asked', done => {
    answerWith(config(), { maxDepth: 4 })
    resolver.resolve(route(['collection'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith('/assets/feature/auth-collection-editor.json')
      expect(authInitService.collectionConfig).toEqual({ maxDepth: 4 })
      done()
    })
  })

  it('skips the collection configuration once it is already loaded', done => {
    authInitService.collectionConfig = { already: true }
    answerWith(config())
    resolver.resolve(route(['collection'])).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledTimes(1)
      done()
    })
  })

  it('injects the editors when asked', done => {
    answerWith(config())
    resolver.resolve(route(['ckeditor'])).subscribe(() => {
      expect(ckEditorInject.inject).toHaveBeenCalled()
      expect(zipJSInject.inject).toHaveBeenCalled()
      done()
    })
  })

  it('redirects to the error page when a configuration fails to load', done => {
    apiService.get.mockReturnValue(throwError(() => new Error('down')))
    resolver.resolve(route()).subscribe(() => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
      done()
    })
  })
})
