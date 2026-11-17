import { HttpClient } from '@angular/common/http'
import { Injectable, inject, signal } from '@angular/core'
import { AccessControlService } from '../../../../modules/shared/services/access-control.service'
import { AI_REVIEW_API_BASE } from './ai-review.service'

/** A course's current AI review report: what its card links to. */
export interface IAiReviewMark {
  courseId: string
  reviewId: string
  status: string
  finishedAt: string | null
}

/** How long the cards on screen are collected before one lookup is sent for all of them. */
export const MARKS_BATCH_MS = 50
/** Course ids per lookup, as the service accepts. */
export const MARKS_PER_REQUEST = 100
/**
 * A course looked up longer ago than this is looked up again when a card asks: coming back to the
 * list after a review finished shows its mark, while the cards of one page share one lookup.
 */
export const MARKS_FRESH_MS = 30000

/**
 * Which courses have an AI review report, for the "AI reviewed" mark on course cards. Each card
 * asks for its course; the ids asked in the same moment go to the service in one request, and
 * each course is asked again only once its answer is older than MARKS_FRESH_MS. Only for users who can use AI
 * review; a lookup that fails leaves the cards without the mark, never broken.
 */
@Injectable({ providedIn: 'root' })
export class AiReviewMarksService {
  private readonly http = inject(HttpClient)
  private readonly access = inject(AccessControlService)

  /** The current report of each course found to have one, by course id. */
  readonly marks = signal<ReadonlyMap<string, IAiReviewMark>>(new Map())
  /** When each course was last looked up. */
  private readonly asked = new Map<string, number>()
  private readonly pending = new Set<string>()
  private timer: ReturnType<typeof setTimeout> | null = null

  /** Looks up a course's report (once), together with the others asked for now. */
  request(courseId: string | null | undefined): void {
    if (!courseId || !this.access.canUseAiReview()) {
      return
    }
    const at = this.asked.get(courseId)
    if (at !== undefined && Date.now() - at < MARKS_FRESH_MS) {
      return
    }
    this.asked.set(courseId, Date.now())
    this.pending.add(courseId)
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), MARKS_BATCH_MS)
    }
  }

  /** Forgets what was looked up, so a reloaded list asks again (a review may have finished since). */
  reset(): void {
    this.asked.clear()
    this.pending.clear()
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.marks.set(new Map())
  }

  private flush(): void {
    this.timer = null
    const ids = [...this.pending]
    this.pending.clear()
    for (let i = 0; i < ids.length; i += MARKS_PER_REQUEST) {
      const chunk = ids.slice(i, i + MARKS_PER_REQUEST)
      this.http
        .get<{ reports: IAiReviewMark[] }>(`${AI_REVIEW_API_BASE}/reviews/latest`, { params: { courseIds: chunk.join(',') } })
        .subscribe({
          next: res => {
            const found = (res?.reports || []).filter(r => r && r.courseId && r.reviewId)
            const next = new Map(this.marks())
            // A course asked about with no report now has none (its review was replaced or removed).
            chunk.forEach(id => next.delete(id))
            found.forEach(r => next.set(r.courseId, r))
            this.marks.set(next)
          },
          // No mark rather than a broken card; the course can still be opened from its menu.
          error: () => undefined,
        })
    }
  }
}
