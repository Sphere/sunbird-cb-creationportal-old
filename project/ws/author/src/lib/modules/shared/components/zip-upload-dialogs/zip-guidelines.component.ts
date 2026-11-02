import { Component, EventEmitter, Input, Output } from '@angular/core'

import { IZipUploadConditions } from './zip-upload-conditions.model'

type ZipGuidelineKey = 'fileName' | 'eval' | 'externalReference' | 'iframe' | 'preview'

/**
 * The "Guidelines for zip file upload" dialog body, shared by the module
 * creation and file upload screens, which each carried their own copy.
 *
 * `condition` is mutated in place rather than emitted back: both hosts read the
 * flags off the object they passed in once the dialog has closed.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-zip-guidelines',
  templateUrl: './zip-guidelines.component.html',
  styleUrls: ['./zip-upload-dialogs.scss'],
})
export class ZipGuidelinesComponent {
  @Input() condition!: IZipUploadConditions

  /** The declarations, in the order they are shown; each key is a flag on `condition`. */
  readonly items: { key: ZipGuidelineKey; text: string }[] = [
    { key: 'fileName', text: 'All the folder and file names should not contain any special character, including space' },
    { key: 'eval', text: 'Should not have any code which will cause a security vulnerability, like use of the eval function' },
    {
      key: 'externalReference',
      text: 'All the dependencies should be included in the zip. Should not refer to external websites to load any assets like images, css or js',
    },
    { key: 'iframe', text: 'Should not include any iframe. If required, contact the Platform Admin.' },
    {
      key: 'preview',
      text: 'After a successful upload, preview the content to make sure everything works. If anything is inconsistent, check the browser developer tools for the exact reason',
    },
  ]

  /**
   * Module creation disables the button until every box is ticked; file upload
   * leaves it enabled so that pressing it reveals the per-item errors. Both
   * behaviours are preserved rather than unified.
   */
  @Input() disableUntilAccepted = false

  @Output() accepted = new EventEmitter<void>()
  @Output() dismiss = new EventEmitter<void>()

  get allAccepted(): boolean {
    return Boolean(
      this.condition &&
      this.condition.fileName &&
      this.condition.iframe &&
      this.condition.eval &&
      this.condition.preview &&
      this.condition.externalReference,
    )
  }

  agree(): void {
    this.condition.isSubmitPressed = true
    if (this.allAccepted) {
      this.accepted.emit()
    }
  }
}
