import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

export interface IVideoQuestionOption {
  text?: string
  isCorrect?: boolean
  answerInfo?: string
}

export interface IVideoQuestionMilestone {
  timestampInSeconds: number | string
  question?: { text?: string; options?: IVideoQuestionOption[] }[]
}

/** Closing with this value asks the player to seek to `seconds`. */
export interface IVideoQuestionJump {
  jumpTo: number
}

/** Formats seconds as m:ss, or h:mm:ss for an hour or more. */
export function formatVideoTime(totalSeconds: number | string): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/**
 * Read-only review of a video's in-video questions for creators, reviewers and publishers:
 * when each one appears, its options with the correct one marked, and the explanation
 * shown after answering.
 */
@Component({
  standalone: false,
  selector: 'ws-widget-video-questions-review-dialog',
  templateUrl: './video-questions-review-dialog.component.html',
  styleUrls: ['./video-questions-review-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoQuestionsReviewDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<VideoQuestionsReviewDialogComponent, IVideoQuestionJump>>(MatDialogRef)
  private readonly data = inject<{ milestones: IVideoQuestionMilestone[] }>(MAT_DIALOG_DATA)

  readonly formatTime = formatVideoTime

  /** Milestones in playback order, ignoring any with no questions. */
  readonly milestones: IVideoQuestionMilestone[] = [...(this.data.milestones || [])]
    .filter(m => Array.isArray(m.question) && m.question.length > 0)
    .sort((a, b) => Number(a.timestampInSeconds) - Number(b.timestampInSeconds))

  readonly questionCount = this.milestones.reduce((n, m) => n + (m.question ? m.question.length : 0), 0)

  hasCorrectOption(options: IVideoQuestionOption[] | undefined): boolean {
    return Array.isArray(options) && options.some(o => o.isCorrect)
  }

  jumpTo(milestone: IVideoQuestionMilestone): void {
    this.dialogRef.close({ jumpTo: Number(milestone.timestampInSeconds) })
  }

  close(): void {
    this.dialogRef.close()
  }
}
