import { HttpErrorResponse } from '@angular/common/http'
import { EMPTY, Observable, defer, expand, filter, fromEvent, of, retry, startWith, switchMap, take, throwError, timer } from 'rxjs'
import { AI_REVIEW_FINAL_STATUSES, IAiReview } from '../models/ai-review.model'

/** Poll every 3 s while a review moves; every 10 s while it waits behind others. */
export const POLL_FAST_MS = 3000
export const POLL_SLOW_MS = 10000

/** How long to wait before the next status read. */
export function nextPollDelay(review: Pick<IAiReview, 'status' | 'queuePosition'>): number {
  return review.status === 'queued' && review.queuePosition > 2 ? POLL_SLOW_MS : POLL_FAST_MS
}

/** What a review is made of, in its wording: a course's resources, or uploaded files. */
export type ReviewUnit = 'resources' | 'files'

/** A review's (or an item's) status in words. */
export function statusLabel(status: string, unit: ReviewUnit = 'resources'): string {
  const labels: Record<string, string> = {
    queued: 'Waiting to start',
    running: 'Reviewing',
    done: 'Done',
    partial: `Done — some ${unit} could not be reviewed`,
    failed: 'Failed',
    cancelled: 'Cancelled',
    skipped: 'Not included',
  }
  return labels[status] || status
}

/** Emits once, as soon as the page is visible (immediately if it already is). */
export function whenVisible(doc: Document): Observable<unknown> {
  return fromEvent(doc, 'visibilitychange').pipe(
    startWith(null),
    filter(() => !doc.hidden),
    take(1),
  )
}

/** Emits once, as soon as the browser is online (immediately if it is). */
export function whenOnline(doc: Document, isOnline: () => boolean): Observable<unknown> {
  const win = doc.defaultView
  if (!win || isOnline()) {
    return of(null)
  }
  return fromEvent(win, 'online').pipe(take(1))
}

/**
 * Whether a failed request may succeed if sent again: no connection, a timeout, a rate limit or
 * a server error. A 403 or 404 will answer the same every time, so it is not asked again.
 */
export function isTransient(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) {
    return true
  }
  return err.status === 0 || err.status === 408 || err.status === 429 || err.status >= 500
}

/**
 * Whether a request may have done its work even though it failed: no answer arrived (the
 * connection dropped, a gateway timed out) or the server failed. A refusal (4xx, a 429 limit
 * included) is clear: nothing was done.
 */
export function isUnclear(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse)) {
    return true
  }
  return err.status === 0 || err.status >= 500
}

/** Delay between reads of a review that failed for a passing reason. */
export const POLL_RETRY_MS = 2000

/**
 * Reads a review now, then again after each delay, until it reaches a final state. Paused
 * while the tab is hidden (a forgotten tab costs nothing) and while the browser is offline.
 * A read that failed for a passing reason is retried a few times before giving up: one dropped
 * request is not a lost review. A review the user may not see, or that is gone, stops at once.
 */
export function watchReview(read: () => Observable<IAiReview>, doc: Document, isOnline: () => boolean): Observable<IAiReview> {
  const once = defer(read).pipe(retry({ count: 3, delay: err => (isTransient(err) ? timer(POLL_RETRY_MS) : throwError(() => err)) }))
  return once.pipe(
    expand(review =>
      AI_REVIEW_FINAL_STATUSES.has(review.status)
        ? EMPTY
        : timer(nextPollDelay(review)).pipe(
            switchMap(() => whenVisible(doc)),
            switchMap(() => whenOnline(doc, isOnline)),
            switchMap(() => once),
          ),
    ),
  )
}
