import { RootService } from './root.service'

describe('RootService', () => {
  let service: RootService

  beforeEach(() => {
    service = new RootService()
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('starts with the navbar displayed', () => {
    expect(service.showNavbarDisplay$.value).toBe(true)
  })

  it('emits updated navbar visibility', () => {
    const seen: boolean[] = []
    service.showNavbarDisplay$.subscribe(v => seen.push(v))
    service.showNavbarDisplay$.next(false)
    expect(seen).toEqual([true, false])
  })
})
