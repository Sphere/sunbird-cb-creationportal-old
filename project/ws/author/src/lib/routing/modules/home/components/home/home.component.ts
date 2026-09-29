import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core'

import { map } from 'rxjs/operators'

import { ValueService } from '@ws-widget/utils/src/public-api'

import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'

import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE, EXTERNAL_CONTENT_REVIEWER_LIVE } from '@ws/author/src/lib/constants/content-role'

import { Router } from '@angular/router'

import { aiStudioFeaturesFor, hasAnyAIStudioRole } from '../../../ai-studio/ai-studio.features'

@Component({
  standalone: false,
  selector: 'ws-auth-root-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  // tslint:disable-next-line
  encapsulation: ViewEncapsulation.None,
})
export class AuthHomeComponent implements OnInit, OnDestroy {
  sideNavBarOpened = true
  panelOpenState = false
  allowReview = false
  allowAuthor = false
  allowAuthorContentCreate = false
  allowRedo = false
  allowPublish = false
  allowExternalContentReviewer = false
  allowExpiry = false
  allowRestore = false
  isNewDesign = false
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  constructor(
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.allowAuthor = this.canShow('author')
    this.allowAuthorContentCreate = this.canShow('author_create')
    this.allowRedo = this.accessService.authoringConfig.allowRedo
    this.allowRestore = this.accessService.authoringConfig.allowRestore
    this.allowExpiry = this.accessService.authoringConfig.allowExpiry
    this.allowReview = this.canShow('review') && this.accessService.authoringConfig.allowReview
    this.allowPublish = this.canShow('publish') && this.accessService.authoringConfig.allowPublish
    this.allowExternalContentReviewer = this.canShow('external_content_reviewer')

    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpened = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.isNewDesign = this.accessService.authoringConfig.newDesign
    // console.log(this.accessService, this.allowPublish, this.allowAuthorContentCreate, this.allowReview)
    const aiStudioLanding = this.aiStudioLanding()
    if (this.allowPublish) {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'reviewed' } })
    } else if (this.allowAuthorContentCreate) {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })
    } else if (this.allowExternalContentReviewer) {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'externalCourseReview' } })
    } else if (aiStudioLanding) {
      // Ahead of the catch-all below and nothing else. Every branch above keeps
      // whoever it already served; this one only takes people the catch-all was
      // guessing at. Note that catch-all never tested allowReview — it sent
      // ANYONE left to the review queue, including someone with no review role
      // at all, which is how an AI-Studio-only user ended up looking at other
      // people's submissions.
      this.router.navigate(['/author/my-content'], { queryParams: { status: aiStudioLanding } })
    } else {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'inreview' } })
    }
  }
  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }

  /**
   * The AI Studio feature to open, for someone whose grant is AI Studio.
   *
   * Empty unless they actually hold an AI Studio role: the roles are not issued
   * by the user service yet, and until they are this has to change nothing for
   * anyone. aiStudioFeaturesFor falls back to the whole catalogue in that case,
   * so the hasAnyAIStudioRole test — not the list being non-empty — is what
   * makes this inert.
   */
  private aiStudioLanding(): string {
    const hasRole = (roles: string[]) => this.accessService.hasRole(roles)
    if (!hasAnyAIStudioRole(hasRole)) {
      return ''
    }
    const allowed = aiStudioFeaturesFor(hasRole)
    return allowed.length ? allowed[0].id : ''
  }

  canShow(role: string): boolean {
    switch (role) {
      case 'review':
        return this.accessService.hasRole(REVIEW_ROLE)
      case 'publish':
        return this.accessService.hasRole(PUBLISH_ROLE)
      case 'author':
        return (
          this.accessService.hasRole(CREATE_ROLE) || this.accessService.hasRole(REVIEW_ROLE) || this.accessService.hasRole(PUBLISH_ROLE)
        )
      case 'author_create':
        return this.accessService.hasRole(CREATE_ROLE)
      case 'external_content_reviewer':
        //return this.accessService.hasRole(CREATE_ROLE)
        return this.accessService.hasRole(EXTERNAL_CONTENT_REVIEWER_LIVE)
      default:
        return false
    }
  }
}
