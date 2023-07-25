import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { NsContent } from '@ws-widget/collection'
import { NsWidgetResolver } from '@ws-widget/resolver'
import { UtilityService, ValueService } from '@ws-widget/utils'
import { Subscription } from 'rxjs'
import { RootService } from '../../../../../src/app/component/root/root.service'
import { ApiService } from '../../../author/src/public-api'
import { TStatus, ViewerDataService } from './viewer-data.service'
import { MatDialog } from '@angular/material/dialog'
import { ReviewDialogComponent } from '@ws/viewer/src/lib/components/review-checklist/review-dialog.component'
import { ConfigurationsService } from '@ws-widget/utils'

export enum ErrorType {
  accessForbidden = 'accessForbidden',
  notFound = 'notFound',
  internalServer = 'internalServer',
  serviceUnavailable = 'serviceUnavailable',
  somethingWrong = 'somethingWrong',
  mimeTypeMismatch = 'mimeTypeMismatch',
  previewUnAuthorised = 'previewUnAuthorised',
}

@Component({
  selector: 'viewer-container',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss'],
  providers: [ApiService]
})
export class ViewerComponent implements OnInit, OnDestroy, AfterViewChecked {
  isReviewer: boolean = false;
  fullScreenContainer: HTMLElement | null = null
  content: NsContent.IContent | null = null
  errorType = ErrorType
  private isLtMedium$ = this.valueSvc.isLtMedium$
  sideNavBarOpened = true
  mode: 'over' | 'side' = 'side'
  forPreview = window.location.href.includes('/author/')
  isTypeOfCollection = true
  collectionId = this.activatedRoute.snapshot.queryParamMap.get('collectionId')
  status: TStatus = 'none'
  error: any | null = null
  isNotEmbed = true
  errorWidgetData: NsWidgetResolver.IRenderConfigWithTypedData<any> = {
    widgetType: 'errorResolver',
    widgetSubType: 'errorResolver',
    widgetData: {
      errorType: '',
    },
  }
  private screenSizeSubscription: Subscription | null = null
  private resourceChangeSubscription: Subscription | null = null
  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private valueSvc: ValueService,
    private dataSvc: ViewerDataService,
    private rootSvc: RootService,
    private utilitySvc: UtilityService,
    private changeDetector: ChangeDetectorRef,
    public dialog: MatDialog,
    private configService: ConfigurationsService,

  ) {
    this.rootSvc.showNavbarDisplay$.next(false)
    console.log("collectionId", this.collectionId)
  }

  getContentData(e: any) {
    e.activatedRoute.data.subscribe((data: { content: { data: NsContent.IContent } }) => {
      if (data.content && data.content.data) {
        this.content = data.content.data
      }
    })
  }
  showReviewChecklist() {
    const dialogRef = this.dialog.open(ReviewDialogComponent, {
      width: '480px',
      height: '275px',
      data: "yes",
    })
    dialogRef.afterClosed().subscribe((d) => {
      console.log("d", d)
    })
  }

  ngOnInit() {
    this.isReviewer = this.configService.userRoles!.has('content_reviewer')
    this.isNotEmbed = !(
      window.location.href.includes('/embed/') ||
      this.activatedRoute.snapshot.queryParams.embed === 'true'
    )
    this.isTypeOfCollection = this.activatedRoute.snapshot.queryParams.collectionType ? true : false
    this.screenSizeSubscription = this.isLtMedium$.subscribe(isSmall => {
      // this.sideNavBarOpened = !isSmall
      this.sideNavBarOpened = isSmall ? false : true
      this.mode = isSmall ? 'over' : 'side'
    })
    this.resourceChangeSubscription = this.dataSvc.changedSubject.subscribe(_ => {
      this.status = this.dataSvc.status
      this.error = this.dataSvc.error
      if (this.error && this.error.status) {
        switch (this.error.status) {
          case 403: {
            this.errorWidgetData.widgetData.errorType = ErrorType.accessForbidden
            break
          }
          case 404: {
            this.errorWidgetData.widgetData.errorType = ErrorType.notFound
            break
          }
          case 500: {
            this.errorWidgetData.widgetData.errorType = ErrorType.internalServer
            break
          }
          case 503: {
            this.errorWidgetData.widgetData.errorType = ErrorType.serviceUnavailable
            break
          }
          default: {
            this.errorWidgetData.widgetData.errorType = ErrorType.somethingWrong
            break
          }
        }
      }
      if (this.error && this.error.errorType === this.errorType.mimeTypeMismatch) {
        setTimeout(() => {
          this.router.navigate([this.error.probableUrl])
          // tslint:disable-next-line: align
        }, 3000)
      }
      if (this.error && this.error.errorType === this.errorType.previewUnAuthorised) {
      }
      // //console.log(this.error)
    })
  }

  ngAfterViewChecked() {
    const container = document.getElementById('fullScreenContainer')
    if (container) {
      this.fullScreenContainer = container
      this.changeDetector.detectChanges()
    } else {
      this.fullScreenContainer = null
      this.changeDetector.detectChanges()
    }
  }

  ngOnDestroy() {
    this.rootSvc.showNavbarDisplay$.next(true)
    if (this.screenSizeSubscription) {
      this.screenSizeSubscription.unsubscribe()
    }
    if (this.resourceChangeSubscription) {
      this.resourceChangeSubscription.unsubscribe()
    }
  }

  toggleSideBar() {
    this.sideNavBarOpened = true
    // this.sideNavBarOpened = !this.sideNavBarOpened
  }

  minimizeBar() {
    if (this.utilitySvc.isMobile) {
      this.sideNavBarOpened = false
    }
  }
}
