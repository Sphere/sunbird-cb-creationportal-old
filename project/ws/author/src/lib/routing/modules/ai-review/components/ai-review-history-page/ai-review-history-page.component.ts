import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { AiReviewSource, IAiReviewPastReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { statusLabel } from '../../utils/review-run'
import { AI_REVIEW_NEW, aiReviewCourse } from '../../utils/routes'

/** What the list shows: every review, or only one kind. */
export type PastReviewFilter = 'all' | AiReviewSource

/**
 * Past reviews ("AI Review" > "Past reviews" in My Workspace): every review this account started, of courses and of its own files, newest
 * first, in AI Studio's history list. Each opens its full report where it was made. The service
 * lists a course review only while the user may still see that course.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-ai-review-history-page',
  templateUrl: './ai-review-history-page.component.html',
  styleUrls: ['../ai-review-course-page/ai-review-course-page.component.scss', './ai-review-history-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewHistoryPageComponent implements OnInit {
  private readonly api = inject(AiReviewService)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  readonly reviews = signal<IAiReviewPastReview[]>([])
  readonly loading = signal(true)
  readonly error = signal('')
  readonly filter = signal<PastReviewFilter>('all')
  /** Reviews whose course picture would not load: they show the icon instead. */
  readonly brokenThumbs = signal<ReadonlySet<string>>(new Set())
  readonly query = signal('')

  /** How many of each kind, for the tabs. */
  readonly counts = computed(() => {
    const all = this.reviews()
    return { all: all.length, course: all.filter(r => r.source === 'course').length, upload: all.filter(r => r.source === 'upload').length }
  })

  /** The reviews the tabs and the search leave. */
  readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase()
    return this.reviews().filter(
      r => (this.filter() === 'all' || r.source === this.filter()) && (!q || (r.name || '').toLowerCase().includes(q)),
    )
  })

  readonly tabs: { id: PastReviewFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'course', label: 'Courses' },
    { id: 'upload', label: 'Files' },
  ]

  readonly statusLabel = statusLabel
  /** Where New review goes. */
  readonly newReviewLink = AI_REVIEW_NEW

  ngOnInit(): void {
    this.load()
  }

  load(): void {
    this.loading.set(true)
    this.error.set('')
    this.api
      .pastReviews()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.reviews.set(list)
          this.loading.set(false)
        },
        error: err => {
          this.error.set(AiReviewService.errorMessage(err, 'Your AI reviews could not be loaded just now.'))
          this.loading.set(false)
        },
      })
  }

  /** Opens the report where the review was made: its course's review page, or the file review. */
  open(r: IAiReviewPastReview): void {
    if (r.source === 'course' && r.courseId) {
      void this.router.navigate(aiReviewCourse(r.courseId), { queryParams: { review: r.id } })
    } else {
      void this.router.navigate([AI_REVIEW_NEW], { queryParams: { review: r.id } })
    }
  }

  thumbFailed(id: string): void {
    this.brokenThumbs.update(s => new Set(s).add(id))
  }

  /** Back to My Workspace. */
  back(): void {
    // The list needs its status: without it My Workspace shows Drafts' count and no courses.
    void this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })
  }

  countOf(id: PastReviewFilter): number {
    return this.counts()[id]
  }
}
