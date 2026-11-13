import { HttpBackend, HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable, filter, map } from 'rxjs'
import {
  AiReviewUploadKind,
  IAiReview,
  IAiReviewCheckedUpload,
  IAiReviewCreateResult,
  IAiReviewErrorBody,
  IAiReviewHistoryEntry,
  IAiReviewPastReview,
  IAiReviewOptions,
  IAiReviewPreview,
  IAiReviewResourceSize,
  IAiReviewRoleCheck,
  IAiReviewReuse,
  IAiReviewSignedFile,
  IAiReviewSignedUpload,
  IAiReviewUploadContext,
  IAiReviewUploadHistoryEntry,
  IAiReviewAdminFilter,
  IAiReviewAdminPage,
  IAiReviewAdminSummary,
} from '../models/ai-review.model'

/**
 * The course reviewer, in the portal's own terms. A path rather than a URL, so the session
 * cookie goes with it; uiproxy turns that into the user id the service checks the course
 * against. Matches the /apis/protected/v8 convention every other authoring call uses.
 */
export const AI_REVIEW_API_BASE = '/apis/protected/v8/courseReview'
/**
 * An HTML package's files, for the report's preview. Outside the session on purpose: the package
 * runs sandboxed, so its own requests carry no session cookie; the signed token authorises them.
 */
export const AI_REVIEW_PACKAGE_BASE = '/apis/public/v8/courseReview/package'

/**
 * An HTML package's first page, served by the review service from the reviewed zip. The link
 * itself is the authorisation (a signed token for this one item), because a frame cannot send
 * the API's headers; every part is encoded so none can change the path.
 */
export function packagePreviewUrl(reviewId: string, contentId: string, token: string): string {
  const e = encodeURIComponent
  return `${AI_REVIEW_PACKAGE_BASE}/${e(reviewId)}/${e(contentId)}/${e(token)}/index.html`
}

/** The review with a preview link on each HTML package that has a token. */
export function withPackageUrls(review: IAiReview): IAiReview {
  if (!review || !Array.isArray(review.items)) {
    return review
  }
  return {
    ...review,
    items: review.items.map(i => (i.packageToken ? { ...i, packageUrl: packagePreviewUrl(review.id, i.contentId, i.packageToken) } : i)),
  }
}

const enc = encodeURIComponent

/** The admin report's filters as query parameters, leaving out the empty ones. */
export function adminParams(filter: IAiReviewAdminFilter): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(filter)) {
    if (typeof value === 'string' && value.trim() !== '') {
      out[key] = value.trim()
    }
  }
  return out
}

@Injectable()
export class AiReviewService {
  private readonly http = inject(HttpClient)
  /** For sending files straight to storage: no interceptors, so no session headers leave the portal. */
  private readonly storage = new HttpClient(inject(HttpBackend))

  /** The setup screen: resources, competencies, an estimate, and any review already running. */
  preview(courseId: string): Observable<IAiReviewPreview> {
    return this.http.get<IAiReviewPreview>(`${AI_REVIEW_API_BASE}/courses/${enc(courseId)}/preview`)
  }

