import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core'
import { map } from 'rxjs/operators'
import { ValueService } from '@ws-widget/utils/src/public-api'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE } from '@ws/author/src/lib/constants/content-role'
import { Router } from '@angular/router'

@Component({
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
  allowExpiry = false
  allowRestore = false
  isNewDesign = false
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  constructor(private valueSvc: ValueService, private accessService: AccessControlService,
    private router: Router) { }

  ngOnInit() {
    this.allowAuthor = this.canShow('author')
    this.allowAuthorContentCreate = this.canShow('author_create')
    this.allowRedo = this.accessService.authoringConfig.allowRedo
    this.allowRestore = this.accessService.authoringConfig.allowRestore
    this.allowExpiry = this.accessService.authoringConfig.allowExpiry
    this.allowReview = this.canShow('review') && this.accessService.authoringConfig.allowReview
    this.allowPublish = this.canShow('publish') && this.accessService.authoringConfig.allowPublish
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpened = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.isNewDesign = this.accessService.authoringConfig.newDesign
    // console.log(this.accessService, this.allowPublish, this.allowAuthorContentCreate, this.allowReview)
    if (this.allowPublish) {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'reviewed' } })
    } else if (this.allowAuthorContentCreate) {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })
    } else {
      this.router.navigate(['/author/my-content'], { queryParams: { status: 'inreview' } })
    }
  }
  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }

  canShow(role: string): boolean {
    switch (role) {
      case 'review':
        return this.accessService.hasRole(REVIEW_ROLE)
      case 'publish':
        return this.accessService.hasRole(PUBLISH_ROLE)
      case 'author':
        return this.accessService.hasRole(CREATE_ROLE) || this.accessService.hasRole(REVIEW_ROLE)
          || this.accessService.hasRole(PUBLISH_ROLE)
      case 'author_create':
        return this.accessService.hasRole(CREATE_ROLE)
      default:
        return false
    }
  }
}
