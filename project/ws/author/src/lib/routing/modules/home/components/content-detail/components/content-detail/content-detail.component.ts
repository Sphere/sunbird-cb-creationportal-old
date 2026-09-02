import { Component, ElementRef, ViewChild } from '@angular/core'

import { PipeDurationTransformPipe } from '@ws-widget/utils'

import { ContentDetailBaseComponent } from './content-detail-base.component'

/**
 * Content detail screen. Behaviour lives in ContentDetailBaseComponent, shared with
 * the mandatory-content screen; this class supplies only what is specific to it.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-content-detail',
  templateUrl: './content-detail.component.html',
  styleUrls: ['./content-detail.component.scss'],
  providers: [PipeDurationTransformPipe],
})
export class ContentDetailComponent extends ContentDetailBaseComponent {
  @ViewChild('searchInput', { static: false }) searchInputElem: ElementRef<any> = {} as ElementRef<any>

  /** This screen is routed, so the content id comes from the route parameters. */
  protected override resolveContentId(): void {
    this.contentId = this.activatedRoute.snapshot.paramMap.get('contentId') || null
  }
}
