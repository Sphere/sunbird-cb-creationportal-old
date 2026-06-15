import { of } from 'rxjs'

import { ValueService } from './value.service'

describe('ValueService', () => {
  let breakpointObserver: { observe: jest.Mock }
  let service: ValueService

  beforeEach(() => {
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: true, breakpoints: {} })) }
    service = new ValueService(breakpointObserver as any)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('exposes isXSmall$ mapped from the observer match state', done => {
    service.isXSmall$.subscribe(v => {
      expect(v).toBe(true)
      done()
    })
  })

  it('exposes isLtMedium$ mapped from the observer match state', done => {
    service.isLtMedium$.subscribe(v => {
      expect(v).toBe(true)
      done()
    })
  })
})
