import { Component } from '@angular/core'

/**
 * Reports — what was produced, by whom, and what it cost.
 *
 * Shows spend across EVERY creator, not only the signed-in one: no creator
 * filter is passed, so the element asks for the whole organisation and offers
 * its own per-creator picker on top of that.
 *
 * Gated on AI_STUDIO_ADMIN alone — see ai-studio.features. It used to sit
 * behind the same content_creator role as the other two, which meant any author
 * could see what the organisation was spending.
 */
@Component({
  standalone: false,
  selector: 'ws-author-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['../ai-element-host.scss'],
})
export class ReportsComponent {}
