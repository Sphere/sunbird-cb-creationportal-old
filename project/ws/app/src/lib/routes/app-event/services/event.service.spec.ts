import { of } from 'rxjs'

import { EventService } from './event.service'

describe('EventService', () => {
  let http: { get: jest.Mock }
  let service: EventService

  beforeEach(() => {
    http = { get: jest.fn().mockReturnValue(of({ result: 'ok' })) }
    service = new EventService(http as any)
  })

  it('is created with the banner enabled', () => {
    expect(service).toBeTruthy()
    expect(service.bannerisEnabled.value).toBe(true)
  })

  it('requests the external event endpoint', done => {
    service.getEventData().subscribe(res => {
      expect(res).toEqual({ result: 'ok' })
      done()
    })
    expect(http.get).toHaveBeenCalledWith('/apis/protected/v8/event-external/')
  })
})
