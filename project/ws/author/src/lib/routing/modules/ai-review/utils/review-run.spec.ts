import { HttpErrorResponse } from '@angular/common/http'
import { Observable, of, throwError } from 'rxjs'
import { IAiReview } from '../models/ai-review.model'
import { POLL_FAST_MS, POLL_RETRY_MS, POLL_SLOW_MS, isTransient, isUnclear, nextPollDelay, statusLabel, watchReview } from './review-run'

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

  it('tells a failure that may pass from one that will not', () => {
    expect(isTransient(new HttpErrorResponse({ status: 0 }))).toBe(true)
    expect(isTransient(new HttpErrorResponse({ status: 429 }))).toBe(true)
    expect(isTransient(new HttpErrorResponse({ status: 504 }))).toBe(true)
    expect(isTransient(new HttpErrorResponse({ status: 403 }))).toBe(false)
    expect(isTransient(new HttpErrorResponse({ status: 404 }))).toBe(false)
    expect(isTransient(new Error('timeout'))).toBe(true)
  })

  it('counts only no answer or a server failure as unclear, never a refusal', () => {
    expect(isUnclear(new HttpErrorResponse({ status: 0 }))).toBe(true)
    expect(isUnclear(new HttpErrorResponse({ status: 502 }))).toBe(true)
    expect(isUnclear(new HttpErrorResponse({ status: 429 }))).toBe(false)
    expect(isUnclear(new HttpErrorResponse({ status: 400 }))).toBe(false)
  })

  it("stops at once for a review that is gone or not the user's", () => {
    const read = jest.fn((): Observable<IAiReview> => throwError(() => new HttpErrorResponse({ status: 403 })))
    let failed: unknown = null
    watchReview(read, document, () => true).subscribe({ error: e => (failed = e) })
    jest.advanceTimersByTime(POLL_RETRY_MS * 4)
    expect(read).toHaveBeenCalledTimes(1)
    expect((failed as HttpErrorResponse).status).toBe(403)
  })
})
