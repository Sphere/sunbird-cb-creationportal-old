import { AppTocService } from './app-toc.service'

describe('AppTocService (author content-detail)', () => {
  let service: AppTocService

  beforeEach(() => {
    service = new AppTocService()
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('exposes an empty data object', () => {
    expect(service.data).toEqual({})
  })
})
