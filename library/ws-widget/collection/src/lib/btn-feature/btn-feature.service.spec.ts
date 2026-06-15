import { of } from 'rxjs'

import { BtnFeatureService } from './btn-feature.service'

describe('BtnFeatureService', () => {
  let http: { get: jest.Mock }
  let service: BtnFeatureService

  beforeEach(() => {
    http = { get: jest.fn().mockReturnValue(of(7)) }
    service = new BtnFeatureService(http as any)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('requests the badge count from the given endpoint', async () => {
    const count = await service.getBadgeCount('/apis/badge')
    expect(http.get).toHaveBeenCalledWith('/apis/badge')
    expect(count).toBe(7)
  })
})
