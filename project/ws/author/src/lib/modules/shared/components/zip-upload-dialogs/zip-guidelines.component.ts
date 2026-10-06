import { Component, EventEmitter, Input, Output } from '@angular/core'

import { IZipUploadConditions } from './zip-upload-conditions.model'

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
})
export class ZipGuidelinesComponent {
  @Input() condition!: IZipUploadConditions

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
