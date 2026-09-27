import { Component, ViewEncapsulation } from '@angular/core'

/**
 * The application's loading overlay, lifted out of the author root component so
 * a dialog can show it too.
 *
 * The root component's copy is painted in the app shell, which the CDK renders
 * its overlays above; while a dialog is open that made the loader invisible and
 * an action that takes several seconds looked like it had done nothing. Rendered
 * from inside the dialog, it sits in the dialog's own stacking context and is
 * shown regardless.
 *
 * Encapsulation is None and the class names are unchanged, so the markup and
 * styling are exactly what the root component rendered before.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-loader-card',
  templateUrl: './loader-card.component.html',
  styleUrls: ['./loader-card.component.scss'],
  // tslint:disable-next-line:use-component-view-encapsulation
  encapsulation: ViewEncapsulation.None,
})
export class LoaderCardComponent {}
