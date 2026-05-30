import { Directive, ViewContainerRef } from '@angular/core'


@Directive({
  standalone: false,
  selector: '[wsAppAppTocSinglePage]',
})
export class AppTocSinglePageDirective {

  constructor(
    public viewContainerRef: ViewContainerRef,
  ) { }

}
