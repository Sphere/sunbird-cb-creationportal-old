import { ErrorResolverComponent } from './error-resolver.component'
import { NsError } from './error-resolver.model'

// ngOnInit() calls the async initialize() without awaiting it, so flush the
// microtask/timer queue to let the getErrorConfig() promise settle.
const flush = () => new Promise(resolve => setImmediate(resolve))

describe('ErrorResolverComponent', () => {
  const makeErrorConfig = (): NsError.IErrorConfig => ({
    accessForbidden: { messageA: 'af' } as any,
    contentUnavailable: { messageA: 'cu' } as any,
    featureDisabled: { messageA: 'fd' } as any,
    featureUnavailable: { messageA: 'fu' } as any,
    internalServer: { messageA: 'is' } as any,
    notFound: { messageA: 'nf' } as any,
    serviceUnavailable: { messageA: 'su' } as any,
    somethingsWrong: { messageA: 'sw' } as any,
  })

  const makeDeps = (opts: { instanceConfig?: any; errorConfig?: NsError.IErrorConfig; routeErrorType?: NsError.TErrorType }) => {
    const configService: any = {
      instanceConfig: opts.instanceConfig,
    }
    const errorResolverSvc: any = {
      getErrorConfig: jest.fn().mockResolvedValue(opts.errorConfig || makeErrorConfig()),
    }
    const activateRoute: any = {
      snapshot: { data: { errorType: opts.routeErrorType } },
    }
    return { configService, errorResolverSvc, activateRoute }
  }

  it('should construct with the error type map', () => {
    const { configService, errorResolverSvc, activateRoute } = makeDeps({})
    const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
    expect(comp.errorType.notFound).toBe('notFound')
    expect(comp.errorType.accessForbidden).toBe('accessForbidden')
  })

  describe('ngOnInit', () => {
    it('should derive widgetData from route when widgetData is unset', async () => {
      const instanceConfig = { defaultFeatureConfigs: { error: '/error/path' } }
      const errorConfig = makeErrorConfig()
      const { configService, errorResolverSvc, activateRoute } = makeDeps({
        instanceConfig,
        errorConfig,
        routeErrorType: 'notFound',
      })
      const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
      // widgetData starts undefined (declared but not initialised)
      await comp.ngOnInit()
      await flush()
      expect(comp.widgetData.errorType).toBe('notFound')
      expect(errorResolverSvc.getErrorConfig).toHaveBeenCalledWith('/error/path')
      expect(comp.widgetData.errorData).toBe(errorConfig.notFound)
    })

    it('should use existing widgetData and resolve errorData', async () => {
      const instanceConfig = { defaultFeatureConfigs: { error: '/default' } }
      const errorConfig = makeErrorConfig()
      const { configService, errorResolverSvc, activateRoute } = makeDeps({
        instanceConfig,
        errorConfig,
      })
      const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
      comp.widgetData = { errorType: 'accessForbidden' }
      await comp.ngOnInit()
      await flush()
      expect(errorResolverSvc.getErrorConfig).toHaveBeenCalledWith('/default')
      expect(comp.widgetData.errorData).toBe(errorConfig.accessForbidden)
    })

    it('should prefer errorDataPath over default config path', async () => {
      const instanceConfig = { defaultFeatureConfigs: { error: '/default' } }
      const errorConfig = makeErrorConfig()
      const { configService, errorResolverSvc, activateRoute } = makeDeps({
        instanceConfig,
        errorConfig,
      })
      const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
      comp.widgetData = { errorType: 'internalServer', errorDataPath: '/custom' }
      await comp.ngOnInit()
      await flush()
      expect(errorResolverSvc.getErrorConfig).toHaveBeenCalledWith('/custom')
      expect(comp.widgetData.errorData).toBe(errorConfig.internalServer)
    })

    it('should not fetch config when errorData already present', async () => {
      const instanceConfig = { defaultFeatureConfigs: { error: '/default' } }
      const { configService, errorResolverSvc, activateRoute } = makeDeps({ instanceConfig })
      const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
      const existing = { messageA: 'existing' } as any
      comp.widgetData = { errorType: 'notFound', errorData: existing }
      await comp.ngOnInit()
      await flush()
      expect(errorResolverSvc.getErrorConfig).not.toHaveBeenCalled()
      expect(comp.widgetData.errorData).toBe(existing)
    })

    it('should not fetch config when instanceConfig is missing', async () => {
      const { configService, errorResolverSvc, activateRoute } = makeDeps({
        instanceConfig: undefined,
      })
      const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
      comp.widgetData = { errorType: 'notFound' }
      await comp.ngOnInit()
      await flush()
      expect(errorResolverSvc.getErrorConfig).not.toHaveBeenCalled()
      expect(comp.widgetData.errorData).toBeUndefined()
    })

    it.each<NsError.TErrorType>([
      'accessForbidden',
      'contentUnavailable',
      'featureDisabled',
      'featureUnavailable',
      'internalServer',
      'notFound',
      'serviceUnavailable',
      'somethingsWrong',
    ])('should map errorData for %s', async errorType => {
      const instanceConfig = { defaultFeatureConfigs: { error: '/default' } }
      const errorConfig = makeErrorConfig()
      const { configService, errorResolverSvc, activateRoute } = makeDeps({
        instanceConfig,
        errorConfig,
      })
      const comp = new ErrorResolverComponent(configService, errorResolverSvc, activateRoute)
      comp.widgetData = { errorType }
      await comp.ngOnInit()
      await flush()
      expect(comp.widgetData.errorData).toBe((errorConfig as any)[errorType])
    })
  })
})
