import { EventService } from './event.service'
import { WsEvents } from './event.model'

describe('EventService', () => {
  let svc: EventService

  beforeEach(() => {
    svc = new EventService()
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('dispatchEvent emits the event on events$', done => {
    const evt: WsEvents.IWsEvents<any> = {
      eventType: WsEvents.WsEventType.Telemetry,
      eventLogLevel: WsEvents.WsEventLogLevel.Info,
      data: { foo: 'bar' },
      from: 'unit',
      to: 'Telemetry',
    }
    svc.events$.subscribe(received => {
      expect(received).toEqual(evt)
      done()
    })
    svc.dispatchEvent(evt)
  })

  it('raiseInteractTelemetry emits a well-formed interact telemetry event', done => {
    svc.events$.subscribe(received => {
      expect(received.eventType).toBe(WsEvents.WsEventType.Telemetry)
      expect(received.to).toBe('Telemetry')
      expect(received.from).toBe('home')
      expect(received.data).toEqual({
        type: 'click',
        subType: 'btn',
        object: { id: 1 },
        eventSubType: WsEvents.EnumTelemetrySubType.Interact,
      })
      done()
    })
    svc.raiseInteractTelemetry('click', 'btn', { id: 1 }, 'home')
  })

  it('raiseInteractTelemetry defaults "from" to empty string when omitted', done => {
    svc.events$.subscribe(received => {
      expect(received.from).toBe('')
      done()
    })
    svc.raiseInteractTelemetry('click', undefined, {})
  })
})
