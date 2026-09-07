import { PlayerStateService, IPlayerSateStore } from './player-state.service'
import { take } from 'rxjs/operators'

describe('PlayerStateService', () => {
  let svc: PlayerStateService

  beforeEach(() => {
    svc = new PlayerStateService()
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('setState emits the mapped store shape on playerState', done => {
    svc.playerState.pipe(take(1)).subscribe((s: IPlayerSateStore) => {
      expect(s).toEqual({ tocAvailable: false, nextResource: 'n1', prevResource: 'p1' })
      done()
    })
    svc.setState({ isValid: false, prev: 'p1', next: 'n1' })
  })

  it('setState defaults isValid to true and next to null', done => {
    svc.playerState.pipe(take(1)).subscribe((s: IPlayerSateStore) => {
      expect(s.tocAvailable).toBe(true)
      expect(s.nextResource).toBeNull()
      expect(s.prevResource).toBe('p2')
      done()
    })
    svc.setState({ isValid: true, prev: 'p2' } as any)
  })

  it('getNextResource returns the next resource from the latest state (ReplaySubject replay)', () => {
    svc.setState({ isValid: true, prev: null, next: 'next-res' })
    expect(svc.getNextResource()).toBe('next-res')
  })

  it('getNextResource returns empty string when no next resource set', () => {
    svc.setState({ isValid: true, prev: null, next: null })
    expect(svc.getNextResource()).toBe('')
  })

  it('getPrevResource updates trigger$ from the state prevResource', () => {
    svc.setState({ isValid: true, prev: 'prev-res', next: null })
    svc.getPrevResource()
    expect(svc.trigger$.getValue()).toBe('prev-res')
  })
})
