import { of } from 'rxjs'

import { ErrorResolverService } from './error-resolver.service'

describe('ErrorResolverService', () => {
  let http: { get: jest.Mock }
  let service: ErrorResolverService

  beforeEach(() => {
    http = { get: jest.fn().mockReturnValue(of({ errorType: 'notFound' })) }
    service = new ErrorResolverService(http as any)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('fetches the error config from the given path', async () => {
    const config = await service.getErrorConfig('/assets/error.json')
    expect(http.get).toHaveBeenCalledWith('/assets/error.json')
    expect(config).toEqual({ errorType: 'notFound' })
  })
})
