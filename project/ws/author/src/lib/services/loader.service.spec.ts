import { LoaderService } from './loader.service'

describe('LoaderService', () => {
  let service: LoaderService

  beforeEach(() => (service = new LoaderService()))

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('starts with changeLoad emitting false', () => {
    expect(service.changeLoad.value).toBe(false)
  })

  it('emits the new value when changeLoad is pushed', () => {
    const seen: boolean[] = []
    service.changeLoad.subscribe(v => seen.push(v))
    service.changeLoad.next(true)
    expect(seen).toEqual([false, true])
  })

  it('currentState starts false and reflects changeLoadState', () => {
    const seen: boolean[] = []
    service.currentState.subscribe(v => seen.push(v))
    service.changeLoadState(true)
    service.changeLoadState(false)
    expect(seen).toEqual([false, true, false])
  })
})
