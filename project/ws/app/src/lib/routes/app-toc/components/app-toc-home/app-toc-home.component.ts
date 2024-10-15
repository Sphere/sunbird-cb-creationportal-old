import { Component, OnDestroy, OnInit, AfterViewChecked, HostListener, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core'
import { ActivatedRoute, Data } from '@angular/router'
import { NsContent, WidgetContentService, ContentProgressService } from '@ws-widget/collection'
import { NsWidgetResolver } from '@ws-widget/resolver'
import { ConfigurationsService, LoggerService, NsPage } from '@ws-widget/utils'
import { Subscription, Observable } from 'rxjs'
import { share } from 'rxjs/operators'
import { NsAppToc } from '../../models/app-toc.model'
import { AppTocService } from '../../services/app-toc.service'
import { SafeHtml, DomSanitizer } from '@angular/platform-browser'
import { AccessControlService } from '@ws/author/src/public-api'
import { Location } from '@angular/common'

export enum ErrorType {
  internalServer = 'internalServer',
  serviceUnavailable = 'serviceUnavailable',
  somethingWrong = 'somethingWrong',
}
@Component({
  selector: 'ws-app-app-toc-home',
  templateUrl: './app-toc-home.component.html',
  styleUrls: ['./app-toc-home.component.scss'],
})
export class AppTocHomeComponent implements OnInit, OnDestroy, AfterViewChecked {
  banners: NsAppToc.ITocBanner | null = null
  content: any | null = null
  hasPublishAccess: any = false
  errorCode: NsAppToc.EWsTocErrorCode | null = null
  resumeData: NsContent.IContinueLearningData | null = null
  routeSubscription: Subscription | null = null
  pageNavbar: Partial<NsPage.INavBackground> = this.configSvc.pageNavBar
  isCohortsRestricted = false
  sticky = false
  isInIframe = false
  forPreview = window.location.href.includes('/author/')
  analytics = this.route.snapshot.data.pageData.data.analytics
  errorWidgetData: NsWidgetResolver.IRenderConfigWithTypedData<any> = {
    widgetType: 'errorResolver',
    widgetSubType: 'errorResolver',
    widgetData: {
      errorType: 'internalServer',
    },
  }
  isAuthor = false
  authorBtnWidget: NsPage.INavLink = {
    actionBtnId: 'feature_authoring',
    config: {
      type: 'mat-button',
    },
  }
  optmisticPercentage: number = 100
  // Define roles array
  roles: string[] = ['reviewer', 'publisher', 'creator'];
  // Filter comments for each role
  filteredComments: { [key: string]: any } = {};
  tocConfig: any = null
  contentTypes = NsContent.EContentTypes
  askAuthorEnabled = true
  trainingLHubEnabled = false
  trainingLHubCount$?: Observable<number>
  body: SafeHtml | null = null
  viewMoreRelatedTopics = false
  hasTocStructure = false
  tocStructure: NsAppToc.ITocStructure | null = null
  contentParents: { [key: string]: NsAppToc.IContentParentResponse[] } = {}
  objKeys = Object.keys
  fragment!: string
  activeFragment = this.route.fragment.pipe(share())
  currentFragment = 'overview'
  showScroll!: boolean
  showScrollHeight = 300
  hideScrollHeight = 10
  elementPosition: any
  changeText: string = 'home'
  commentsList: any
  @ViewChild('stickyMenu', { static: true }) menuElement!: ElementRef
  @HostListener('window:scroll', ['$event'])
  isLoading = false
  isReviewer: boolean = false
  isPublisher: boolean = false
  isCreator: boolean = false
  handleScroll() {
    const windowScroll = window.pageYOffset
    if (windowScroll >= this.elementPosition - 100) {
      this.sticky = true
    } else {
      this.sticky = false
    }
  }

  constructor(
    private route: ActivatedRoute,
    private contentSvc: WidgetContentService,
    private tocSvc: AppTocService,
    private loggerSvc: LoggerService,
    private configSvc: ConfigurationsService,
    private domSanitizer: DomSanitizer,
    private authAccessControlSvc: AccessControlService,
    private location: Location,
    private progressSvc: ContentProgressService,
    private cdr: ChangeDetectorRef
  ) {
    // Initialize filteredComments for each role as an empty array
    this.roles.forEach(role => {
      this.filteredComments[role] = []
    })
    this.isCreator = this.authAccessControlSvc.hasRole(['content_creator'])

    this.isReviewer = this.authAccessControlSvc.hasRole(['content_reviewer'])
    this.isPublisher = this.authAccessControlSvc.hasRole(['content_publisher'])
    if (this.isCreator) {
      this.roles = ['reviewer', 'publisher']
    } else if (this.isReviewer) {
      this.roles = ['creator', 'publisher']
    } else if (this.isPublisher) {
      this.roles = ['creator', 'reviewer']
    }
    this.tocSvc.currentMessage.subscribe(async (data: any) => {
      console.log("yes here", data)
      if (data === 'comments') {
        this.isLoading = true
        this.changeText = 'comments'
        if (this.content) {
          this.progressSvc.getComments(this.content.identifier).subscribe(res => {
            console.log(res)
            this.commentsList = res
            // Filter comments for each role
            this.roles.forEach(role => {
              this.filteredComments[role] = this.commentsList.filter((comment: { role: string }) => comment.role === role)
            })
            this.isLoading = false
          })
        }
      } else if (data === 'preview') {
        this.changeText = 'preview'
        this.cdr.detectChanges()
      } else if (data === 'history') {
        this.isLoading = true
        this.changeText = 'history'
        if (this.content) {
          this.progressSvc.getComments(this.content.identifier).subscribe(res => {
            this.commentsList = res
            this.isLoading = false
          })
        }
      } else if (data === 'backFromPreview') {
        this.changeText = 'backFromPreview'
      }
    })
  }

  ngOnInit() {

    // this.route.fragment.subscribe(fragment => { this.fragment = fragment })
    this.location.subscribe((event: any) => {
      console.log(event)
      if (event) {
        window.location.assign(`${location.origin}/${event.url}`)
      }
    })
    try {
      this.isInIframe = window.self !== window.top
    } catch (_ex) {
      this.isInIframe = false
    }
    if (this.route) {
      this.routeSubscription = this.route.data.subscribe((data: Data) => {
        // CHecking for JSON DATA
        if (this.checkJson(data.content.data.creatorContacts)) {
          data.content.data.creatorContacts = JSON.parse(data.content.data.creatorContacts)
        }

        if (this.checkJson(data.content.data.creatorDetails)) {
          data.content.data.creatorDetails = JSON.parse(data.content.data.creatorDetails)
        }

        if (this.checkJson(data.content.data.reviewer)) {
          data.content.data.reviewer = JSON.parse(data.content.data.reviewer)
        }

        if (this.checkJson(data.content.data.publisherDetails)) {
          data.content.data.publisherDetails = JSON.parse(data.content.data.publisherDetails)
        }

        this.banners = data.pageData.data.banners
        this.tocSvc.subtitleOnBanners = data.pageData.data.subtitleOnBanners || false
        this.tocSvc.showDescription = data.pageData.data.showDescription || false
        this.tocConfig = data.pageData.data
        this.initData(data)
      })
    }
    this.currentFragment = 'overview'
    this.route.fragment.subscribe((fragment: string) => {
      this.currentFragment = fragment || 'overview'
    })
  }

  toggleComments(item: any) {
    item.readComments = !item.readComments
  }

  showMenuItem(menuType: string) {
    let returnValue = false
    switch (menuType) {
      case 'edit':
      case 'delete':
        if (this.content.status === 'Draft' || this.content.status === 'Live') {
          returnValue = this.authAccessControlSvc.hasAccess(this.content)
        }
        if (this.content.authoringDisabled && menuType === 'edit') {
          returnValue = false
        }
        break
      case 'moveToDraft':
        if (
          this.content.status === 'InReview' ||
          this.content.status === 'Unpublished' ||
          this.content.status === 'Reviewed' ||
          this.content.status === 'QualityReview' ||
          this.content.status === 'Draft'
        ) {
          returnValue = this.authAccessControlSvc.hasAccess({ ...this.content, status: 'Draft' })
        }
        break
      case 'moveToInReview':
        if (this.content.status === 'Reviewed' || this.content.status === 'QualityReview') {
          returnValue = this.authAccessControlSvc.hasAccess({ ...this.content, status: 'InReview' })
        }
        break
      case 'publish':
        // if (this.content.status === 'Reviewed') {
        if (this.content.reviewStatus === 'Reviewed' && this.content.status === 'Review') {
          returnValue = this.authAccessControlSvc.hasAccess(this.content)
        }
        break
      case 'unpublish':
        if (this.content.status === 'Live') {
          returnValue = this.authAccessControlSvc.hasAccess(this.content)
        }
        break
      case 'review':
        // if (this.content.status === 'Review' || this.content.status === 'QualityReview') {
        if (this.content.reviewStatus === 'InReview' && this.content.status === 'Review') {
          returnValue = this.authAccessControlSvc.hasAccess(this.content)
        }
        break
      case 'preview':
        // if (this.content.status === 'Review' || this.content.status === 'QualityReview') {
        if ((this.content.reviewStatus === 'InReview' && this.content.status === 'Review') || (this.content.reviewStatus === 'Reviewed' && this.content.status === 'Review')) {
          returnValue = this.authAccessControlSvc.hasAccess(this.content)
        }
        break
      case 'lang':
        returnValue = this.authAccessControlSvc.hasAccess({ ...this.content, status: 'Draft' })
        break
    }
    return returnValue
  }

  redirect(url: string) {
    window.location.assign(`${location.origin}${url}`)
  }

  // ngAfterViewInit() {
  //   this.elementPosition = this.menuElement.nativeElement.parentElement.offsetTop
  // }
  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe()
    }
  }

  ngAfterViewChecked(): void {
    try {
      if (this.fragment) {
        // tslint:disable-next-line: no-non-null-assertion
        document!.querySelector(`#${this.fragment}`)!.scrollTo({
          top: 80,
          behavior: 'smooth',
        })
      }
    } catch (e) { }
  }

  checkJson(str: any) {
    try {
      JSON.parse(str)
    } catch (e) {
      return false
    }
    return true
  }

  get enableAnalytics(): boolean {
    if (this.configSvc.restrictedFeatures) {
      return !this.configSvc.restrictedFeatures.has('tocAnalytics')
    }
    return false
  }

  private initData(data: Data) {
    const initData = this.tocSvc.initData(data)
    this.content = initData.content
    this.hasPublishAccess = this.showMenuItem('publish')
    this.errorCode = initData.errorCode
    switch (this.errorCode) {
      case NsAppToc.EWsTocErrorCode.API_FAILURE: {
        this.errorWidgetData.widgetData.errorType = ErrorType.internalServer
        break
      }
      case NsAppToc.EWsTocErrorCode.INVALID_DATA: {
        this.errorWidgetData.widgetData.errorType = ErrorType.internalServer
        break
      }
      case NsAppToc.EWsTocErrorCode.NO_DATA: {
        this.errorWidgetData.widgetData.errorType = ErrorType.internalServer
        break
      }
      default: {
        this.errorWidgetData.widgetData.errorType = ErrorType.somethingWrong
        break
      }
    }
    if (this.content && this.content.identifier && !this.forPreview) {
      this.getContinueLearningData(this.content.identifier)
    }
    this.body = this.domSanitizer.bypassSecurityTrustHtml(
      this.content && this.content.body
        ? this.forPreview
          ? this.authAccessControlSvc.proxyToAuthoringUrl(this.content.body)
          : this.content.body
        : '',
    )
    this.contentParents = {}
  }

  private getContinueLearningData(contentId: string) {
    this.resumeData = null
    this.contentSvc.fetchContentHistory(contentId).subscribe(
      data => {
        this.resumeData = data
      },
      (error: any) => {
        this.loggerSvc.error('CONTENT HISTORY FETCH ERROR >', error)
      },
    )
  }

  // @HostListener('window:scroll', [])
  // onWindowScroll() {
  //   if ((window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop) > this.showScrollHeight) {
  //     this.showScroll = true
  //   } else if (this.showScroll && (window.pageYOffset || document.documentElement.scrollTop
  //     || document.body.scrollTop) < this.hideScrollHeight) {
  //     this.showScroll = false
  //   }
  // }

  scrollToTop() {
    (function smoothscroll() {
      const currentScroll = document.documentElement.scrollTop || document.body.scrollTop
      if (currentScroll > 0) {
        // window.requestAnimationFrame(smoothscroll)
        // window.scrollTo(0, currentScroll - (currentScroll / 5))
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        })
      }
    })()
  }
}
