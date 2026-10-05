import { appInitializer } from './app-initializer'

describe('appInitializer', () => {
  let initSvc: { init: jest.Mock }
  let logger: { info: jest.Mock; error: jest.Mock }
  let downtimeSvc: { load: jest.Mock; isBlocking: jest.Mock; markAppStarted: jest.Mock }

  beforeEach(() => {
    initSvc = { init: jest.fn().mockResolvedValue(true) }
    logger = { info: jest.fn(), error: jest.fn() }
    downtimeSvc = { load: jest.fn().mockResolvedValue({}), isBlocking: jest.fn().mockReturnValue(false), markAppStarted: jest.fn() }
  })

  const run = () => appInitializer(initSvc as any, logger as any, downtimeSvc as any)()

  it('reads the downtime config before starting the app', async () => {
    const order: string[] = []
    downtimeSvc.load.mockImplementation(async () => order.push('downtime'))
    initSvc.init.mockImplementation(async () => order.push('init'))
    await run()
    expect(order).toEqual(['downtime', 'init'])
    expect(downtimeSvc.markAppStarted).toHaveBeenCalled()
  })

  it('skips start-up, and so the sign-in, during a full downtime', async () => {
    downtimeSvc.isBlocking.mockReturnValue(true)
    await run()
    expect(initSvc.init).not.toHaveBeenCalled()
    expect(downtimeSvc.markAppStarted).not.toHaveBeenCalled()
    expect(logger.info).toHaveBeenCalled()
  })

  it('still lets the app load when start-up fails', async () => {
    initSvc.init.mockRejectedValue(new Error('boom'))
    await expect(run()).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalled()
  })
})
