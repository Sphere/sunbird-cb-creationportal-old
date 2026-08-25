import { Component, Input } from '@angular/core'

import { PipeDurationTransformPipe } from '@ws-widget/utils'

import { environment } from '../../../../../../../../../../../../src/environments/environment'

import { ContentDetailBaseComponent } from '../../../content-detail/components/content-detail/content-detail-base.component'

/**
 * Mandatory content screen. Behaviour lives in ContentDetailBaseComponent, shared with
 * the content-detail screen; this class supplies only what is specific to it.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-mandatory-content',
  templateUrl: './mandatory-content.component.html',
  styleUrls: ['./mandatory-content.component.scss'],
  providers: [PipeDurationTransformPipe],
})
export class MandatoryContentComponent extends ContentDetailBaseComponent {
  /** Unlike content-detail this screen is embedded, so the id is passed in. */
  @Input() override contentId!: string

  /** This screen links straight out to the learner portal for the content. */
  protected override glanceExtras(): Record<string, any> {
    return {
      buttonName: 'Start now',
      customLink: `${environment.karmYogi}/app/toc/${this.contentId}/overview`,
    }
  }
}
