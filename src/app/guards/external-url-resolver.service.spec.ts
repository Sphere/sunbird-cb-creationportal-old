import { ActivatedRouteSnapshot } from '@angular/router'

import { ExternalUrlResolverService } from './external-url-resolver.service'

describe('ExternalUrlResolverService', () => {
  let service: ExternalUrlResolverService
  let openSpy: jest.SpyInstance

  beforeEach(() => {
    service = new ExternalUrlResolverService()
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
  })

  afterEach(() => {
    openSpy.mockRestore()
  })

  it('opens the external url in the same tab and blocks activation', done => {
    const route = { paramMap: { get: () => 'https://example.com' } } as unknown as ActivatedRouteSnapshot
    service.canActivate(route).subscribe(result => {
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_self')
      expect(result).toBe(false)
      done()
    })
  })
})
