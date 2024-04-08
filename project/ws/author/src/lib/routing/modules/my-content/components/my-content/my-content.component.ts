import { AuthExpiryDateConfirmComponent } from '@ws/author/src/lib/modules/shared/components/auth-expiry-date-confirm/auth-expiry-date-confirm.component'
import { FlatTreeControl } from '@angular/cdk/tree'
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { MatDialog, MatSnackBar, MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material'
import { ActivatedRoute, Router } from '@angular/router'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'
import {
  IAuthoringPagination,
  IFilterMenuNode,
  IMenuFlatNode,
} from '@ws/author/src/lib/interface/authored'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { CommentsDialogComponent } from '@ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component'
import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'
import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { LoaderService } from '@ws/author/src/lib/services/loader.service'
import { Subscription } from 'rxjs'
import { MyContentService } from '../../services/my-content.service'
import { map } from 'rxjs/operators'
// import {
//   REVIEW_ROLE,
//   PUBLISH_ROLE,
//   CREATE_ROLE
// } from '@ws/author/src/lib/constants/content-role'
import * as l from 'lodash'
import { ConfigurationsService } from '@ws-widget/utils'
@Component({
  selector: 'ws-auth-my-content',
  templateUrl: './my-content.component.html',
  styleUrls: ['./my-content.component.scss'],
})
export class MyContentComponent implements OnInit, OnDestroy {

  constructor(
    private myContSvc: MyContentService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private loadService: LoaderService,
    private accessService: AccessControlService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authInitService: AuthInitService,
    private configService: ConfigurationsService,
  ) {
    this.filterMenuTreeControl = new FlatTreeControl<IMenuFlatNode>(
      node => node.levels,
      node => node.expandable,
    )
    this.filterMenuTreeFlattener = new MatTreeFlattener(
      this._transformer,
      node => node.levels,
      node => node.expandable,
      node => node.content,
    )
    this.dataSource = new MatTreeFlatDataSource(
      this.filterMenuTreeControl,
      this.filterMenuTreeFlattener,
    )
    this.dataSource.data = this.filterMenuItems
    this.userId = this.accessService.userId
    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor'])
  }
  public sideNavBarOpened = false
  newDesign = true
  filterMenuTreeControl: FlatTreeControl<IMenuFlatNode>
  filterMenuTreeFlattener: any
  public cardContent!: any[]
  public filters: any[] = []
  public status = 'draft'
  public fetchError = false
  contentType: string[] = []
  complexityLevel: string[] = []
  unit: string[] = []
  finalFilters: any = []
  allLanguages: any[] = []
  searchLanguage = ''
  public pagination!: IAuthoringPagination
  userId!: string
  totalContent!: number
  showLoadMore!: boolean
  routerSubscription = <Subscription>{}
  queryFilter = ''
  ordinals: any
  isAdmin = false
  currentAction: 'author' | 'reviewer' | 'expiry' | 'deleted' = 'author'
  listview = true
  links = ['Draft', 'Sent for review', 'Courses to publish', 'Published Courses', 'Retired'];
  activeLink = this.links[0];
  isSelectedColor: boolean = true
  isSelectedReviewCourse: boolean = false;
  isSelectedRevisionCourse: boolean = false;
  isSelectedSelfRevisionCourse: boolean = false;
  isSelectedPublishCourse: boolean = false;
  isSelectedToPublishCourse: boolean = false;
  isSelectedAllCourse: boolean = false
  isSelectedCourseWithoutCertificate: boolean = false
  isSelectedCourseWithCertificate: boolean = false
  isSelectedRetiredCourse: boolean = false;
  isSelectedCertificate: boolean = false
  link: string = ''
  isContentExpanded: boolean = false
  isCouseExpanded: boolean = false
  isSelfAssessmentExpanded: boolean = false
  isAiHubExanded: boolean = false
  isSelfAssessmentSelectedColor: boolean = false
  isSelectedSelfPublishCourse: boolean = false
  isSelectedSelfReviewCourse: boolean = false
  isSelectedToSelfPublishCourse: boolean = false
  isSelectedSelfRetiredCourse: boolean = false
  @ViewChild('searchInput', { static: false }) searchInputElem: ElementRef<any> = {} as ElementRef<
    any
  >

  // sideNavBarOpened = true
  isAihub = false
  panelOpenState = false
  allowReview = false
  allowAuthor = false
  allowAuthorContentCreate = false
  allowRedo = false
  allowPublish = false
  allowExpiry = false
  allowRestore = false
  isNewDesign = false
  currentTab = 'My Courses'
  currentStatus = 'Drafts'
  createCourseBtn = true
  public filterMenuItems: any = []

  dataSource: any

  count: any = {}
  hasChild = (_: number, node: IMenuFlatNode) => node.expandable

  private _transformer = (node: IFilterMenuNode, level: number) => {
    return {
      // expandable: !!node.content && node.content.length > 0,
      // displayName: node.displayName,
      // checked: node.checked,
      // type: node.type,
      // count: node.count,
      // levels: level,

      expandable: !!node.values && node.values.length > 0,
      displayName: node.name,
      checked: node.checked,
      type: node.name,
      count: node.count ? node.count : 0,
      levels: level,
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription.unsubscribe) {
      this.routerSubscription.unsubscribe()
    }
    this.loadService.changeLoad.next(false)
  }

  ngOnInit() {
    this.pagination = {
      offset: 0,
      limit: 24,
    }
    // this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })

    // tslint:disable-next-line:no-console
    console.log(this.configService.unMappedUser.roles)
    // this.newDesign = this.accessService.authoringConfig.newDesign
    this.newDesign = l.get(this.accessService, 'authoringConfig.newDesign')
    this.ordinals = this.authInitService.ordinals
    this.allLanguages = this.authInitService.ordinals.subTitles || []
    this.activatedRoute.queryParams.subscribe(params => {
      if (this.configService.unMappedUser.roles.length === 1 && this.configService.unMappedUser.roles[0] === "PUBLIC") {
        this.status = 'draft'
        this.links = ['Draft']
        this.navigateContents('Draft')
      } else {
        this.status = params.status
      }

      this.setAction()
      this.fetchContent(false)
    })
    // 'Draft', 'Sent for review', 'Courses to publish', 'Published Courses', 'Retired'
    this.allowAuthor = this.canShow('author')
    this.allowAuthorContentCreate = this.canShow('author_create')
    this.allowRedo = this.accessService.authoringConfig.allowRedo
    this.allowRestore = this.accessService.authoringConfig.allowRestore
    this.allowExpiry = this.accessService.authoringConfig.allowExpiry
    this.allowReview = this.canShow('review') && this.accessService.authoringConfig.allowReview
    this.allowPublish = this.canShow('publish') && this.accessService.authoringConfig.allowPublish
    this.isContentExpanded = true
    console.log("status: ", this.status)
    if (this.status === 'allCourses' || this.status === 'coursesWithoutCertificate' || this.status === 'courseWithCertificate') {
      this.links = ['All Courses', 'Courses without certificate', 'Courses with certificate']
      this.isContentExpanded = false
      this.isCouseExpanded = true
      this.isSelectedColor = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedPublishCourse = false
      this.isSelectedToPublishCourse = false
      if (this.status === 'allCourses') {
        this.currentTab = 'Manage Courses'
        this.currentStatus = 'All Courses'
        this.link = 'All Courses'
        this.activeLink = 'All Courses'
        this.isSelectedAllCourse = true
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
      } else if (this.status === 'coursesWithoutCertificate') {
        this.currentTab = 'Manage Courses'
        this.currentStatus = 'Courses without certificate'
        this.link = 'Courses without certificate'
        this.activeLink = 'Courses without certificate'
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = true
        this.isSelectedCourseWithCertificate = false
      } else if (this.status === 'courseWithCertificate') {
        this.currentTab = 'Manage Courses'
        this.currentStatus = 'Courses with certificate'
        this.link = 'Courses with certificate'
        this.activeLink = 'Courses with certificate'
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = true
      }

    } else if (this.status === 'Draft') {
      this.link = 'Draft'
      this.links = ['Draft', 'Sent for review', 'Published Courses', 'Retired']
      this.activeLink = 'Draft'
      this.isSelectedColor = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedPublishCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
    }
    // else if (this.allowPublish) {
    //   this.link = 'Courses to publish'
    //   this.links = ['Courses to publish', 'Published Courses']
    //   this.activeLink = this.links[0]
    //   this.isSelectedColor = false
    //   this.isSelectedReviewCourse = false
    //   this.isSelectedPublishCourse = false
    //   this.isSelectedToPublishCourse = true
    //   this.isSelectedAllCourse = false
    //   this.isSelectedCourseWithoutCertificate = false
    //   this.isSelectedCourseWithCertificate = false
    // } else if (this.allowReview) {
    //   this.link = 'Sent for review'
    //   this.links = ['Sent for review', 'Published Courses', 'Retired']
    //   this.activeLink = this.links[0]
    //   this.isSelectedColor = false
    //   this.isSelectedReviewCourse = true
    //   this.isSelectedPublishCourse = false
    //   this.isSelectedToPublishCourse = true
    //   this.isSelectedAllCourse = false
    //   this.isSelectedCourseWithoutCertificate = false
    //   this.isSelectedCourseWithCertificate = false
    // }
    // else if (this.allowAuthorContentCreate) {
    //   this.link = 'Draft'
    //   this.links = ['Draft', 'Sent for review', 'Published Courses', 'Retired']
    //   this.activeLink = 'Draft'
    //   this.isSelectedColor = true
    //   this.isSelectedReviewCourse = false
    //   this.isSelectedPublishCourse = false
    //   this.isSelectedToPublishCourse = false
    //   this.isSelectedAllCourse = false
    //   this.isSelectedCourseWithoutCertificate = false
    //   this.isSelectedCourseWithCertificate = false
    // }
    else if (this.status === 'selfAssessmentDraft') {
      console.log("yes here")
      this.isSelfAssessmentExpanded = true
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Draft'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = true
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'selfSentForReview') {
      this.isSelfAssessmentExpanded = true
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Sent for review'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = true
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'selfToPublishedCourse') {
      this.isSelfAssessmentExpanded = true
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Courses to Pubish'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = true
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
      console.log("this tab", this.currentTab)
    }
    else if (this.status === 'selfPublishedCourse') {
      this.isSelfAssessmentExpanded = true
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Published'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = true
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'selfRetiredCourse') {
      this.isSelfAssessmentExpanded = true
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Retired'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = true
    }
    else if (this.status === 'inreview') {
      this.isSelfAssessmentExpanded = false
      this.createCourseBtn = false
      this.currentTab = 'My Courses'
      this.currentStatus = 'Sent For Review'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = true
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'reviewed') {
      this.isSelfAssessmentExpanded = false
      this.createCourseBtn = false
      this.currentTab = 'My Courses'
      this.currentStatus = 'Published'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = true
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'published') {
      this.isSelfAssessmentExpanded = false
      this.createCourseBtn = false
      this.currentTab = 'My Courses'
      this.currentStatus = 'Published'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = true
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'unpublished') {
      this.isSelfAssessmentExpanded = false
      this.createCourseBtn = false
      this.currentTab = 'My Courses'
      this.currentStatus = 'Retired'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = true
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    } else if (this.status === 'courseRevision') {
      this.isSelfAssessmentExpanded = false
      this.createCourseBtn = false
      this.currentTab = 'My Courses'
      this.currentStatus = 'For Revision'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = true
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (this.status === 'AIHub') {
      this.createCourseBtn = false
      this.currentTab = 'AIHub'
      this.currentStatus = 'AIHub'
      this.link = 'AIHub'
      this.activeLink = 'AIHub'
      this.isSelectedColor = true
      this.isSelectedPublishCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedCertificate = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isAihub = true
    }
    else if (this.status === 'selfCourseRevision') {
      this.isSelfAssessmentExpanded = true
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'For Revision'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = true
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    console.log("this.currentTab", this.currentTab)
  }


  onClickReviewCourse(status: string) {
    console.log("status: ", status)
    if (this.allowReview && status == 'Draft') {
      status = 'Sent for review'
    }
    if (this.allowPublish && status == 'Draft') {
      status = 'Courses to publish'
    }
    if ((this.allowPublish) && (status == 'selfAssessmentDraft' || status == 'Self Courses to publish')) {
      status = 'Self Courses to publish'
    }
    this.link = status
    this.activeLink = status
    if (status == 'All Courses' || status == 'Courses without certificate' || status == 'Courses with certificate') {
      this.links = ['All Courses', 'Courses without certificate', 'Courses with certificate']
    } else if (this.allowAuthorContentCreate) {
      this.links = ['Draft', 'Sent for review', 'Published Courses', 'Retired']
    } else if (this.allowReview) {
      this.links = ['Sent for review', 'Published Courses', 'Retired']
    } else if (this.allowPublish) {
      this.links = ['Courses to publish', 'Published Courses']
    }
    if (status == 'Sent for review') {
      this.createCourseBtn = true
      this.currentTab = 'My Courses'
      this.currentStatus = 'Sent for review'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = true
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedCertificate = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (status == 'Courses to publish') {
      this.createCourseBtn = true
      this.currentTab = 'My Courses'
      this.currentStatus = 'Courses to publish'
      this.isSelectedColor = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedPublishCourse = false
      this.isSelectedToPublishCourse = true
      this.isSelectedRetiredCourse = false
      this.isSelectedCertificate = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (status == 'Published') {
      this.createCourseBtn = true
      this.currentTab = 'My Courses'
      this.currentStatus = 'Published'
      this.isSelectedColor = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedPublishCourse = true
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedCertificate = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (status == 'Retired') {
      this.createCourseBtn = true
      this.currentTab = 'My Courses'
      this.currentStatus = 'Retired'
      this.isSelectedColor = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedPublishCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = true
      this.isSelectedCertificate = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (status == 'Draft') {
      this.createCourseBtn = true
      this.currentTab = 'My Courses'
      this.currentStatus = 'Draft'
      this.isSelectedColor = true
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedCertificate = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false

    }
    else if (status == 'All Courses') {
      this.currentTab = 'Manage Courses'
      this.currentStatus = 'All Courses'
      this.isSelectedColor = true
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = true
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (status == 'Courses without certificate') {
      this.currentTab = 'Manage Courses'
      this.currentStatus = 'Courses without certificate'
      this.isSelectedColor = true
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = true
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }

    else if (status == 'Courses with certificate') {
      this.currentTab = 'Manage Courses'
      this.currentStatus = 'Courses with certificate'
      this.isSelectedColor = true
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = true
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false
    }
    else if (status == 'Self Assessment Draft' || status == 'selfAssessmentDraft') {
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Draft'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = true
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false

    }
    else if (status == 'Self Sent for review') {
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Sent for review'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = true
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false

    }
    else if (status == 'Self Courses to publish') {
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Courses to publish'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = true
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false

    }
    else if (status == 'Self Published Courses') {
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Published'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = true
      this.isSelectedSelfRetiredCourse = false

    }
    else if (status == 'Self Retired Courses') {
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'Retired'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = true

    }
    else if (status == 'for revision') {
      this.createCourseBtn = false
      this.currentTab = 'For revision'
      this.currentStatus = 'For revision'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = true
      this.isSelectedSelfRevisionCourse = false
      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false

    }
    else if (status == 'self for revision') {
      this.createCourseBtn = false
      this.currentTab = 'Self Assessment'
      this.currentStatus = 'For revision'
      this.isSelectedColor = false
      this.isSelectedPublishCourse = false
      this.isSelectedReviewCourse = false
      this.isSelectedRevisionCourse = false
      this.isSelectedSelfRevisionCourse = true

      this.isSelectedToPublishCourse = false
      this.isSelectedRetiredCourse = false
      this.isSelectedAllCourse = false
      this.isSelectedCourseWithoutCertificate = false
      this.isSelectedCourseWithCertificate = false
      this.isSelfAssessmentSelectedColor = false
      this.isSelectedSelfReviewCourse = false
      this.isSelectedSelfPublishCourse = false
      this.isSelectedToSelfPublishCourse = false
      this.isSelectedSelfRetiredCourse = false

    }

    this.navigateContents(status)
  }



  navigateContents(data: string): void {
    switch (data) {
      case 'AIHub':
        this.createCourseBtn = false
        this.currentTab = 'AIHub'
        this.currentStatus = 'AIHub'
        this.link = 'AIHub'
        this.activeLink = 'AIHub'
        this.isSelectedColor = true
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedReviewCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.isAihub = true
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'AIHub' } })
        break
      case 'Draft':
        this.isAihub = false
        this.createCourseBtn = true
        this.currentTab = 'My Courses'
        this.currentStatus = 'Draft'
        this.link = 'Draft'
        this.activeLink = 'Draft'
        this.isSelectedColor = true
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'draft' } })
        break

      case 'Sent for review':
        this.isAihub = false
        this.link = 'Sent for review'
        this.activeLink = 'Sent for review'
        this.isSelectedColor = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedReviewCourse = true
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false

        this.router.navigate(['/author/my-content'], { queryParams: { status: 'inreview' } })
        break
      case 'for revision':
        this.currentTab = 'My Courses'
        this.link = 'for revision'
        this.activeLink = 'for revision'
        this.isSelectedColor = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = true
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false

        this.router.navigate(['/author/my-content'], { queryParams: { status: 'courseRevision' } })
        break
      case 'self for revision':
        this.currentTab = 'Self Assessment'
        this.link = 'for revision'
        this.activeLink = 'for revision'
        this.isSelectedColor = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = true
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false

        this.router.navigate(['/author/my-content'], { queryParams: { status: 'selfCourseRevision' } })
        break
      case 'Courses to publish':
        this.isAihub = false
        this.link = 'Courses to publish'
        this.activeLink = 'Courses to publish'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = true
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false

        this.router.navigate(['/author/my-content'], { queryParams: { status: 'reviewed' } })
        break

      case 'Published Courses':
        this.isAihub = false
        this.createCourseBtn = true
        this.currentTab = 'My Courses'
        this.currentStatus = 'Published'
        this.link = 'Published Courses'
        this.activeLink = 'Published Courses'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = true
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'published' } })
        break



      case 'Retired':
        this.isAihub = false
        this.link = 'Retired'
        this.activeLink = 'Retired'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = true
        this.isSelectedCertificate = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'unpublished' } })
        break
      case 'All Courses':
        this.isAihub = false
        this.link = 'All Courses'
        this.activeLink = 'All Courses'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = true
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'allCourses' } })
        break
      case 'Courses without certificate':
        this.isAihub = false
        this.link = 'Courses without certificate'
        this.activeLink = 'Courses without certificate'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = true
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'coursesWithoutCertificate' } })
        break
      case 'Courses with certificate':
        this.isAihub = false
        this.link = 'Courses with certificate'
        this.activeLink = 'Courses with certificate'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = true
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'courseWithCertificate' } })
        break
      case 'selfAssessmentDraft':
      case 'Self Assessment Draft':
        this.isAihub = false
        this.link = 'Self Assessment Draft'
        this.activeLink = 'Self Assessment Draft'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'selfAssessmentDraft' } })
        break
      case 'Self Sent for review':
        this.isAihub = false
        this.link = 'Self Sent for review'
        this.activeLink = 'Self Sent for review'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'selfSentForReview' } })
        break
      case 'Self Courses to publish':
        this.isAihub = false
        this.link = 'Self Courses to publish'
        this.activeLink = 'Self Courses to publish'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'selfToPublishedCourse' } })
        break
      case 'Self Published Courses':
        this.isAihub = false
        this.link = 'Self Published Courses'
        this.activeLink = 'Self Published Courses'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'selfPublishedCourse' } })
        break
      case 'Self Retired Courses':
        this.isAihub = false
        this.link = 'Self Retired Courses'
        this.activeLink = 'Self Retired Courses'
        this.isSelectedColor = false
        this.isSelectedReviewCourse = false
        this.isSelectedRevisionCourse = false
        this.isSelectedSelfRevisionCourse = false
        this.isSelectedPublishCourse = false
        this.isSelectedToPublishCourse = false
        this.isSelectedRetiredCourse = false
        this.isSelectedAllCourse = false
        this.isSelectedCourseWithoutCertificate = false
        this.isSelectedCourseWithCertificate = false
        this.router.navigate(['/author/my-content'], { queryParams: { status: 'selfRetiredCourse' } })
        break
    }

  }

  fetchStatus() {
    switch (this.status) {
      case 'draft':
      case 'courseRevision':
      case 'selfCourseRevision':
      case 'rejected':
        return ['Draft']
      case 'selfSentForReview':
      case 'inreview':
        return ['Review', 'QualityReview']
      // return ['InReview', 'Reviewed', 'QualityReview']
      case 'review':
        return ['Review']
      case 'selfPublishedCourse':
      case 'published':
      case 'expiry':
        return ['Live']
      case 'allCourses':
        return ['Live']
      case 'coursesWithoutCertificate':
        return ['Live']
      case 'courseWithCertificate':
        return ['Live']
      case 'publish':
        return ['Review']
      // return ['Reviewed']
      case 'processing':
        return ['Processing']
      case 'unpublished':
      case 'selfRetiredCourse':
        return ['Unpublished', 'Retired']
      case 'deleted':
        return ['Deleted']
      case 'reviewed':
        return ['Review']
    }
    return ['Draft']
  }

  setAction() {
    switch (this.status) {
      case 'draft':
      case 'rejected':
      case 'inreview':
      case 'review':
      case 'published':
      case 'publish':
      case 'processing':
      case 'unpublished':
      case 'issueCertification':
      case 'allCourses':
      case 'coursesWithoutCertificate':
      case 'courseWithCertificate':
      case 'courseRevision':
      case 'selfCourseRevision':
      case 'deleted':
        this.currentAction = 'author'
        break
      case 'expiry':
        this.currentAction = 'expiry'
        break
    }
  }

  // fetchContent(loadMoreFlag: boolean, changeFilter = true) {
  //   console.log('fetch content ')
  //   const searchV6Data = this.myContSvc.getSearchBody(
  //     this.status,
  //     this.searchLanguage ? [this.searchLanguage] : [],
  //     loadMoreFlag ? this.pagination.offset : 0,
  //     this.queryFilter,
  //     this.isAdmin,
  //   )
  //   const requestData = {
  //     request: {
  //       locale: this.searchLanguage ? [this.searchLanguage] : [],
  //       query: this.queryFilter,
  //       filters: {
  //         status: this.fetchStatus(),
  //         creatorContacts: <string[]>[],
  //         trackContacts: <string[]>[],
  //         publisherDetails: <string[]>[],
  //         isMetaEditingDisabled: [false],
  //         isContentEditingDisabled: [false],
  //       },
  //       pageNo: loadMoreFlag ? this.pagination.offset : 0,
  //       sort: [{ lastUpdatedOn: 'desc' }],
  //       pageSize: this.pagination.limit,
  //       uuid: this.userId,
  //       rootOrg: this.accessService.rootOrg,
  //       // this is for Author Only
  //       isUserRecordEnabled: !this.isAdmin,
  //     },
  //   }
  //   if (this.finalFilters.length) {
  //     this.finalFilters.forEach((v: any) => {
  //       searchV6Data.filters.forEach((filter: any) => {
  //         filter.andFilters[0] = {
  //           ...filter.andFilters[0],
  //           [v.key]: v.value,
  //         }
  //       })
  //       requestData.request.filters = { ...requestData.request.filters, [v.key]: v.value }
  //     })
  //   }
  //   if (this.queryFilter) {
  //     delete requestData.request.sort
  //   }
  //   if (
  //     [
  //       'draft',
  //       'rejected',
  //       'inreview',
  //       'published',
  //       'unpublished',
  //       'processing',
  //       'deleted',
  //     ].indexOf(this.status) > -1 &&
  //     !this.isAdmin
  //   ) {
  //     requestData.request.filters.creatorContacts.push(this.userId)
  //   }
  //   if (this.status === 'review' && !this.isAdmin) {
  //     requestData.request.filters.trackContacts.push(this.userId)
  //   }
  //   if (this.status === 'publish' && !this.isAdmin) {
  //     requestData.request.filters.publisherDetails.push(this.userId)
  //   }

  //   this.loadService.changeLoad.next(true)
  //   const observable =
  //     this.status === 'expiry' || this.newDesign
  //       ? this.myContSvc.fetchFromSearchV6(searchV6Data, this.isAdmin).pipe(
  //         map((v: any) => {
  //           return {
  //             result: {
  //               response: v,
  //             },
  //           }
  //         }),
  //       )
  //       : this.myContSvc.fetchContent(requestData)
  //   this.loadService.changeLoad.next(true)
  //   observable.subscribe(
  //     data => {
  //       this.loadService.changeLoad.next(false)
  //       if (changeFilter) {
  //         this.filterMenuItems =
  //           data && data.result && data.result.response && data.result.response.filters
  //             ? data.result.response.filters
  //             : this.filterMenuItems
  //         this.dataSource.data = this.filterMenuItems
  //       }
  //       this.cardContent =
  //         loadMoreFlag && !this.queryFilter
  //           ? (this.cardContent || []).concat(
  //             data && data.result && data.result.response ? data.result.response.result : [],
  //           )
  //           : data && data.result.response
  //             ? data.result.response.result
  //             : []
  //       this.totalContent = data && data.result.response ? data.result.response.totalHits : 0
  //       this.showLoadMore =
  //         this.pagination.offset * this.pagination.limit + this.pagination.limit < this.totalContent
  //           ? true
  //           : false
  //       this.fetchError = false
  //     },
  //     () => {
  //       this.fetchError = true
  //       this.cardContent = []
  //       this.showLoadMore = false
  //       this.loadService.changeLoad.next(false)
  //     },
  //   )
  // }

  // fetchContent(loadMoreFlag: boolean, changeFilter = true) {
  //   const searchV6Data = this.myContSvc.getSearchBody(
  //     this.status,
  //     this.searchLanguage ? [this.searchLanguage] : [],
  //     loadMoreFlag ? this.pagination.offset : 0,
  //     this.queryFilter,
  //     this.isAdmin,
  //   )

  //   console.log('fetchContent my-component ')

  //   let isUserRecordEnabled = true
  //   const adminOnlyRoles = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content-creator'])
  //   if (adminOnlyRoles && isUserRecordEnabled) {
  //     isUserRecordEnabled = true
  //   } else if (this.accessService.hasRole(['reviewer', 'publisher'])) {
  //     isUserRecordEnabled = false
  //   }

  //   const requestData = {
  //     locale: this.searchLanguage ? [this.searchLanguage] : ['en'],
  //     query: this.queryFilter,
  //     request: {
  //       query: this.queryFilter,
  //       filters: {
  //         status: this.fetchStatus(),
  //         // creatorContacts: <string[]>[],
  //         // trackContacts: <string[]>[],
  //         // publisherDetails: <string[]>[],
  //         // isMetaEditingDisabled: [false],
  //         // isContentEditingDisabled: [false]
  //         contentType: [                              // filter according to type
  //           'Collection',
  //           'Course',
  //           'Learning Path',
  //         ],
  //       },
  //       // pageNo: loadMoreFlag ? this.pagination.offset : 0,
  //       sort_by: { lastUpdatedOn: 'desc' },
  //       // pageSize: this.pagination.limit,
  //       fields: [
  //         'name',
  //         'appIcon',
  //         'mimeType',
  //         'gradeLevel',
  //         'identifier',
  //         'medium',
  //         'pkgVersion',
  //         'board',
  //         'subject',
  //         'resourceType',
  //         'primaryCategory',
  //         'contentType',
  //         'channel',
  //         'organisation',
  //         'trackable',
  //         'status',
  //         'authoringDisabled',
  //       ],
  //       facets: [
  //         'primaryCategory',
  //         'mimeType',
  //       ],
  //       // pageNo: loadMoreFlag ? this.pagination.offset : 0,
  //       // sort: [{ lastUpdatedOn: 'desc' }],
  //       // pageSize: this.pagination.limit,
  //       // uuid: this.userId,
  //       // rootOrg: this.accessService.rootOrg,
  //       // // this is for Author Only
  //       // isUserRecordEnabled: true,
  //     },
  //   }

  //   if (this.finalFilters.length) {
  //     this.finalFilters.forEach((v: any) => {
  //       searchV6Data.filters.forEach((filter: any) => {
  //         filter.andFilters[0] = {
  //           ...filter.andFilters[0],
  //           [v.key]: v.value,
  //         }
  //       })
  //       requestData.request.filters = { ...requestData.request.filters, [v.key]: v.value }
  //     })
  //   }

  //   this.loadService.changeLoad.next(true)
  //   const observable =
  //     this.status === 'expiry' || this.newDesign
  //       ? this.myContSvc.fetchFromSearchV6(searchV6Data, this.isAdmin).pipe(
  //         map((v: any) => {
  //           return {
  //             result: {
  //               response: v,
  //             },
  //           }
  //         }),
  //       )
  //       : this.myContSvc.fetchContent(requestData)
  //   this.loadService.changeLoad.next(false)

  //   observable.subscribe(
  //     data => {
  //       this.loadService.changeLoad.next(false)
  //       if (changeFilter) {
  //         this.filterMenuItems =
  //           data && data.result && data.result.facets
  //             ? data.result.facets
  //             : this.filterMenuItems
  //         this.dataSource.data = this.filterMenuItems
  //       }
  //       this.cardContent =
  //         loadMoreFlag && !this.queryFilter
  //           ? (this.cardContent || []).concat(
  //             data && data.result ? data.result.content : [],
  //           )
  //           : data && data.result.content
  //             ? data.result.content
  //             : []
  //       this.totalContent = data && data.result ? data.result.count : 0
  //       this.showLoadMore =
  //         this.pagination.offset * this.pagination.limit + this.pagination.limit < this.totalContent
  //           ? true
  //           : false
  //       this.fetchError = false
  //     },
  //     () => {
  //       this.fetchError = true
  //       this.cardContent = []
  //       this.showLoadMore = false
  //       this.loadService.changeLoad.next(false)
  //     },
  //   )
  // }

  fetchContent(loadMoreFlag: boolean, changeFilter = true) {
    const searchV6Data = this.myContSvc.getSearchBody(
      this.status,
      this.searchLanguage ? [this.searchLanguage] : [],
      loadMoreFlag ? this.pagination.offset : 0,
      this.queryFilter,
      this.isAdmin,
    )

    const requestData = {
      locale: this.searchLanguage ? [this.searchLanguage] : ['en'],
      query: this.queryFilter,
      request: {
        query: this.queryFilter,
        // filters: {
        //   status: this.fetchStatus(),
        //   // creatorContacts: <string[]>[],
        //   // trackContacts: <string[]>[],
        //   // publisherDetails: <string[]>[],
        //   // isMetaEditingDisabled: [false],
        //   // isContentEditingDisabled: [false],
        //   // sourceName: [_.get(this.departmentData, 'data.deptName')],
        //   contentType: [                              // filter according to type
        //     'Collection',
        //     'Course',
        //     'Learning Path',
        //   ],
        //   createdBy: this.configService.userProfile ? this.configService.userProfile.userId : '',
        //   // createdFor: (this.configService.userProfile) ? [this.configService.userProfile.rootOrgId] : [],
        // },
        filters: <any>{},
        // pageNo: loadMoreFlag ? this.pagination.offset : 0,
        sort_by: { lastUpdatedOn: 'desc' },
        // pageSize: this.pagination.limit,
        facets: [
          'primaryCategory',
          'mimeType',
        ],
        // pageNo: loadMoreFlag ? this.pagination.offset : 0,
        // sort: [{ lastUpdatedOn: 'desc' }],
        // pageSize: this.pagination.limit,
        // uuid: this.userId,
        // rootOrg: this.accessService.rootOrg,
        // // this is for Author Only
        // isUserRecordEnabled: true,
      },
    }
    requestData.request.filters['status'] = this.fetchStatus()
    if (this.status == 'coursesWithoutCertificate') {
      requestData.request.filters['issueCertification'] = false
    } else if (this.status == 'courseRevision' || this.status == 'selfCourseRevision') {
      requestData.request.filters['prevStatus'] = 'Review'
    } else if (this.status == 'courseWithCertificate') {
      requestData.request.filters['issueCertification'] = true
    } else if (this.status == 'selfAssessmentDraft') {
      requestData.request.filters['competency'] = true
    } else if (this.status == 'selfSentForReview') {
      requestData.request.filters['competency'] = true
      requestData.request.filters['reviewStatus'] = 'InReview'
    } else if (this.status == 'selfToPublishedCourse' || this.status == 'selfPublishedCourse') {
      requestData.request.filters['competency'] = true
    } else if (this.status == 'selfRetiredCourse' || this.status == 'selfCourseRevision') {
      requestData.request.filters['competency'] = true

    }

    // requestData.request.filters['contentType'] = ['Collection', 'Course', 'Learning Path']
    requestData.request.filters['contentType'] = ['Course', 'Learning Path']

    if (this.finalFilters.length) {
      this.finalFilters.forEach((v: any) => {
        searchV6Data.filters.forEach((filter: any) => {
          filter.andFilters[0] = {
            ...filter.andFilters[0],
            [v.key]: v.value,
          }
        })
        requestData.request.filters = { ...requestData.request.filters, [v.key]: v.value }
      })
    }

    if (requestData.request.filters.status.includes('Unpublished')) {
      requestData.request.filters.status = ['Retired']
    }
    // if (this.queryFilter) {
    //   // tslint:disable
    //   delete requestData.request.sort
    //   // tslint:enable
    // }
    // if (
    //   [
    //     'draft',
    //     'rejected',
    //     'inreview',
    //     'published',
    //     'unpublished',
    //     'processing',
    //     'deleted',
    //   ].indexOf(this.status) > -1 &&
    //   !this.isAdmin
    // ) {
    //   requestData.request.filters.creatorContacts.push(this.userId)
    // }
    // if (this.status === 'review' && !this.isAdmin) {
    //   requestData.request.filters.trackContacts.push(this.userId)
    // }
    // if (this.status === 'publish' && !this.isAdmin) {
    //   requestData.request.filters.publisherDetails.push(this.userId)
    // }

    switch (this.status) {
      case 'allCourses':
      case 'coursesWithoutCertificate':
      case 'courseWithCertificate':
      case 'published':
      case 'selfAssessmentDraft':
      case 'selfSentForReview':
      case 'selfPublishedCourse':
        if (this.accessService.hasRole(['content_creator'])) {
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        } else if (this.accessService.hasRole(['content_reviewer'])) {
          requestData.request.filters['reviewerIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        } else if (this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        }

        break
      case 'publish':
        requestData.request.filters['reviewStatus'] = 'Reviewed'
        requestData.request.filters['competency'] = false
        requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        break
      case 'processing':
        if (this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        } else if (this.accessService.hasRole(['content_creator'])) {
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        } else if (this.accessService.hasRole(['content_reviewer'])) {
          requestData.request.filters['reviewerIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        }
        // else if (this.accessService.hasRole(['content_publisher'])) {
        //   requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        // }
        break
      case 'reviewed':
        requestData.request.filters['reviewStatus'] = 'Reviewed'
        if (this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        }
        break
      case 'inreview':
        requestData.request.filters['reviewStatus'] = 'InReview'
        if (this.accessService.hasRole(['content_creator'])) {
          requestData.request.filters['competency'] = false
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        } else
          if (this.accessService.hasRole(['content_reviewer'])) {
            requestData.request.filters['reviewerIDs'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
          } else if (this.accessService.hasRole(['content_publisher'])) {
            requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
          }
        break
      case 'draft':
        // case 'unpublished':
        if (this.accessService.hasRole(['content_creator']) ||
          this.accessService.hasRole(['content_reviewer']) ||
          this.configService.userRoles!.has('public') ||
          this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['competency'] = false
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        }
        break
      case 'courseRevision':
        // case 'unpublished':
        if (this.accessService.hasRole(['content_creator']) ||
          this.accessService.hasRole(['content_reviewer']) ||
          this.configService.userRoles!.has('public') ||
          this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['competency'] = false
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        }
        break
      case 'selfCourseRevision':
        // case 'unpublished':
        if (this.accessService.hasRole(['content_creator']) ||
          this.accessService.hasRole(['content_reviewer']) ||
          this.configService.userRoles!.has('public') ||
          this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['competency'] = true
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        }
        break
      case 'unpublished':
        if (this.accessService.hasRole(['content_creator'])) {
          requestData.request.filters['competency'] = false
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        } else if (this.accessService.hasRole(['content_reviewer'])) {
          requestData.request.filters['reviewerIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        } else if (this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        }
        break
      case 'selfRetiredCourse':
        if (this.accessService.hasRole(['content_creator'])) {
          requestData.request.filters['competency'] = true
          requestData.request.filters['createdBy'] = (this.configService.userProfile) ? this.configService.userProfile.userId : ''
        }
        break
      case 'selfToPublishedCourse':
        requestData.request.filters['reviewStatus'] = 'Reviewed'
        requestData.request.filters['status'] = 'Review'
        if (this.accessService.hasRole(['content_publisher'])) {
          requestData.request.filters['publisherIDs'] = (this.configService.userProfile) ? [this.configService.userProfile.userId] : []
        }
        break
    }

    this.loadService.changeLoad.next(true)

    const observable =
      this.status === 'expiry' || this.newDesign
        ? this.myContSvc.fetchFromSearchV6(searchV6Data, this.isAdmin).pipe(
          map((v: any) => {
            return {
              result: {
                response: v,
              },
            }
          }),
        )
        : this.myContSvc.fetchContent(requestData)
    this.loadService.changeLoad.next(true)
    observable.subscribe(
      data => {
        this.loadService.changeLoad.next(false)
        if (changeFilter) {
          this.filterMenuItems =
            data && data.result && data.result.facets
              ? data.result.facets
              : this.filterMenuItems
          this.dataSource.data = this.filterMenuItems
        }
        console.log("1667")
        this.cardContent =
          loadMoreFlag && !this.queryFilter
            ? (this.cardContent || []).concat(
              data && data.result ? data.result.content : [],
            )
            : data && data.result.content
              ? data.result.content
              : []
        if (this.status === 'draft' || this.status === 'selfAssessmentDraft') {
          console.log("this.status = ", this.status)
          const filteredContent = (data && data.result && data.result.content) ?
            data.result.content.filter((item: any) => item.prevStatus !== 'Review') : []
          this.cardContent = filteredContent
          console.log("filteredContent", data.result, this.cardContent, filteredContent)
        }



        this.totalContent = data && data.result ? data.result.count : 0
        // const index = _.findIndex(this.count, i => i.n === this.status)
        // if (index >= 0) {
        this.count[this.status] = this.totalContent
        // }
        this.showLoadMore =
          this.pagination.offset * this.pagination.limit + this.pagination.limit < this.totalContent
            ? true
            : false
        this.fetchError = false
      },
      () => {
        this.fetchError = true
        this.cardContent = []
        this.showLoadMore = false
        this.loadService.changeLoad.next(false)
      },
    )
  }

  search() {
    if (this.searchInputElem.nativeElement) {
      this.queryFilter = this.searchInputElem.nativeElement.value.trim()
    }
    this.fetchContent(false, false)
  }

  filterApplyEvent(node: any) {
    this.pagination.offset = 0
    this.sideNavBarOpened = false
    const filterIndex = this.filters.findIndex(v => v.displayName === node.displayName)
    const filterMenuItemsIndex = this.filterMenuItems.findIndex((obj: any) =>
      obj.content.some((val: any) => val.type === node.type),
    )
    const ind = this.finalFilters.indexOf(this.filterMenuItems[filterMenuItemsIndex].type)
    if (filterIndex === -1 && node.checked) {
      this.filters.push(node)
      this.filterMenuItems[filterMenuItemsIndex].content.find(
        (v: any) => v.displayName === node.displayName,
      ).checked = true

      if (ind === -1) {
        this.finalFilters.push({
          key: this.filterMenuItems[filterMenuItemsIndex].type,
          value: [node.type],
        })
      } else {
        this.finalFilters[ind].value.push(node.type)
      }
    } else {
      this.filterMenuItems[filterMenuItemsIndex].content.find(
        (v: any) => v.displayName === node.displayName,
      ).checked = false
      this.filters.splice(filterIndex, 1)
      this.finalFilters.splice(ind, 1)
    }
    this.dataSource.data = this.filterMenuItems
    this.fetchContent(false, false)
  }

  deleteContent(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc
      // .deleteContent(request.identifier, request.contentType === 'Knowledge Board')
      .deleteOrUnpublishContent(request.identifier)
      .subscribe(
        () => {
          this.loadService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          console.log("1760")

          this.cardContent = (this.cardContent || []).filter(
            v => v.identifier !== request.identifier,
          )
        },
        error => {
          if (error.status === 409) {
            this.dialog.open(ErrorParserComponent, {
              width: '80vw',
              height: '90vh',
              data: {
                errorFromBackendData: error.error,
              },
            })
          }
          this.loadService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.CONTENT_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
      )
  }

  restoreContent(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc.restoreContent(request.identifier).subscribe(
      () => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        console.log("1797")

        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== request.identifier)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '80vw',
            height: '90vh',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  createContent(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc.createInAnotherLanguage(request.identifier, request.locale).subscribe(
      (id: string) => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_CREATE_SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        this.router.navigateByUrl(`/author/editor/${id}`)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '750px',
            height: '450px',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  clearAllFilters() {
    this.finalFilters = []
    this.searchInputElem.nativeElement.value = ''
    this.queryFilter = ''
    this.filterMenuItems.map((val: any) => val.content.map((v: any) => (v.checked = false)))
    this.dataSource.data = this.filterMenuItems
    this.filters = []
    this.fetchContent(false)
  }

  loadMore() {
    this.pagination.offset += 1
    this.fetchContent(true, false)
  }

  confirmAction(content: any) {
    let message = ''
    if (content.type === 'delete') {
      message = 'delete'
    } else if (content.type === 'restoreDeleted') {
      message = 'restoreDeleted'
    } else if (content.type === 'unpublish') {
      message = 'unpublish'
    } else if (content.type === 'moveToDraft' || content.type === 'moveToInReview') {
      if (content.data.mimeType.indexOf('collection') >= 0) {
        message = 'retrieveParent'
      } else {
        message = 'retrieveChild'
      }
    } else {
      this.forwardBackward(content)
      return
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '600px',
      height: '200px',
      data: message,
    })

    dialogRef.afterClosed().subscribe((confirm: any) => {
      if (confirm) {
        if (content.type === 'delete') {
          this.deleteContent(content.data)
        } else if (content.type === 'restoreDeleted') {
          this.restoreContent(content.data)
        } else if (
          content.type === 'unpublish' ||
          (content.type === 'moveToDraft' && content.data.status === 'Unpublished')
        ) {
          this.unPublishOrDraft(content.data)
        } else {
          this.forwardBackward(content)
        }
      }
    })
  }

  unPublishOrDraft(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    // this.myContSvc.upPublishOrDraft(request.identifier, request.status !== 'Unpublished').subscribe(
    this.myContSvc.upPublishOrDraft(request.identifier).subscribe(
      () => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        console.log("1926")

        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== request.identifier)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '750px',
            height: '450px',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  forwardBackward(content: any) {
    const dialogRef = this.dialog.open(CommentsDialogComponent, {
      width: '750px',
      height: '450px',
      data: { ...content.data, status: 'Draft' },
    })

    dialogRef.afterClosed().subscribe((commentsForm: FormGroup) => {
      if (commentsForm) {
        this.finalCall(commentsForm, content)
      }
    })
  }

  finalCall(commentsForm: FormGroup, content: any) {
    if (commentsForm) {
      let operationValue: any
      switch (content.type) {
        case 'moveToDraft':
          operationValue = 0
          break
        case 'moveToInReview':
          operationValue = -1
          break
      }
      const body: NSApiRequest.IForwardBackwardActionGeneral = {
        comment: commentsForm.controls.comments.value,
        operation: operationValue,
      }
      this.loadService.changeLoad.next(true)
      this.myContSvc.forwardBackward(body, content.data.identifier, content.data.status).subscribe(
        () => {
          this.loadService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          console.log("1989")

          this.cardContent = (this.cardContent || []).filter(
            v => v.identifier !== content.data.identifier,
          )
        },
        error => {
          if (error.status === 409) {
            this.dialog.open(ErrorParserComponent, {
              width: '80vw',
              height: '90vh',
              data: {
                errorFromBackendData: error.error,
              },
            })
          }
          this.loadService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.CONTENT_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
      )
    }
  }

  action(event: { data: NSContent.IContentMeta; type: string }) {
    switch (event.type) {
      case 'create':
        this.createContent(event.data)
        break

      case 'review':
      case 'publish':
      case 'edit':
        this.router.navigateByUrl(`/author/editor/${event.data.identifier}`)
        break
      case 'remove':
        console.log("2030")

        this.cardContent = (this.cardContent || []).filter(
          v => v.identifier !== event.data.identifier,
        )
        break
      case 'moveToInReview':
      case 'moveToDraft':
      case 'delete':
        this.confirmAction(event)
        break
      case 'unpublish':
      case 'restoreDeleted':
        this.confirmAction(event)
        break
      case 'expiryExtend':
        this.actionOnExpiry(event.data)
    }
  }

  actionOnExpiry(content: NSContent.IContentMeta) {
    const dialogRef = this.dialog.open(AuthExpiryDateConfirmComponent, {
      width: '750px',
      height: '300px',
      data: content,
    })

    dialogRef.afterClosed().subscribe((userAction?: { isExtend: boolean; expiryDate?: string }) => {
      if (userAction) {
        console.log("2059")

        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== content.identifier)
      }
    })
  }

  setCurrentLanguage(lang: string) {
    this.searchLanguage = lang
  }
  canShow(role: string): boolean {
    switch (role) {
      case 'review':
        //return this.accessService.hasRole(REVIEW_ROLE)
        return this.configService.userRoles!.has('content_reviewer')
      case 'publish':
        //return this.accessService.hasRole(PUBLISH_ROLE)
        return this.configService.userRoles!.has('content_publisher')
      case 'author':
        // return this.accessService.hasRole(CREATE_ROLE) || this.accessService.hasRole(REVIEW_ROLE)
        //   || this.accessService.hasRole(PUBLISH_ROLE)
        return this.configService.userRoles!.has('content_reviewer') || this.configService.userRoles!.has('content_creator') || this.configService.userRoles!.has('content_publisher')
      case 'author_create':
        //return this.accessService.hasRole(CREATE_ROLE)
        return this.configService.userRoles!.has('content_creator')
      default:
        return false
    }
  }
  createCourse(course: any) {
    if (course == 'selfAssessment') {
      this.router.navigate(['/author/create'], { queryParams: { status: 'selfAssessment' } })
      // localStorage.removeItem('course')
      // localStorage.setItem('course', 'selfAssessment')
    } else {
      this.router.navigate(['/author/create'], { queryParams: { status: 'courseWithLevel' } })
      // localStorage.removeItem('course')
      // localStorage.setItem('course', 'courseWithLevel')
    }
  }
}
