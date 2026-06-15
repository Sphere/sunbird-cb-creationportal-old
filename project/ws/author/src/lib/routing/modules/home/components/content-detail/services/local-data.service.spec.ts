import { LocalDataService } from './local-data.service'

describe('LocalDataService', () => {
  let service: LocalDataService

  beforeEach(() => {
    service = new LocalDataService()
  })

  it('is created with an empty content title', () => {
    expect(service).toBeTruthy()
    expect(service.contentTitle.value).toBe('')
  })

  it('initData pushes the route data name', () => {
    service.initData({ name: 'My Course' } as any)
    expect(service.contentTitle.value).toBe('My Course')
  })

  it('initData pushes an empty string when data is missing', () => {
    service.initData(null as any)
    expect(service.contentTitle.value).toBe('')
  })
})
