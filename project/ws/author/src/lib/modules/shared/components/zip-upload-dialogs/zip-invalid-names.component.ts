import { Component, EventEmitter, Input, Output } from '@angular/core'

/**
 * The "files or folders have special characters" dialog body, shared by the
 * module creation and file upload screens.
 *
 * The list keeps its `errorFiles` id because both hosts reach into it by id
 * after opening the dialog to highlight the offending characters in red.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-zip-invalid-names',
  templateUrl: './zip-invalid-names.component.html',
})
export class ZipInvalidNamesComponent {
  @Input() names: string[] = []

  /** File upload scrolls the list; module creation caps its height only. */
  @Input() scrollBody = false

  @Output() acknowledged = new EventEmitter<void>()
  @Output() dismiss = new EventEmitter<void>()

  trackByIndex(index: number): number {
    return index
  }
}
