import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { ActivatedRoute, Router } from '@angular/router'
import { ConfigurationsService, NsPage, ValueService } from '@ws-widget/utils'
import { Subscription } from 'rxjs'
import { ViewerDataService } from '../../viewer-data.service'
import { NsContent } from '@ws-widget/collection/src/lib/_services/widget-content.model'
import { AccessControlService } from '../../../../../author/src/lib/modules/shared/services/access-control.service'
import { MatDialog } from '@angular/material/dialog'
import { ReviewDialogComponent } from '@ws/viewer/src/lib/components/review-checklist/review-dialog.component'

@Component({
  selector: 'viewer-viewer-top-bar',
  templateUrl: './viewer-top-bar.component.html',
  styleUrls: ['./viewer-top-bar.component.scss'],
})
export class ViewerTopBarComponent implements OnInit, OnDestroy {
  @Input() frameReference: any
  @Input() forPreview = false
  @Output() toggle = new EventEmitter()
  private viewerDataServiceSubscription: Subscription | null = null
  private paramSubscription: Subscription | null = null
  private viewerDataServiceResourceSubscription: Subscription | null = null
  appIcon: SafeUrl | null = null
  isTypeOfCollection = false
  collectionType: string | null = null
  prevResourceUrl: string | null = null
  nextResourceUrl: string | null = null
  pageNavbar: Partial<NsPage.INavBackground> = this.configSvc.pageNavBar
  resourceId: string = (this.viewerDataSvc.resourceId as string) || ''
  resourceName: string | null = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.name : ''
  @Input() screenContent: NsContent.IContent | null = null
  @Output() fsState: EventEmitter<boolean> = new EventEmitter()
  collectionId = ''
  logo = true
  isPreview = false
  forChannel = false
  isPublisher!: boolean
  isReviewer!: boolean

  constructor(
    private activatedRoute: ActivatedRoute,
    private domSanitizer: DomSanitizer,
    // private logger: LoggerService,
    private configSvc: ConfigurationsService,
    private viewerDataSvc: ViewerDataService,
    private valueSvc: ValueService,
    private router: Router,
    private accessService: AccessControlService,
    public dialog: MatDialog,
  ) {
    this.valueSvc.isXSmall$.subscribe(isXSmall => {
      this.logo = !isXSmall
    })
  }

  ngOnInit() {
    this.isPublisher = this.accessService.hasRole(['content_publisher'])

    if (window.location.href.includes('/channel/')) {
      this.forChannel = true
    }
    this.isTypeOfCollection = this.activatedRoute.snapshot.queryParams.collectionType ? true : false
    this.collectionType = this.activatedRoute.snapshot.queryParams.collectionType
    // if (this.configSvc.rootOrg === EInstance.INSTANCE) {
    // this.logo = false
    // }
    if (this.configSvc.instanceConfig) {
      this.appIcon = this.domSanitizer.bypassSecurityTrustResourceUrl(
        `/assets/instances/eagle/app_logos/aastar-logo.svg`
        // this.configSvc.instanceConfig.logos.app,
      )
    }
    this.viewerDataServiceSubscription = this.viewerDataSvc.tocChangeSubject.subscribe(data => {
      this.prevResourceUrl = data.prevResource
      if (data.nextResource === '/author/viewer//undefined') {
        this.nextResourceUrl = null
      } else {
        this.nextResourceUrl = data.nextResource
      }

      if (this.resourceId !== this.viewerDataSvc.resourceId) {
        this.resourceId = this.viewerDataSvc.resourceId as string
        this.resourceName = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.name : ''
      }
    })
    this.paramSubscription = this.activatedRoute.queryParamMap.subscribe(async params => {
      this.collectionId = params.get('collectionId') as string
      this.isPreview = params.get('preview') === 'true' ? true : false
    })
    this.viewerDataServiceResourceSubscription = this.viewerDataSvc.changedSubject.subscribe(
      _data => {
        this.resourceId = this.viewerDataSvc.resourceId as string
        this.resourceName = this.viewerDataSvc.resource ? this.viewerDataSvc.resource.name : ''
      },
    )
  }

  ngOnDestroy() {
    if (this.viewerDataServiceSubscription) {
      this.viewerDataServiceSubscription.unsubscribe()
    }
    if (this.paramSubscription) {
      this.paramSubscription.unsubscribe()
    }
    if (this.viewerDataServiceResourceSubscription) {
      this.viewerDataServiceResourceSubscription.unsubscribe()
    }
  }

  toggleSideBar() {
    this.toggle.emit()
  }

  back() {
    try {
      if (window.self !== window.top) {
        return
      }
      window.history.back()
    } catch (_ex) {
      window.history.back()
    }

  }

  sendForReview(value: string) {
    this.isReviewer = this.accessService.hasRole(['content_reviewer'])

    console.log("value: ", value, this.isReviewer)
    if (value == 'review' && this.isReviewer) {
      const dialogRef = this.dialog.open(ReviewDialogComponent, {
        width: '480px',
        height: '275px',
        data: "yes",
      })
      dialogRef.afterClosed().subscribe((d) => {
        console.log("d", d)
      })
    } else {
      sessionStorage.setItem('isReviewClicked', 'true')

      this.router.navigateByUrl(`/author/editor/${this.activatedRoute.snapshot.queryParams.collectionId}`)
      console.log(this.activatedRoute.snapshot.queryParams.collectionId)
    }

  }
}
