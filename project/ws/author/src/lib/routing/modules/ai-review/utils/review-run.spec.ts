import { Observable, of, throwError } from 'rxjs'
import { IAiReview } from '../models/ai-review.model'
import { POLL_FAST_MS, POLL_SLOW_MS, nextPollDelay, statusLabel, watchReview } from './review-run'

const at = (status: IAiReview['status'], queuePosition = 0): IAiReview => ({ id: 'r1', status, queuePosition }) as IAiReview

describe('review run', () => {
  let hidden: boolean

  beforeEach(() => {
    jest.useFakeTimers()
    hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  })

  afterEach(() => jest.useRealTimers())

  it('words a status for a course or for files', () => {
    expect(statusLabel('partial')).toBe('Done — some resources could not be reviewed')
    expect(statusLabel('partial', 'files')).toBe('Done — some files could not be reviewed')
    expect(statusLabel('queued', 'files')).toBe('Waiting to start')
    expect(statusLabel('odd')).toBe('odd')
  })

  it('polls slower only deep in the queue', () => {
    expect(nextPollDelay(at('queued', 5))).toBe(POLL_SLOW_MS)
    expect(nextPollDelay(at('queued', 1))).toBe(POLL_FAST_MS)
    expect(nextPollDelay(at('running'))).toBe(POLL_FAST_MS)
  })

  it('reads until the review is final, then stops', () => {
    const reads = [at('queued'), at('running'), at('done')]
    const read = jest.fn(() => of(reads.shift() as IAiReview))
    const seen: string[] = []
    let completed = false
    watchReview(read, document, () => true).subscribe({ next: r => seen.push(r.status), complete: () => (completed = true) })
    jest.advanceTimersByTime(POLL_FAST_MS * 3)
    expect(seen).toEqual(['queued', 'running', 'done'])
    expect(completed).toBe(true)
    expect(read).toHaveBeenCalledTimes(3)
  })

  it('waits while the tab is hidden', () => {
    const read = jest.fn(() => of(at('running')))
    const sub = watchReview(read, document, () => true).subscribe()
    hidden = true
    jest.advanceTimersByTime(POLL_FAST_MS * 3)
    expect(read).toHaveBeenCalledTimes(1)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    expect(read).toHaveBeenCalledTimes(2)
    sub.unsubscribe()
  })

  it('retries a dropped read before giving up', () => {
    let calls = 0
    const read = (): Observable<IAiReview> => (++calls < 3 ? throwError(() => new Error('dropped')) : of(at('done')))
    const seen: string[] = []
    watchReview(read, document, () => true).subscribe(r => seen.push(r.status))
    jest.advanceTimersByTime(2000 * 3)
    expect(seen).toEqual(['done'])
  })
})
