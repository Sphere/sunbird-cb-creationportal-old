import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core'
import { AiReviewMarksService } from '../../../ai-review/services/ai-review-marks.service'
import { aiReviewCourse } from '../../../ai-review/utils/routes'

/**
 * "AI reviewed" on a course card when the course has an AI review report; it opens that report.
 * Nothing shows for other content, for a course with no report, or for users without AI review.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-ai-reviewed-mark',
  templateUrl: './ai-reviewed-mark.component.html',
  styleUrls: ['./ai-reviewed-mark.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewedMarkComponent {
  private readonly marks = inject(AiReviewMarksService)

  /** The card's content: only a course is looked up. */
  readonly courseId = input<string | null>(null)
  readonly contentType = input<string | null>(null)

  readonly isCourse = computed(() => (this.contentType() || '').toLowerCase() === 'course')
  readonly mark = computed(() => (this.isCourse() && this.courseId() ? this.marks.marks().get(this.courseId()!) || null : null))
  readonly link = computed(() => (this.courseId() ? aiReviewCourse(this.courseId()!) : null))

  constructor() {
    effect(() => {
      if (this.isCourse()) {
        this.marks.request(this.courseId())
      }
    })
  }

  /** "Reviewed on 16 Nov 2026", for the mark's tooltip. */
  readonly when = computed(() => {
    const at = this.mark()?.finishedAt
    const d = at ? new Date(at) : null
    return d && !isNaN(d.getTime())
      ? `AI reviewed on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}: open the report`
      : 'Open the AI review report'
  })
}
