import { NavigationExternalService } from './navigation-external.service'

describe('NavigationExternalService', () => {
  let router: { url: string; navigate: jest.Mock }
  let service: NavigationExternalService

  beforeEach(() => {
    router = { url: '/home?ref=old&foo=bar', navigate: jest.fn() }
    service = new NavigationExternalService(router as any)
  })

  it('init increments the internal counter', () => {
    const before = service.dummy
    service.init()
    expect(service.dummy).toBe(before + 1)
  })

  it('navigateTo routes to the url and preserves supplied params', () => {
    service.navigateTo('/details', { foo: 'bar', ref: 'custom' })

    expect(router.navigate).toHaveBeenCalledWith(['/details'], {
      queryParams: { foo: 'bar', ref: encodeURIComponent('custom') },
    })
  })

  it('navigateTo derives ref from the current router url when none is given', () => {
    service.navigateTo('/details')

    const [, extras] = router.navigate.mock.calls[0]
    // ref is the current url with any existing ref=... stripped, url-encoded.
    expect(extras.queryParams.ref).toBe(encodeURIComponent('/home?foo=bar'))
  })
})
