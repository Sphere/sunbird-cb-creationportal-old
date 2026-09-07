import { InitResolver } from './init-resolve.service'
import { of, throwError } from 'rxjs'

describe('InitResolver', () => {
  let apiService: { get: jest.Mock }
  let router: { navigateByUrl: jest.Mock }
  let ckEditor: { inject: jest.Mock }
  let zipJs: { inject: jest.Mock }
  let config: any
  let accessService: any
  let authInit: any
  let svc: InitResolver

  beforeEach(() => {
    apiService = { get: jest.fn(() => of({})) }
    router = { navigateByUrl: jest.fn() }
    ckEditor = { inject: jest.fn(() => of(true)) }
    zipJs = { inject: jest.fn(() => of(true)) }
    config = { baseUrl: '/base' }
    accessService = { hasRole: jest.fn(() => true) }
    authInit = {
      workFlowTable: 'set',
      authConfig: null,
      ordinals: null,
      creationEntity: new Map(),
      collectionConfig: null,
    }
    svc = new InitResolver(apiService as any, router as any, ckEditor as any, config, accessService, authInit, zipJs as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('resolves with no extra calls when nothing needs loading', done => {
    svc.resolve({ data: { load: [] } } as any).subscribe(v => {
      expect(Array.isArray(v)).toBe(true)
      expect(apiService.get).not.toHaveBeenCalled()
      done()
    })
  })

  it('loads + applies auth config when workFlowTable is not yet set', done => {
    authInit.workFlowTable = null
    apiService.get.mockReturnValue(of({ optimizedWorkFlow: 'ow', workFlowTable: 'wt', ownerDetails: 'od', permissionDetails: 'pd' }))
    svc.resolve({ data: { load: [] } } as any).subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith('/base/feature/auth-config.json')
      expect(authInit.workFlowTable).toBe('wt')
      expect(authInit.optimizedWorkFlow).toBe('ow')
      expect(authInit.ownerDetails).toBe('od')
      done()
    })
  })

  it('navigates to error page when a load call fails', done => {
    authInit.workFlowTable = null
    apiService.get.mockReturnValue(throwError(() => 'boom'))
    svc.resolve({ data: { load: [] } } as any).subscribe(() => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
      done()
    })
  })
})
