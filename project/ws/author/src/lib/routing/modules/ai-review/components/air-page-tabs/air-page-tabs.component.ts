import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { AI_REVIEW_HOME, AI_REVIEW_REPORTS } from '../../utils/routes'

/**
 * Past reviews and Reports, as two tabs at the top of either page. Only AI review admins
 * (AI_REVIEW_ADMIN) have Reports, so for everyone else there is nothing to switch between and
 * nothing is shown. The service refuses the report to anyone else as well.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-page-tabs',
  templateUrl: './air-page-tabs.component.html',
  styleUrls: ['./air-page-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirPageTabsComponent {
  private readonly access = inject(AccessControlService)

  /** The page this sits on. */
  readonly current = input.required<'past' | 'reports'>()

  /** Roles do not change while a page is open: read once. */
  readonly isAdmin = this.access.hasAiReviewAdminRole()

  readonly homeLink = AI_REVIEW_HOME
  readonly reportsLink = AI_REVIEW_REPORTS
}
