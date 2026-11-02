import { ChangeDetectionStrategy, Component } from '@angular/core'

/**
 * Shown in place of a player when the resource has no file yet (a draft saved
 * without an upload). Without it the PDF viewer showed an empty "Page 1 of 0"
 * and the video player a format error, which read as broken content.
 */
@Component({
  standalone: false,
  selector: 'viewer-no-file',
  templateUrl: './no-file.component.html',
  styleUrls: ['./no-file.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoFileComponent {}
