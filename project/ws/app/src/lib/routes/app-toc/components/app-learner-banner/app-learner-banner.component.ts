import { Component, Input, OnChanges, OnDestroy, OnInit, HostListener, Inject } from '@angular/core'
import { MatDialog } from '@angular/material'
import { DomSanitizer, SafeStyle } from '@angular/platform-browser'
import { Router } from '@angular/router'
import {
  NsContent,
  WidgetContentService,
  viewerRouteGenerator
} from '@ws-widget/collection'
import { TFetchStatus } from '@ws-widget/utils'
import { UtilityService } from '@ws-widget/utils/src/lib/services/utility.service'
import { Subscription } from 'rxjs'
import { NsAppToc, NsCohorts } from '../../models/app-toc.model'
import { AppTocService } from '../../services/app-toc.service'
import { MobileAppsService } from 'src/app/services/mobile-apps.service'
import { FormControl, Validators } from '@angular/forms'
import { DOCUMENT } from '@angular/common'
import { AppTocDesktopModalComponent } from '../app-toc-desktop-modal/app-toc-desktop-modal.component'
import { AppTocCertificateModalComponent } from '../app-toc-certificate-modal/app-toc-certificate-modal.component'
// import { AppTocDesktopModalComponent } from '../app-toc-desktop-modal/app-toc-desktop-modal.component'
// import { AppTocCertificateModalComponent } from '../app-toc-certificate-modal/app-toc-certificate-modal.component'
// import { ConfirmmodalComponent } from '../../../../../../../viewer/src/lib/plugins/quiz/confirm-modal-component'

