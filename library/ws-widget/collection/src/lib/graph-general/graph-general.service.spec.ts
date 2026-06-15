import { GraphGeneralService } from './graph-general.service'

describe('GraphGeneralService', () => {
  let service: GraphGeneralService

  beforeEach(() => {
    service = new GraphGeneralService()
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('emits the filter event through the subject', done => {
    const payload = { filterName: 'status', filterType: 'live' }
    service.filterEventChangeSubject.subscribe(value => {
      expect(value).toEqual(payload)
      done()
    })
    service.updateFilterEvent(payload)
  })
})
