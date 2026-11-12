import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { Router } from '@angular/router'
import { AiReviewSource, IAiReviewJudgedAgainst, IAiReviewPastReview } from '../../models/ai-review.model'
import { AiReviewService } from '../../services/ai-review.service'
import { statusLabel } from '../../utils/review-run'
import { AI_REVIEW_NEW, aiReviewCourse } from '../../utils/routes'

/** What the list shows: every review, or only one kind. */
export type PastReviewFilter = 'all' | AiReviewSource

/** "Level 4", "Levels 1–3" when consecutive, else "Levels 1, 3". */
export function levelsWords(levels: readonly number[]): string {
  const l = [...new Set(levels)].sort((a, b) => a - b)
  if (!l.length) return ''
  if (l.length === 1) return `Level ${l[0]}`
  const consecutive = l.every((v, i) => i === 0 || v === l[i - 1] + 1)
  return consecutive ? `Levels ${l[0]}–${l[l.length - 1]}` : `Levels ${l.join(', ')}`
}

/** The chip: "C18 · Level 4" (the label stands in when there is no code). */
export function competencyChip(j: IAiReviewJudgedAgainst): string {
  return [j.code || j.label, levelsWords(j.levels)].filter(Boolean).join(' · ')
}

/** In full, for the tooltip and screen readers: "C18 Awareness on basket of choice, Level 4: Screens client". */
export function competencyInFull(j: IAiReviewJudgedAgainst): string {
  const name = [j.code, j.label].filter(Boolean).join(' ')
  const level = levelsWords(j.levels)
  return [name, level && (j.levelLabel ? `${level}: ${j.levelLabel}` : level)].filter(Boolean).join(', ')
}

/**
 * Past reviews ("AI Review" > "Past reviews" in My Workspace): every review this account started, of courses and of its own files, newest
 * first, in AI Studio's history list. Each opens its full report where it was made. The service
 * lists a course review only while the user may still see that course.
 */
/** How many past reviews the service lists (review.repository listMine). */
export const PAST_REVIEWS_LIMIT = 50

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
  /** The service sends at most this many (newest first); the page says so when it is full. */
  readonly PAST_REVIEWS_LIMIT = PAST_REVIEWS_LIMIT
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
      r =>
        (this.filter() === 'all' || r.source === this.filter()) &&
        (!q || [r.name, ...(r.judgedAgainst ?? []).flatMap(j => [j.code, j.label])].some(t => (t || '').toLowerCase().includes(q))),
    )
  })

  readonly competencyChip = competencyChip
  readonly competencyInFull = competencyInFull

  /** The row's name for screen readers, with what it was judged against. */
  rowLabel(r: IAiReviewPastReview): string {
    const judged = (r.judgedAgainst ?? []).map(competencyInFull).join('; ')
    return `Open the AI review of ${r.name || 'this review'}${judged ? `, judged against ${judged}` : ''}`
  }

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
