import { Component } from '@angular/core'

/**
 * Assessment — source material becomes a validated multiple-choice set.
 *
 * `default-translate-into` asks for the same questions in other languages:
 * same order, same options, same answer key, so one key marks every paper and
 * scores compare across them. The reviewer reads each language on its own tab.
 *
 * The languages offered are the service's own list, so they are not repeated
 * here; passing nothing produces the primary language alone.
 */
@Component({
  standalone: false,
  selector: 'ws-author-assessment',
  templateUrl: './assessment.component.html',
  styleUrls: ['../ai-element-host.scss'],
})
export class AssessmentComponent {}