@Component({
  selector: 'ws-app-learner-banner',
  templateUrl: './app-learner-banner.component.html',
  styleUrls: ['./app-learner-banner.component.scss'],
  providers: [
    // AccessControlService
  ],
})
export class AppLearnerBannerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() banners: NsAppToc.ITocBanner | null = null
  @Input() content: NsContent.IContent | null = null
  @Input() resumeData: NsContent.IContinueLearningData | null = null
  // @Input() analytics: NsAnalytics.IAnalytics | null = null
  @Input() forPreview = false
  @Input() batchData!: any
  @Input() enrollCourse!: any
  @Input() resumeResource: NsContent.IContinueLearningData | null = null
  @Input() optmisticPercentage: number | null = null
  @Input() finishedPercentage: any
  batchControl = new FormControl('', Validators.required)
  contentTypes = NsContent.EContentTypes
  isTocBanner = true
  issueCertificate = false
  updatedContentFound: any
  updatedContentStatus = false
  // contentProgress = 0
  bannerUrl: SafeStyle | null = null
  routePath = 'overview'
  validPaths = new Set(['overview', 'contents',
    // 'analytics'
  ])
  averageRating: any = ''
  totalRatings: any = ''
  routerParamSubscription: Subscription | null = null
  routeSubscription: Subscription | null = null
  firstResourceLink: { url: string; queryParams: { [key: string]: any } } | null = null
  resumeDataLink: { url: string; queryParams: { [key: string]: any } } | null = null
  isAssessVisible = false
  isPracticeVisible = false
  editButton = false
  reviewButton = false
  // analyticsDataClient: any = null
  // btnPlaylistConfig: NsPlaylist.IBtnPlaylist | null = null
  // btnGoalsConfig: NsGoal.IBtnGoal | null = null
  isRegistrationSupported = false
  checkRegistrationSources: Set<string> = new Set([
    'SkillSoft Digitalization',
    'SkillSoft Leadership',
    'Pluralsight',
  ])
  isUserRegistered = false
  actionBtnStatus = 'wait'
  showIntranetMessage = false
  showTakeAssessment: NsAppToc.IPostAssessment | null = null
  externalContentFetchStatus: TFetchStatus = 'done'
  registerForExternal = false
  isGoalsEnabled = false
  contextId?: string
  contextPath?: string
  tocConfig: any = null
  cohortResults: {
    [key: string]: { hasError: boolean; contents: NsCohorts.ICohortsContent[], count: Number }
  } = {}
  identifier: any
  cohortTypesEnum = NsCohorts.ECohortTypes
  // learnersCount:Number
  defaultSLogo = ''
  disableEnrollBtn = false
  batchId!: string
  displayStyle = 'none'
  enrolledCourse: any
  lastCourseID: any
  certificateMsg?: any
  stars: number[] = [1, 2, 3, 4, 5];

  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
    private tocSvc: AppTocService,
    // private configSvc: ConfigurationsService,
    // private progressSvc: ContentProgressService,
    private contentSvc: WidgetContentService,
    private utilitySvc: UtilityService,
    private mobileAppsSvc: MobileAppsService,
    // private snackBar: MatSnackBar,
    public createBatchDialog: MatDialog,
    private dialog: MatDialog,
    @Inject(DOCUMENT) public document: Document
  ) {
  }
  @HostListener('window:popstate', ['$event'])
  onPopState() {
    let url = sessionStorage.getItem('cURL') || '/page/home'
    if (url) {
      location.href = url
    }


  }

  ngOnInit() {
    console.log("learner", this.content)


  }

  enrollUser() {
    if (this.content) {
      const firstPlayableContent = this.contentSvc.getFirstChildInHierarchy(this.content)
      this.firstResourceLink = viewerRouteGenerator(
        firstPlayableContent.identifier,
        firstPlayableContent.mimeType,
        this.isResource ? undefined : this.content.identifier,
        this.isResource ? undefined : this.content.contentType,
        this.forPreview,
        this.content.primaryCategory
      )
    }
    setTimeout(() => {
      if (this.firstResourceLink) {
        const query = this.generateQuery('START')
        this.router.navigate([this.firstResourceLink.url], { queryParams: query })
      }
    }, 500)

  }

  getStarImage(index: number): string {
    const fullStarUrl = '/cbp-assets/icons/toc_star.png'
    const halfStarUrl = '/cbp-assets/icons/Half_star1.svg'
    const emptyStarUrl = '/cbp-assets/icons/empty_star.png'
    this.averageRating = 4.5
    const decimalPart = this.averageRating - Math.floor(this.averageRating) // Calculate the decimal part of the average rating

    if (index + 1 <= Math.floor(this.averageRating)) {
      return fullStarUrl // Full star
    } else if (decimalPart >= 0.1 && decimalPart <= 0.9 && index === Math.floor(this.averageRating)) {
      return halfStarUrl // Half star
    } else {
      return emptyStarUrl // Empty star
    }
  }



  setConfirmDialogStatus(percentage: any) {
    this.contentSvc.showConformation = percentage
  }

  get showIntranetMsg() {
    if (this.isMobile) {
      return true
    }
    return this.showIntranetMessage
  }

  get showStart() {
    return this.tocSvc.showStartButton(this.content)
  }

  get isPostAssessment(): boolean {
    if (!(this.tocConfig)) {
      return false
    }
    if (this.content) {
      return (
        this.content.contentType === NsContent.EContentTypes.COURSE &&
        this.content.learningMode === 'Instructor-Led'
      )
    }
    return false
  }

  get isMobile(): boolean {
    return this.utilitySvc.isMobile
  }

  get showSubtitleOnBanner() {
    return this.tocSvc.subtitleOnBanners
  }
  redirect() {
    this.tocSvc.changeMessage('backFromPreview')
  }

  uniqueIdsByContentType(obj: any, contentType: any, uniqueIds = new Set()) {
    // Check if the current object is an array
    if (Array.isArray(obj)) {
      // If array, recursively call extractUniqueIds for each element
      obj.forEach(item => this.uniqueIdsByContentType(item, contentType, uniqueIds))
    } else if (typeof obj === 'object' && obj !== null) {
      // If object, check if it has contentType and add id to uniqueIds if contentType matches
      if (obj.contentType === contentType && obj.identifier !== undefined) {
        uniqueIds.add(obj.identifier)
      }
      // Recursively call extractUniqueIds for each property value
      Object.values(obj).forEach(value => this.uniqueIdsByContentType(value, contentType, uniqueIds))
    }
    // Return uniqueIds as an array (if needed)
    return [...uniqueIds]
  };

  ngOnChanges() {
    this.assignPathAndUpdateBanner(this.router.url)
  }
  private getBatchId(): string {
    let batchId = ''
    if (this.batchData && this.batchData.content) {
      for (const batch of this.batchData.content) {
        batchId = batch.batchId
      }
    }
    return batchId
  }


  redirectPage(updatedContentFound: any) {
    console.log("updatedContentFound: ", updatedContentFound)
  }

  downloadCertificate(content: any) {
    console.log("content: ", content)
    this.openPopup(content)
  }

  redirectFirstResource(url: any) {
    let url1 = `${this.firstResourceLink!.url}?primaryCategory=Learning%20Resource&collectionId=${url.queryParams!.collectionId}&collectionType=Course&batchId=${url.queryParams!.batchId}`
    this.router.navigateByUrl(url1)
  }


  enrollApi() {

  }

  findObjectById(array: any, id: any): any {
    console.log(array, id)
    for (const item of array) {
      if (item.identifier === id) {
        return item
      }
      if (item.children) {
        const result = this.findObjectById(item.children, id)
        if (result) {
          return result
        }
      }
    }
    return null
  }

  sendApi() {

  }

  closePopup() {
    this.displayStyle = 'none'
  }


  get showInstructorLedMsg() {
    return (
      this.showActionButtons &&
      this.content &&
      this.content.learningMode === 'Instructor-Led' &&
      !this.content.children.length &&
      !this.content.artifactUrl
    )
  }

  get isHeaderHidden() {
    return this.isResource && this.content && !this.content.artifactUrl.length
  }


  get showActionButtons() {
    return (
      this.actionBtnStatus !== 'wait' &&
      this.content &&
      this.content.status !== 'Deleted' &&
      this.content.status !== 'Expired'
    )
  }

  get showButtonContainer() {
    return (
      this.actionBtnStatus === 'grant' &&
      !(this.isMobile && this.content && this.content.isInIntranet) &&
      !(
        this.content &&
        this.content.contentType === 'Course' &&
        this.content.children.length === 0 &&
        !this.content.artifactUrl
      ) &&
      !(this.content && this.content.contentType === 'Resource' && !this.content.artifactUrl)
    )
  }

  get isResource() {
    if (this.content) {
      const isResource = this.content.contentType === NsContent.EContentTypes.KNOWLEDGE_ARTIFACT ||
        this.content.contentType === NsContent.EContentTypes.RESOURCE || !this.content.children.length
      if (isResource) {
        this.mobileAppsSvc.sendViewerData(this.content)
      }
      return isResource
    }
    return false
  }

  showOrgprofile(orgId: string) {
    sessionStorage.setItem('currentURL', location.href)
    this.router.navigate(['/app/org-details'], { queryParams: { orgId } })
  }

  ngOnDestroy() {
    this.tocSvc.analyticsFetchStatus = 'none'
    if (this.routerParamSubscription) {
      this.routerParamSubscription.unsubscribe()
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe()
    }
  }



  private assignPathAndUpdateBanner(url: string) {
    const path = url.split('/').pop()
    if (path && this.validPaths.has(path)) {
      this.routePath = path
      this.updateBannerUrl()
    }
  }
  private updateBannerUrl() {
    if (this.banners) {
      this.bannerUrl = this.sanitizer.bypassSecurityTrustStyle(
        `url(${this.banners[this.routePath]})`,
      )
    }
  }

  get sanitizedIntroductoryVideoIcon() {
    if (this.content && this.content.introductoryVideoIcon) {
      return this.sanitizer.bypassSecurityTrustStyle(`url(${this.content.introductoryVideoIcon})`)
    }
    return null
  }

  generateQuery(type: 'RESUME' | 'START_OVER' | 'START'): { [key: string]: string } {

    if (this.firstResourceLink && (type === 'START' || type === 'START_OVER')) {
      let qParams: { [key: string]: string } = {
        ...this.firstResourceLink.queryParams,
        viewMode: type,
        batchId: this.getBatchId(),
      }
      if (this.contextId && this.contextPath) {
        qParams = {
          ...qParams,
          collectionId: this.contextId,
          collectionType: this.contextPath,
        }
      }
      if (this.forPreview) {
        delete qParams.viewMode
      }
      return qParams
    }
    if (this.resumeDataLink && type === 'RESUME') {
      let qParams: { [key: string]: string } = {
        ...this.resumeDataLink.queryParams,
        batchId: this.getBatchId(),
        viewMode: 'RESUME',
      }
      if (this.contextId && this.contextPath) {
        qParams = {
          ...qParams,
          collectionId: this.contextId,
          collectionType: this.contextPath,
        }
      }
      if (this.forPreview) {
        delete qParams.viewMode
      }
      return qParams
    }
    if (this.forPreview) {
      return {}
    }
    return {
      batchId: this.getBatchId(),
      viewMode: type,
    }
  }

  get isInIFrame(): boolean {
    try {
      return window.self !== window.top
    } catch (e) {
      return true
    }
  }



  openRating() {

  }
  readCourseRatingSummary() {


  }



  openPopup(content: any) {
    this.dialog.open(AppTocCertificateModalComponent, {
      width: '100vw',
      height: '80vh',
      data: { content, stype: 'DETAILS' },
      disableClose: false,
    })
  }
  openDetails(content: any, tocConfig: any) {
    this.dialog.open(AppTocDesktopModalComponent, {
      width: '600px',
      data: { content, tocConfig, type: 'DETAILS' },
      disableClose: true,
    })
  }
  openCompetency(content: any) {
    this.dialog.open(AppTocDesktopModalComponent, {
      width: '600px',
      data: { competency: content.competencies_v1, type: 'COMPETENCY' },
    })
  }
}
