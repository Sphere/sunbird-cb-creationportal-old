import { LoggerService } from './logger.service'

describe('LoggerService', () => {
  const makeConfig = (isProduction: boolean) => ({ isProduction }) as any

  it('should be created', () => {
    expect(new LoggerService(makeConfig(false))).toBeTruthy()
  })

  it('error getter always returns console.error', () => {
    const svc = new LoggerService(makeConfig(true))
    expect(svc.error).toBe(console.error)
  })

  it('info/log/warn return real console fns when NOT production', () => {
    const svc = new LoggerService(makeConfig(false))
    expect(svc.info).toBe(console.info)
    expect(svc.log).toBe(console.log)
    expect(svc.warn).toBe(console.warn)
  })

  it('info/log/warn return a no-op (not console fn) in production', () => {
    const svc = new LoggerService(makeConfig(true))
    expect(svc.info).not.toBe(console.info)
    expect(svc.log).not.toBe(console.log)
    expect(svc.warn).not.toBe(console.warn)
    // no-op should be callable without side effects
    expect(() => svc.info('x')).not.toThrow()
  })

  it('removeConsoleAccess() is a no-op in production', () => {
    const svc = new LoggerService(makeConfig(true))
    const warn = console.warn
    svc.removeConsoleAccess()
    expect(console.warn).toBe(warn)
  })

  it('removeConsoleAccess() replaces console.warn/info/error with throwing fns when NOT production', () => {
    const orig = { warn: console.warn, info: console.info, error: console.error }
    try {
      const svc = new LoggerService(makeConfig(false))
      svc.removeConsoleAccess()
      expect(() => (console.warn as any)()).toThrow('Console Functions Usage Are Not Allowed.')
      expect(() => (console.info as any)()).toThrow()
      expect(() => (console.error as any)()).toThrow()
    } finally {
      console.warn = orig.warn
      console.info = orig.info
      console.error = orig.error
    }
  })
})
