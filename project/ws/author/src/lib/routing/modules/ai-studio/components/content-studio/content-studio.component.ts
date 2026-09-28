import { Component } from '@angular/core'

/**
 * Content Studio — a document becomes a narrated training video.
 *
 * The whole feature is the custom element in the template. It is published as
 * `@aastrika/ai-elements` and carries its own Angular compiled inside, so it
 * shares nothing with this application beyond the DOM node it renders into —
 * no services, no styles, no version to keep in step.
 *
 * `configure()` is called once when AIStudioModule loads, so nothing is needed
 * here. See `ai-studio.module.ts`.
 */
@Component({
  standalone: false,
  selector: 'ws-author-content-studio',
  templateUrl: './content-studio.component.html',
  styleUrls: ['../ai-element-host.scss'],
})
export class ContentStudioComponent {}
