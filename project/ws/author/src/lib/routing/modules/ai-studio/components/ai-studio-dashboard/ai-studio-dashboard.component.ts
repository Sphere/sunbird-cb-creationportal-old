import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core'

import { ActivatedRoute } from '@angular/router'

import { Subscription } from 'rxjs'

import { AI_STUDIO_FEATURES, AIStudioFeature } from '../../ai-studio.features'

/**
 * Shows one AI Studio feature.
 *
 * It can be told which one in two ways, and both have to keep working:
 *
 *   as a component  <ws-author-ai-studio-dashboard [feature]="…"> inside
 *                   my-content, where the sidebar puts the choice in ?status=
 *                   along with every other tab on that screen.
 *
 *   as a route      /author/my-content/ai-studio/contentStudio, where the
 *                   feature is a path segment and this is the routed component.
 *
 * The route wins where there is one, because a URL the user can see and share
 * is more specific than an input from a parent. With no route parameter the
 * input is used unchanged, so the existing screen behaves exactly as before.
 */
@Component({
  standalone: false,
  selector: 'ws-author-ai-studio-dashboard',
  templateUrl: './ai-studio-dashboard.component.html',
  styleUrls: ['./ai-studio-dashboard.component.scss'],
})
export class AIStudioDashboardComponent implements OnInit, OnChanges, OnDestroy {
  /** The feature to show when this is used as a component, not a route. */
  @Input() feature = ''

  /** What the template renders: the route's feature, else the input's. */
  active = ''

  /**
   * True only on the routed path. Inside my-content the sidebar is already on
   * screen and a second set of tabs beside it would be two controls for one
   * choice; on its own URL there is no sidebar, so this page has to carry its
   * own navigation or a user can reach a feature and then not leave it.
   */
  routed = false

  /** The tabs, from the one list that also defines the URLs. */
  readonly features: AIStudioFeature[] = AI_STUDIO_FEATURES

  private sub?: Subscription

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Which caller owns this screen is fixed for its lifetime: a routed
    // instance is created by the router at a URL that has a :feature segment,
    // and an embedded one never gets a route parameter at all. Deciding it
    // once, here, rather than on every emission — recomputing it let a param
    // change and the input fallback write `active` twice in a single change
    // detection pass, which Angular reports as ExpressionChangedAfterChecked.
    this.routed = !!this.route.snapshot.paramMap.get('feature')

    if (!this.routed) {
      this.active = this.feature
      return
    }

    // Subscribed rather than read once: moving between features reuses this
    // component instance, so a single read would leave the first one on screen.
    this.sub = this.route.paramMap.subscribe(params => {
      this.active = params.get('feature') ?? this.feature
    })
  }

  ngOnChanges() {
    // The parent can change the input at any time; honour it unless the route
    // has already spoken for this screen.
    //
    // `routed` rather than route.snapshot: the subscription above is what
    // decides which source owns this screen, so it is also what records the
    // decision. Re-reading the snapshot here asked the same question twice and
    // could answer it differently mid-check — which is what produced an
    // ExpressionChangedAfterItHasBeenChecked error when a feature changed.
    if (!this.routed) {
      this.active = this.feature
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe()
  }
}
