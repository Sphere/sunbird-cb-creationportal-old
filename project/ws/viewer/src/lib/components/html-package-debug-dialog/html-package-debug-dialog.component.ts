import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { filter } from 'rxjs/operators'

import {
  HtmlPackageDebugService,
  IHtmlPackageEventRow,
  IHtmlPackageReport,
} from 'project/ws/viewer/src/lib/plugins/html/html-package-debug.service'

export interface IHtmlPackageDebugDialogData {
  contentId: string
  name?: string
}

/**
 * Shows an author what an HTML package reported while it played in preview:
 * progress, where the learner is, whether it saves resume state, and the event
 * log. Updates live while the package keeps playing behind the dialog.
 */
@Component({
  standalone: false,
  selector: 'viewer-html-package-debug-dialog',
  templateUrl: './html-package-debug-dialog.component.html',
  styleUrls: ['./html-package-debug-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HtmlPackageDebugDialogComponent {
  readonly data = inject<IHtmlPackageDebugDialogData>(MAT_DIALOG_DATA)
  private readonly debug = inject(HtmlPackageDebugService)
  private readonly dialogRef = inject<MatDialogRef<HtmlPackageDebugDialogComponent>>(MatDialogRef)

  private readonly version = signal(0)
  readonly report = computed<IHtmlPackageReport>(() => {
    this.version()
    return this.debug.report(this.data.contentId)
  })
  readonly copied = signal(false)

  constructor() {
    this.debug.changes$
      .pipe(
        filter(id => id === this.data.contentId),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.version.update(v => v + 1))
  }

  trackRow(index: number, row: IHtmlPackageEventRow): string {
    return `${row.at}-${row.type}-${index}`
  }

  copyLog(): void {
    const log = {
      contentId: this.data.contentId,
      summary: this.debug.summary(this.data.contentId),
      events: this.debug.eventsFor(this.data.contentId),
    }
    const text = JSON.stringify(log, null, 2)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => this.copied.set(true),
        () => this.copied.set(false),
      )
    }
  }

  clear(): void {
    this.debug.clear(this.data.contentId)
    this.copied.set(false)
  }

  close(): void {
    this.dialogRef.close()
  }
}
