import { Component } from '@angular/core'

/**
 * Reports — what was produced, by whom, and what it cost.
 *
 * Shows spend across EVERY creator, not only the signed-in one. It is behind
 * the same `content_creator` role as the other two for now, which means any
 * author can see what the organisation is spending. That is a deliberate
 * interim choice: the portal has no admin role to map it to, and the right
 * answer — a `content_admin` role with the matching gateway group — is a
 * platform change. Revisit before this reaches a wide audience.
 */
@Component({
  standalone: false,
  selector: 'ws-author-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['../ai-element-host.scss'],
})
export class ReportsComponent {}
