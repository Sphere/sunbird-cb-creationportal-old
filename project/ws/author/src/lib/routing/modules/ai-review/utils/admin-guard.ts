import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { AI_REVIEW_HOME } from './routes'

/**
 * Reports are for AI review admins (AI_REVIEW_ADMIN); anyone else is sent to Past reviews. The
 * service refuses the report to anyone else as well: this only saves them a page of errors.
 */
export const aiReviewAdminGuard: CanActivateFn = () =>
  inject(AccessControlService).hasAiReviewAdminRole() || inject(Router).parseUrl(AI_REVIEW_HOME)
