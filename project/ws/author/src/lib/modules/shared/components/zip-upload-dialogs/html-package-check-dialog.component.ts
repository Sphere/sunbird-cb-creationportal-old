import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { IHtmlPackageFinding, IHtmlPackageReport } from './html-package-check'

export interface IHtmlPackageCheckDialogData {
  report: IHtmlPackageReport
  fileName: string
}

/**
 * The result of checking an HTML package before upload. Closes with `true` when
 * the author chooses to upload (only offered when nothing blocks the upload), and
 * with `false` to pick another file.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-html-package-check-dialog',
  templateUrl: './html-package-check-dialog.component.html',
  styleUrls: ['./html-package-check-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HtmlPackageCheckDialogComponent {
  readonly data = inject<IHtmlPackageCheckDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject<MatDialogRef<HtmlPackageCheckDialogComponent, boolean>>(MatDialogRef)

  readonly blocking = computed(() => this.data.report.findings.filter(f => f.level === 'block'))
  readonly warnings = computed(() => this.data.report.findings.filter(f => f.level === 'warn'))
  readonly passed = computed(() => this.data.report.findings.filter(f => f.level === 'pass'))
  readonly showPassed = signal(false)

  readonly heading = computed(() => {
    const { blocking, warnings } = this.data.report
    if (blocking) {
      return blocking === 1 ? '1 problem stops this upload' : `${blocking} problems stop this upload`
    }
    return warnings === 1 ? '1 thing to check before uploading' : `${warnings} things to check before uploading`
  })

  trackFinding(_: number, f: IHtmlPackageFinding): string {
    return f.id
  }

  chooseAnother(): void {
    this.dialogRef.close(false)
  }

  upload(): void {
    if (!this.data.report.blocking) {
      this.dialogRef.close(true)
    }
  }
}
