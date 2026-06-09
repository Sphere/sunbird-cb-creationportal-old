import { Directive, ViewContainerRef } from '@angular/core'


@Directive({
  standalone: false,
  selector: '[wsAppAppTocCohorts]',
})
export class AppTocCohortsDirective {

  constructor(
    public viewContainerRef: ViewContainerRef,
  ) { }

}
