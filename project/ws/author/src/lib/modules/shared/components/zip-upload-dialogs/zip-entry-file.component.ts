import { Component, EventEmitter, Input, Output } from '@angular/core'

import { IZipUploadConditions } from './zip-upload-conditions.model'

/**
 * The "Select the entry file" dialog body, shared by the module creation and
 * file upload screens.
 *
 * `condition.url` is bound with ngModel against the host's own object, so the
 * selected entry point is visible to the host after the dialog closes exactly
 * as it was when each screen carried its own copy of this markup.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-zip-entry-file',
  templateUrl: './zip-entry-file.component.html',
})
export class ZipEntryFileComponent {
  @Input() condition!: IZipUploadConditions
  @Input() fileList: string[] = []

  @Output() entryPointSelected = new EventEmitter<string>()
  @Output() done = new EventEmitter<void>()
  @Output() dismiss = new EventEmitter<void>()
}