  /** The FRAC role check for these settings: the position's activities, or why none (nothing is spent). */
  fracRole(courseId: string, options: IAiReviewOptions): Observable<IAiReviewRoleCheck> {
    return this.http
      .post<IAiReviewRoleCheck>(`${AI_REVIEW_API_BASE}/courses/${enc(courseId)}/frac`, { options })
      .pipe(map(res => ({ role: res?.role ?? null, roleNote: res?.roleNote ?? null, roleGap: res?.roleGap ?? null })))
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
  /** @param contentIds - the resources chosen; omitted, every reviewable resource is reviewed. */
  start(courseId: string, options: IAiReviewOptions, contentIds?: string[] | null): Observable<IAiReviewCreateResult> {
    return this.http.post<IAiReviewCreateResult>(
      `${AI_REVIEW_API_BASE}/reviews`,
      contentIds ? { courseId, options, contentIds } : { courseId, options },
    )
  }

  get(reviewId: string): Observable<IAiReview> {
    return this.http.get<IAiReview>(`${AI_REVIEW_API_BASE}/reviews/${enc(reviewId)}`).pipe(map(withPackageUrls))
  }

  history(courseId: string): Observable<IAiReviewHistoryEntry[]> {
    return this.http
      .get<{ reviews: IAiReviewHistoryEntry[] }>(`${AI_REVIEW_API_BASE}/reviews`, { params: { courseId } })
      .pipe(map(res => res.reviews || []))
  }

  /** Every review this account started, of courses and of its files, newest first. */
  pastReviews(): Observable<IAiReviewPastReview[]> {
    return this.http.get<{ reviews: IAiReviewPastReview[] }>(`${AI_REVIEW_API_BASE}/reviews/mine`).pipe(map(res => res.reviews || []))
  }

  /** AI review admins: one page of every review across everyone, newest first. */
  adminReviews(filter: IAiReviewAdminFilter, limit = 50, offset = 0): Observable<IAiReviewAdminPage> {
    return this.http.get<IAiReviewAdminPage>(`${AI_REVIEW_API_BASE}/admin/reviews`, {
      params: { ...adminParams(filter), limit: String(limit), offset: String(offset) },
    })
  }

  /** AI review admins: the spend in all, by person, by course and by day, and this month's budget. */
  adminSummary(filter: IAiReviewAdminFilter): Observable<IAiReviewAdminSummary> {
    return this.http.get<IAiReviewAdminSummary>(`${AI_REVIEW_API_BASE}/admin/summary`, { params: adminParams(filter) })
  }

  cancel(reviewId: string): Observable<{ cancelled: boolean }> {
    return this.http.delete<{ cancelled: boolean }>(`${AI_REVIEW_API_BASE}/reviews/${enc(reviewId)}`)
  }

  // ---- files reviewed on their own (not part of a course) ----------------------------------

  /** The file review's setup screen: whether it is on, the dictionary, positions, accepted files. */
  uploadContext(): Observable<IAiReviewUploadContext> {
    return this.http.get<IAiReviewUploadContext>(`${AI_REVIEW_API_BASE}/uploads/context`)
  }

  /** One signed upload per file. The service makes the storage key; nothing is uploaded yet. */
  signUploads(files: { name: string; size: number; kind: AiReviewUploadKind }[]): Observable<IAiReviewSignedFile[]> {
    return this.http
      .post<{ uploads: IAiReviewSignedFile[] }>(`${AI_REVIEW_API_BASE}/uploads`, { files })
      .pipe(map(res => res.uploads || []))
  }

  /**
   * Sends one file straight to storage with its signed upload, emitting the percentage sent.
   *
   * It bypasses the portal's interceptors on purpose: they add an Authorization header and
   * org headers, which storage refuses (a signed upload carries its own authorisation) and
   * which a cross-origin request may not send. Nothing from the session goes to storage.
   */
  uploadFile(signed: IAiReviewSignedUpload, body: Blob): Observable<number> {
    let request: Observable<HttpEvent<unknown>>
    if (signed.method === 'POST') {
      const form = new FormData()
      // The policy's fields first, then the file, as S3 requires.
      Object.entries(signed.fields).forEach(([k, v]) => form.append(k, v))
      form.append('file', body)
      request = this.storage.post(signed.url, form, { observe: 'events', reportProgress: true })
    } else {
      request = this.storage.put(signed.url, body, { headers: new HttpHeaders(signed.headers), observe: 'events', reportProgress: true })
    }
    return request.pipe(
      filter(e => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map(e => (e.type === HttpEventType.UploadProgress ? Math.min(99, Math.round((100 * e.loaded) / (e.total || body.size || 1))) : 100)),
    )
  }

  /** Confirms each uploaded file and measures it, or says why it cannot be reviewed. */
  checkUploads(uploadIds: string[]): Observable<{ uploads: IAiReviewCheckedUpload[]; estimateUsd: number }> {
    return this.http.post<{ uploads: IAiReviewCheckedUpload[]; estimateUsd: number }>(`${AI_REVIEW_API_BASE}/uploads/measure`, {
      uploadIds,
    })
  }

  /**
   * Says an uploaded sheet is a quiz or an assessment. The stored questions are the same
   * either way, so nothing is uploaded again; the service checks the file for the new kind.
   */
  changeUploadKind(uploadId: string, kind: 'quiz' | 'assessment'): Observable<IAiReviewCheckedUpload> {
    return this.http.patch<IAiReviewCheckedUpload>(`${AI_REVIEW_API_BASE}/uploads/${encodeURIComponent(uploadId)}`, { kind })
  }

  /** The FRAC role check for a file review's settings (nothing is spent). */
  uploadFracRole(options: IAiReviewOptions): Observable<IAiReviewRoleCheck> {
    return this.http
      .post<IAiReviewRoleCheck>(`${AI_REVIEW_API_BASE}/uploads/frac`, { options })
      .pipe(map(res => ({ role: res?.role ?? null, roleNote: res?.roleNote ?? null, roleGap: res?.roleGap ?? null })))
  }

  startUploadReview(title: string, uploadIds: string[], options: IAiReviewOptions): Observable<IAiReviewCreateResult> {
    return this.http.post<IAiReviewCreateResult>(`${AI_REVIEW_API_BASE}/uploads/reviews`, { title, uploadIds, options })
  }

  /** The user's own file reviews, newest first. */
  uploadHistory(): Observable<IAiReviewUploadHistoryEntry[]> {
    return this.http
      .get<{ reviews: IAiReviewUploadHistoryEntry[] }>(`${AI_REVIEW_API_BASE}/uploads/reviews`)
      .pipe(map(res => res.reviews || []))
  }

  /**
   * The message to show for a failed call. The service words its refusals for the user
   * (limits, budget, no competency), so its message is used as-is when there is one.
   */
  static errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as IAiReviewErrorBody | null
      const message = body && typeof body === 'object' && body.error ? body.error.message : undefined
      // A 404 for an endpoint, not a record: the service says NO_ENDPOINT, and a gateway that
      // has no such route (uiproxy, Kong) answers without the service's error body at all.
      // Either way the feature is missing on this server, not something the user removed.
      if (error.status === 404 && (!message || AiReviewService.errorCode(error) === 'NO_ENDPOINT')) {
        return 'This part of AI review is not available on this server yet. Try again later, or ask your administrator.'
      }
      if (message) {
        return message
      }
      if (error.status === 0) {
        return typeof navigator !== 'undefined' && navigator.onLine === false
          ? "You're offline. Reconnect to the internet and try again."
          : 'Could not reach the AI review service. Check your connection and try again.'
      }
      // A gateway (Kong, uiproxy) answers these without the service's body: say what happened.
      if (error.status === 429) {
        return 'Too many AI review requests just now. Wait a minute, then try again.'
      }
      if (error.status === 401) {
        return 'Your session has ended. Sign in again, then try again.'
      }
      if (error.status === 413) {
        return 'That is too large to send to the AI review service.'
      }
      if (error.status === 403) {
        return /\/uploads(\/|\?|$)/.test(error.url || '')
          ? 'Only the person who uploaded these files can see or review them.'
          : "Only this course's creator, reviewers and publishers can run an AI review of it."
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
