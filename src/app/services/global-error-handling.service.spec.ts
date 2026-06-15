import { GlobalErrorHandlingService } from './global-error-handling.service'

describe('GlobalErrorHandlingService', () => {
  let service: GlobalErrorHandlingService
  let reloadMock: jest.Mock

  beforeEach(() => {
    service = new GlobalErrorHandlingService()
    reloadMock = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      configurable: true,
      writable: true,
    })
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('reloads the page on a ChunkLoadError', () => {
    service.handleError({ message: 'ChunkLoadError: failed to load chunk 3' })
    expect(reloadMock).toHaveBeenCalled()
  })

  it('rethrows any other error', () => {
    const error = { message: 'Some other failure' }
    expect(() => service.handleError(error)).toThrow()
    expect(reloadMock).not.toHaveBeenCalled()
  })
})
