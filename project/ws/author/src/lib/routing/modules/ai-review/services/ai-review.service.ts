import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, map } from 'rxjs'
import {
  IAiReview,
  IAiReviewCreateResult,
  IAiReviewErrorBody,
  IAiReviewHistoryEntry,
  IAiReviewOptions,
  IAiReviewPreview,
  IAiReviewResourceSize,
  IAiReviewRoleCheck,
  IAiReviewReuse,
} from '../models/ai-review.model'

/**
 * The course reviewer, in the portal's own terms. A path rather than a URL, so the session
 * cookie goes with it; uiproxy turns that into the user id the service checks the course
 * against. Matches the /apis/protected/v8 convention every other authoring call uses.
 */
export const AI_REVIEW_API_BASE = '/apis/protected/v8/courseReview'

const enc = encodeURIComponent

@Injectable()
export class AiReviewService {
  private readonly http = inject(HttpClient)

  /** The setup screen: resources, competencies, an estimate, and any review already running. */
  preview(courseId: string): Observable<IAiReviewPreview> {
    return this.http.get<IAiReviewPreview>(`${AI_REVIEW_API_BASE}/courses/${enc(courseId)}/preview`)
  }

  /** The FRAC role check for these settings: the position's activities, or why none (nothing is spent). */
  fracRole(courseId: string, options: IAiReviewOptions): Observable<IAiReviewRoleCheck> {
    return this.http
      .post<IAiReviewRoleCheck>(`${AI_REVIEW_API_BASE}/courses/${enc(courseId)}/frac`, { options })
      .pipe(map(res => ({ role: res?.role ?? null, roleNote: res?.roleNote ?? null })))
  }

  /** The pages of each PDF and the questions of each quiz or assessment (nothing is spent). */
  measure(courseId: string): Observable<IAiReviewResourceSize[]> {
    return this.http
      .get<{ resources: IAiReviewResourceSize[] }>(`${AI_REVIEW_API_BASE}/courses/${enc(courseId)}/measure`)
      .pipe(map(res => res.resources || []))
  }

  /** Which resources would reuse an earlier result with these settings (nothing is spent). */
  reuse(courseId: string, options: IAiReviewOptions): Observable<IAiReviewReuse[]> {
    return this.http
      .post<{ reused: IAiReviewReuse[] }>(`${AI_REVIEW_API_BASE}/courses/${enc(courseId)}/reuse`, { options })
      .pipe(map(res => res.reused || []))
  }

  /** Starts a review, or joins the one already running on this course. */
  start(courseId: string, options: IAiReviewOptions): Observable<IAiReviewCreateResult> {
    return this.http.post<IAiReviewCreateResult>(`${AI_REVIEW_API_BASE}/reviews`, { courseId, options })
  }

  get(reviewId: string): Observable<IAiReview> {
    return this.http.get<IAiReview>(`${AI_REVIEW_API_BASE}/reviews/${enc(reviewId)}`)
  }

  history(courseId: string): Observable<IAiReviewHistoryEntry[]> {
    return this.http
      .get<{ reviews: IAiReviewHistoryEntry[] }>(`${AI_REVIEW_API_BASE}/reviews`, { params: { courseId } })
      .pipe(map(res => res.reviews || []))
  }

  cancel(reviewId: string): Observable<{ cancelled: boolean }> {
    return this.http.delete<{ cancelled: boolean }>(`${AI_REVIEW_API_BASE}/reviews/${enc(reviewId)}`)
  }

  /**
   * The message to show for a failed call. The service words its refusals for the user
   * (limits, budget, no competency), so its message is used as-is when there is one.
   */
  static errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as IAiReviewErrorBody | null
      const message = body && typeof body === 'object' && body.error ? body.error.message : undefined
      if (message) {
        return message
      }
      if (error.status === 0) {
        return typeof navigator !== 'undefined' && navigator.onLine === false
          ? "You're offline. Reconnect to the internet and try again."
          : 'Could not reach the AI review service. Check your connection and try again.'
      }
      if (error.status === 403) {
        return "Only this course's creator, reviewers and publishers can run an AI review of it."
      }
      if (error.status === 404) {
        return 'This was not found. It may have been removed.'
      }
      if (error.status === 408 || error.status === 504) {
        return 'The AI review service took too long to answer. Try again in a moment.'
      }
      if (error.status === 502 || error.status === 503) {
        return 'The AI review service is not available right now. Try again in a minute.'
      }
    }
    return fallback
  }

  /** The service's error code, e.g. `TOO_MANY_ACTIVE`, or '' when there is none. */
  static errorCode(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as IAiReviewErrorBody | null
      return (body && typeof body === 'object' && body.error && body.error.code) || ''
    }
    return ''
  }
}
