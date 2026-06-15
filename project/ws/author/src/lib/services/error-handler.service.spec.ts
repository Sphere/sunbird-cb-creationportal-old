import { AuthoringErrorHandler } from './error-handler.service'
import { LoaderService } from './loader.service'

describe('AuthoringErrorHandler', () => {
  let loader: LoaderService
  let logger: { error: jest.Mock }
  let handler: AuthoringErrorHandler

  beforeEach(() => {
    loader = new LoaderService()
    logger = { error: jest.fn() }
    handler = new AuthoringErrorHandler(loader, logger as any)
  })

  it('is created', () => {
    expect(handler).toBeTruthy()
  })

  it('clears the loader and logs the error', () => {
    const loadSpy = jest.spyOn(loader.changeLoad, 'next')
    const error = new Error('boom')
    handler.handleError(error)
    expect(loadSpy).toHaveBeenCalledWith(false)
    expect(logger.error).toHaveBeenCalledWith(error)
  })
})
