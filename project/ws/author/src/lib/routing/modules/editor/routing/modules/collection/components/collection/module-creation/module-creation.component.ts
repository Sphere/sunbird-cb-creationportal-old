import { Component, OnInit, AfterViewInit, ViewChild, TemplateRef, Output, EventEmitter, Input } from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
// import { ConfigurationsService,  } from '@ws-widget/utils'
import { IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '@ws/author/src/lib/constants/upload'
import { MatSnackBar } from '@angular/material/snack-bar'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { LoaderService } from '../../../../../../../../../services/loader.service'
import { NSApiRequest } from '../../../../../../../../../interface/apiRequest'
import { AccessControlService } from '../../../../../../../../../modules/shared/services/access-control.service'
import { UploadService } from '../../../../../../shared/services/upload.service'
import { AUTHORING_BASE } from '@ws/author/src/lib/constants/apiEndpoints'
import { HttpClient } from '@angular/common/http'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { EditorContentService } from 'project/ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { of, Subscription } from 'rxjs'
import { HeaderServiceService } from './../../../../../.././.././../.././../../../../.././src/app/services/header-service.service'
// import { ConfigurationsService } from '../../../../../../../../../../../../../library/ws-widget/utils/src/public-api'
import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'
import { mergeMap, tap } from 'rxjs/operators'
import { CommentsDialogComponent } from '@ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component'
import * as _ from 'lodash'
import { Router } from '@angular/router'
import { environment } from '../../../../../../../../../../../../../.././src/environments/environment'
import { ConfigurationsService, ImageCropComponent, ValueService } from '../../../../../../../../../../../../../.././library/ws-widget/utils/src/public-api'
import { SuccessDialogComponent } from '../../../../../../../../.././modules/shared/components/success-dialog/success-dialog.component'
import { CollectionStoreService } from '../../../services/store.service'
import { ActivatedRoute } from '@angular/router'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { CollectionResolverService } from '../../../services/resolver.service'
import { IContentNode, IContentTreeNode } from '../../../interface/icontent-tree'
import { isNumber } from 'lodash'
/* tslint:disable */
import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'
import { IFormMeta } from '../../../../../../../../../interface/form'
import { VIDEO_MAX_SIZE } from '@ws/author/src/lib/constants/upload'
import {
  CONTENT_BASE_STATIC,
  CONTENT_BASE_STREAM,
  CONTENT_BASE_WEBHOST,
} from '@ws/author/src/lib/constants/apiEndpoints'
import { ProfanityService } from '../../../../upload/services/profanity.service'
import { IQuizQuestionType } from '../../../../quiz/interface/quiz-interface'
import { QUIZ_QUESTION_TYPE } from '../../../../quiz/constants/quiz-constants'
import { FlatTreeControl } from '@angular/cdk/tree'
import { QuizStoreService } from '../../../../quiz/services/store.service'
import { QuizResolverService } from '../../../../quiz/services/resolver.service'
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout'
import { map } from 'rxjs/operators'
import { UserIndexConfirmComponent } from '@ws/author/src/lib/modules/shared/components/user-index-confirm/user-index-confirm.component'
import {
  ContentProgressService,
} from '@ws-widget/collection'
//import { M } from '@angular/cdk/keycodes'
//import { CdkDragDrop } from '@angular/cdk/drag-drop'
@Component({
  selector: 'ws-author-module-creation',
  templateUrl: './module-creation.component.html',
  styleUrls: ['./module-creation.component.scss'],
  providers: [CollectionStoreService, CollectionResolverService, QuizResolverService],

})
export class ModuleCreationComponent implements OnInit, AfterViewInit {
  @ViewChild('guideline', { static: false }) guideline!: TemplateRef<HTMLElement>
  @ViewChild('errorFile', { static: false }) errorFile!: TemplateRef<HTMLElement>
  @ViewChild('selectFile', { static: false }) selectFile!: TemplateRef<HTMLElement>
  @Output() data = new EventEmitter<any>()
  contents: NSContent.IContentMeta[] = []
  @Output() actions = new EventEmitter<{ action: string; type?: string }>()
  treeControl!: FlatTreeControl<IContentTreeNode>
  expandedNodes = new Set<number>()
  dragEle1: any
  dragEle2: any
  dragEle3: any
  contentList: any[] = [
    {
      name: 'Link',
      icon: 'link',
      type: 'web'
    },
    {
      name: 'PDF',
      icon: 'picture_as_pdf',
      type: 'upload'
    },
    {
      name: 'Audio',
      icon: 'music_note',
      type: 'upload'
    },
    {
      name: 'Video',
      icon: 'videocam',
      type: 'upload'
    },
    {
      name: 'SCORM v1.1/1.2',
      icon: 'cloud_upload',
      type: 'upload'
    }
  ]

  accessList: any[] = [
    {
      name: 'Assessment',
      icon: 'assessment',
      type: 'assessment'
    },
    {
      name: 'Quiz',
      icon: 'smartphone',
      type: 'assessment'
    }
  ]
  assessmentOrQuizName: string = 'Quiz'
  isAddOrEdit: boolean = false
  checkCreator = false
  selectedEntryFile: boolean = false
  fileUploaded: any = []
  isFalse: boolean = false
  parentHierarchy: number[] = []
  showAddModuleForm: boolean = false
  showSettingsPage: boolean = false
  moduleNames: any = [];
  isSaveModuleFormEnable: boolean = false
  moduleButtonName: string = 'Create';
  isResourceTypeEnabled: boolean = false
  isLinkPageEnabled: boolean = false
  isOnClickOfResourceTypeEnabled: boolean = false;
  resourceLinkForm: FormGroup
  resourcePdfForm: FormGroup
  moduleForm!: FormGroup
  resourceImg: string = '';
  isLinkEnabled: boolean = false;
  isShowDownloadBtnEnabled: boolean = false;
  openinnewtab: boolean = false
  moduleName: string = '';
  isNewTab: any = '';
  isShowBtn: any = '';
  isGating: any = '';
  topicDescription: string = ''
  thumbnail: string = ''
  resourceNames: any = [];
  resourceCount: number = 0;
  independentResourceNames: any = [];
  independentResourceCount: number = 0;
  imageTypes = IMAGE_SUPPORT_TYPES
  bucket: string = ''
  courseData: any
  isAssessmentOrQuizEnabled!: boolean
  assessmentOrQuizForm!: FormGroup
  isSettingsPage: boolean = false
  questionTypes: any = ['MCQ', 'Fill in the blanks', 'Match the following']
  currentContent!: string
  currentCourseId!: string
  routerSubscription: Subscription | null = null
  courseName: any
  currentParentId!: string
  showResource: boolean = false;
  triggerQuizSave = false
  triggerUploadSave = false
  isChanged = false
  versionKey: any
  versionID: any
  isSubmitPressed = false
  isMoveCourseToDraft: boolean = false;
  gatingEnabled!: FormControl
  hours = 0
  minutes = 0
  seconds = 0
  courseHours = 0
  courseMinutes = 0
  courseSeconds = 0
  resourceType: string = ''
  resourseSelected: string = ''
  viewMode!: string
  content: any
  canUpdate: boolean = true;
  isPdfOrAudioOrVedioEnabled!: boolean
  acceptType!: string | '.mp3,.mp4,.pdf,.zip,.m4v'
  addResourceModule: any = {}
  fileUploadCondition = {
    fileName: false,
    eval: false,
    externalReference: false,
    iframe: false,
    isSubmitPressed: false,
    preview: false,
    url: '',
  }
  isMobile: boolean = false
  iprAccepted: boolean = false
  file!: File | null
  mimeType: string = ''
  fileUploadForm!: FormGroup
  errorFileList: string[] = []
  fileList: string[] = []
  duration!: string
  mainCourseDuration: string = ''
  entryPoint: any
  uploadText!: string
  uploadFileName: string = '';
  uploadIcon!: string
  isSelfAssessment: boolean = false
  hideModule: boolean = false
  hideResource: boolean = false
  questionType: IQuizQuestionType['fillInTheBlanks'] |
    IQuizQuestionType['matchTheFollowing'] |
    IQuizQuestionType['multipleChoiceQuestionSingleCorrectAnswer'] |
    IQuizQuestionType['multipleChoiceQuestionMultipleCorrectAnswer'] = QUIZ_QUESTION_TYPE['multipleChoiceQuestionSingleCorrectAnswer']
  parentNodeId!: number
  assessmentData: any
  assessmentDuration!: any
  passPercentage: any
  allContents: NSContent.IContentMeta[] = []
  activeContentSubscription?: Subscription
  allLanguages: any
  quizConfig: any
  mediumSizeBreakpoint$ = this.breakpointObserver
    .observe([Breakpoints.XSmall, Breakpoints.Small])
    .pipe(map((res: BreakpointState) => res.matches))
  sideNavBarOpened!: boolean
  mediumScreenSize!: boolean
  showContent!: boolean
  canEditJson!: boolean
  questionsArr: any[] = [];
  contentLoaded!: boolean
  currentId!: string
  quizDuration: any
  activeIndexSubscription?: Subscription
  selectedQuizIndex!: number
  quizIndex!: number
  editResourceLinks: string = ''
  isLoading: boolean = false
  backToModule?: Subscription
  updatedVersionKey: any
  isError: boolean = false
  saveTriggerSub?: Subscription
  isVisibleReviewDialog: boolean = false
  editItem: string = ''
  resourceDurat: any = []
  sumDuration: any
  @Input() clickedNext: boolean = false;

  constructor(
    public dialog: MatDialog,
    private contentService: EditorContentService,
    private activateRoute: ActivatedRoute,
    private router: Router,
    private profanityService: ProfanityService,
    // private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private loader: LoaderService,
    private accessService: AccessControlService,
    private uploadService: UploadService,
    private http: HttpClient,
    private initService: AuthInitService,
    private editorService: EditorService,
    private editorStore: EditorContentService,
    private storeService: CollectionStoreService,
    private _configurationsService: ConfigurationsService,
    private resolverService: CollectionResolverService,
    private headerService: HeaderServiceService,
    private loaderService: LoaderService,
    private valueSvc: ValueService,
    private formBuilder: FormBuilder,
    private quizStoreSvc: QuizStoreService,
    private quizResolverSvc: QuizResolverService,
    private breakpointObserver: BreakpointObserver,
    private progressSvc: ContentProgressService,
  ) {
    if (sessionStorage.getItem('isReviewClicked')) {
      sessionStorage.removeItem('isReviewClicked')
      sessionStorage.setItem('isSettingsPageFromPreview', '1')
      sessionStorage.setItem('isSettingsPage', '1')
      this.isSettingsPage = true
    }
    this.resourceLinkForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.minLength(1)]),
      instructions: new FormControl(''),
      artifactUrl: new FormControl('', [Validators.required]),
      appIcon: new FormControl(''),
      thumbnail: new FormControl(''),
      showDownloadBtn: new FormControl(''),
      isIframeSupported: new FormControl(''),
      isgatingEnabled: new FormControl(),
      duration: new FormControl('', [Validators.required])
    })

    this.fileUploadForm = this.formBuilder.group({
      artifactUrl: [],
      isExternal: [],
      mimeType: [],
      size: [],
      duration: [],
      downloadUrl: [],
      transcoding: [],
      versionKey: [],
      streamingUrl: [],
      entryPoint: [],
    })

    this.resourcePdfForm = new FormGroup({
      name: new FormControl('', [Validators.required, Validators.minLength(1)]),
      instructions: new FormControl(''),
      appIcon: new FormControl(''),
      thumbnail: new FormControl(''),
      isIframeSupported: new FormControl(''),
      showDownloadBtn: new FormControl(''),
      isgatingEnabled: new FormControl(),
      duration: new FormControl('', [Validators.required])
    })

    this.moduleForm = new FormGroup({
      appIcon: new FormControl('')
    })

    this.assessmentOrQuizForm = new FormGroup({
      name: new FormControl(''),
      duration: new FormControl(''),
      questionType: new FormControl(''),
      isgatingEnabled: new FormControl(),
    })

    this.backToModule = this.initService.backToHomeMessage.subscribe((data: any) => {
      if (data === 'fromSettings') {
        this.isLoading = true
        this.isSettingsPage = false
        setTimeout(() => {
          this.isLoading = false
        }, 500)
      }
    })

    this.initService.updateResourceMessage.subscribe(
      async (data: any) => {
        if (data) {
          await this.ngAfterViewInit()
        }
      })
  }

  ngOnInit() {
    this.parentNodeId = this.storeService.currentParentNode
    this.treeControl = new FlatTreeControl<IContentTreeNode>(
      node => node.level,
      node => node.expandable,
    )
    // this.isSettingsPage = false
    this.routerValuesCalls()
    if (sessionStorage.getItem('isReviewClicked') && this.clickedNext) {
      sessionStorage.removeItem('isReviewClicked')
      sessionStorage.setItem('isSettingsPageFromPreview', '1')
      sessionStorage.setItem('isSettingsPage', '1')
      this.isSettingsPage = true
    }
  }

  ngOnDestroy() {
    if (this.activeIndexSubscription) {
      this.activeIndexSubscription.unsubscribe()
    }
    if (this.activeContentSubscription) {
      this.activeContentSubscription.unsubscribe()
    }
    if (this.backToModule) {
      this.backToModule.unsubscribe()
    }

    if (this.saveTriggerSub) {
      this.saveTriggerSub.unsubscribe()
    }
  }

  routerValuesCalls() {
    this.contentService.changeActiveCont.subscribe(data => {
      // tslint:disable-next-line:no-console
      console.log(data)
      this.currentContent = data
      this.currentCourseId = data
      if (this.contentService.getUpdatedMeta(data).contentType !== 'Resource') {
        this.viewMode = 'meta'
      }
    })
    if (this.activateRoute.parent && this.activateRoute.parent.parent) {
      this.routerSubscription = this.activateRoute.parent.parent.data.subscribe(data => {

        this.courseName = data.contents[0].content.name
        this.courseData = data.contents[0].content

        this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
          this.courseData = data
          console.log("data", data)
          this.getChildrenCount()
        })
        const contentDataMap = new Map<string, NSContent.IContentMeta>()
        data.contents.map((v: { content: NSContent.IContentMeta; data: any }) => {
          this.storeService.parentNode.push(v.content.identifier)
          this.resolverService.buildTreeAndMap(
            v.content,
            contentDataMap,
            this.storeService.flatNodeMap,
            this.storeService.uniqueIdMap,
            this.storeService.lexIdMap,
          )
        })
        contentDataMap.forEach(content => this.contentService.setOriginalMeta(content))
        const currentNode = (this.storeService.lexIdMap.get(this.currentContent) as number[])[0]
        this.currentParentId = this.currentContent
        this.storeService.treeStructureChange.next(
          this.storeService.flatNodeMap.get(currentNode) as IContentNode,
        )
        this.storeService.currentParentNode = currentNode
        this.storeService.currentSelectedNode = currentNode
        let newCreatedNode = 0
        const newCreatedLexid = this.editorService.newCreatedLexid
        if (newCreatedLexid) {
          newCreatedNode = (this.storeService.lexIdMap.get(newCreatedLexid) as number[])[0]
          this.storeService.selectedNodeChange.next(newCreatedNode)
        }

        if (data.contents[0] && data.contents[0].content && data.contents[0].content.children[0] &&
          data.contents[0].content.children[0].identifier) {
          this.subActions({
            type: 'editContent', identifier: data.contents[0].content.identifier, nodeClicked: true
          })
          this.storeService.selectedNodeChange.next(data.contents[0].content.identifier)
        }

      })

      this.activateRoute.parent.url.subscribe(data => {
        const urlParam = data[0].path
        if (urlParam === 'collection') {
          this.headerService.showCreatorHeader(this.courseName)
        }

      })
    }
  }
  subActions(event: { type: string; identifier: string, nodeClicked?: boolean }) {
    // const nodeClicked = event.nodeClicked
    this.contentService.changeActiveCont.next(event.identifier)
    switch (event.type) {
      case 'editMeta':
        this.viewMode = 'meta'
        break
      case 'editContent':
        if (event.nodeClicked === false) {
        }
        const content = this.contentService.getUpdatedMeta(event.identifier)
        if (['application/pdf', 'application/x-mpegURL', 'application/vnd.ekstep.html-archive', 'audio/mpeg', 'video/mp4'].includes(content.mimeType)) {
          this.viewMode = 'upload'
          // } else if (['video/x-youtube', 'text/x-url', 'application/html'].includes(content.mimeType) && content.fileType === 'link') {
        } else if (['video/x-youtube', 'text/x-url', 'application/html'].includes(content.mimeType) && content.fileType === '') {
          this.viewMode = 'curate'
        } else if (content.mimeType === 'application/html') {
          this.viewMode = 'upload'
        } else if (content.mimeType === 'application/quiz' || content.mimeType === 'application/json') {
          this.viewMode = 'assessment'
        } else if (content.mimeType === 'application/web-module') {
          this.viewMode = 'webmodule'
        } else {
          this.viewMode = 'meta'
        }
        break
    }
  }
  action(type: string) {      // recheck
    // tslint:disable-next-line:no-console
    switch (type) {
      case 'next':
        this.viewMode = 'meta'
        break

      case 'refresh':
        window.location.reload()
        break

      case 'scroll':

        const el = document.getElementById('edit-meta')
        if (el) {
          el.scrollIntoView()
        }

        break

      case 'save':
        this.saves('save')
        this.showResource = true
        break

      case 'saveAndNext':
        this.saves('next')
        break

      // case 'preview':
      //   this.preview(this.currentContent)
      //   break

      case 'push':

        if (this.getAction() === 'publish') {
          const dialogRefForPublish = this.dialog.open(ConfirmDialogComponent, {
            width: '70%',
            data: 'publishMessage',
          })
          dialogRefForPublish.afterClosed().subscribe(result => {
            if (result) {
              this.takeAction()
            }
          })
        } else {
          this.takeAction('acceptConent')
        }
        break

      // case 'delete':
      //   const dialog = this.dialog.open(DeleteDialogComponent, {
      //     width: '600px',
      //     height: 'auto',
      //     data: this.contentService.getUpdatedMeta(this.currentParentId),
      //   })
      //   dialog.afterClosed().subscribe(confirm => {
      //     if (confirm) {
      //       this.contents = this.contents.filter(v => v.identifier !== this.currentParentId)
      //       if (this.contents.length) {
      //         this.contentService.changeActiveCont.next(this.contents[0].identifier)
      //       } else {
      //         this.router.navigateByUrl('/author/home')
      //       }
      //     }
      //   })
      //   break

      // case 'fullscreen':
      //   this.fullScreenToggle()
      //   break

      // case 'close':
      //   this.router.navigateByUrl('/author/home')
      //   break

      case 'acceptConent':
        this.takeAction('acceptConent')
        break

      case 'rejectContent':
        this.takeAction('rejectContent')
        break
    }
  }
  getAction(): string {
    switch (this.contentService.originalContent[this.currentParentId].status) {
      case 'Draft':
      case 'Live':
        return 'sendForReview'
      case 'InReview':
        return 'review'
      case 'Reviewed':
        const isDraftPresent = this.contentService.resetStatus()
        /**Change all content as draft, if one of the content is draft status */
        if (isDraftPresent) {
          this.contentService.changeStatusDraft()
          return 'sendForReview'
        }
        return 'publish'
      default:
        return 'sendForReview'
    }
  }
  async saves(nextAction?: string) {
    if (this.resourseSelected !== '') {
      this.update()
    }
    const updatedContent = this.contentService.upDatedContent || {}
    if (this.viewMode === 'assessment') {
      this.triggerQuizSave = true
    } else
      if (this.viewMode === 'upload') {
        // TODO  console.log('viewmode', this.viewMode)
        this.triggerUploadSave = true
      }

    if (
      (Object.keys(updatedContent).length &&
        (Object.values(updatedContent).length && JSON.stringify(Object.values(updatedContent)[0]) !== '{}')) ||
      Object.keys(this.storeService.changedHierarchy).length
    ) {

      this.isChanged = true
      this.loader.changeLoad.next(true)
      if (this.contentService.getUpdatedMeta(this.currentCourseId).contentType !== "CourseUnit") {
        this.versionID = await this.editorService.readcontentV3(this.currentCourseId).toPromise()
        this.versionKey = this.contentService.getUpdatedMeta(this.currentCourseId)
      }

      this.saveTriggerSub = this.triggerSaves().subscribe(
        () => {
          if (nextAction) {

            this.action(nextAction)
          }
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          // tslint:disable-next-line:no-console

          // this.isSettingsPage = false

        },
        (error: any) => {
          if (error.status === 409) {
            this.isError = true
            const errorMap = new Map<string, NSContent.IContentMeta>()
            Object.keys(this.contentService.originalContent).forEach(v =>
              errorMap.set(v, this.contentService.originalContent[v]),
            )
            const dialog = this.dialog.open(ErrorParserComponent, {
              width: '80vw',
              height: '90vh',
              data: {
                errorFromBackendData: error.error,
                dataMapping: errorMap,
              },
            })
            dialog.afterClosed().subscribe(v => {
              if (v) {
                if (typeof v === 'string') {
                  this.storeService.selectedNodeChange.next(
                    (this.storeService.lexIdMap.get(v) as number[])[0],
                  )
                  this.contentService.changeActiveCont.next(v)
                } else {
                  this.storeService.selectedNodeChange.next(v)
                  this.contentService.changeActiveCont.next(
                    this.storeService.uniqueIdMap.get(v) as string,
                  )
                }
              }
              this.isError = false
            })
          }
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
      )
    } else {
      if (nextAction) {
        // tslint:disable-next-line:no-console
        // console.log("nextAction")
        if (this.isSettingsPage) {
          this.loader.changeLoad.next(true)
          this.editorService.readcontentV3(this.contentService.parentContent).subscribe(async (data: any) => {
            this.courseData = await data
            this.contentService.resetOriginalMetaWithHierarchy(data)
            if (this.isSettingsPage && !this.isError) {
              this.action("push")
              this.loader.changeLoad.next(false)
            }
            // tslint:disable-next-line: align
          })
          // this.action("push")
        } else {
          this.action(nextAction)
        }
      } else {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.UP_TO_DATE,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      }
    }
  }
  triggerSaves() {
    const nodesModified: any = {}
    let isRootPresent = false
    // tslint:disable-next-line:no-console
    console.log(this.contentService.upDatedContent)
    Object.keys(this.contentService.upDatedContent).forEach(v => {
      if (!isRootPresent) {
        isRootPresent = this.storeService.parentNode.includes(v)
      }
      nodesModified[v] = {
        isNew: false,
        root: this.storeService.parentNode.includes(v),
        metadata: this.contentService.upDatedContent[v],
      }
    })
    if (!isRootPresent) {
      nodesModified[this.currentParentId] = {
        isNew: false,
        root: true,
        metadata: {},
      }
    }

    if (Object.keys(this.contentService.upDatedContent).length > 0 && nodesModified[this.currentCourseId]) {
      let tempUpdateContent = this.contentService.upDatedContent[this.currentCourseId]
      let requestBody: NSApiRequest.IContentUpdateV2

      if (tempUpdateContent.category === 'CourseUnit' || tempUpdateContent.category === 'Collection') {
        tempUpdateContent.visibility = 'Parent'
      } else {
        tempUpdateContent.versionKey = this.versionID === undefined ? this.versionKey.versionKey : this.versionID.versionKey
      }

      requestBody = {
        request: {
          content: tempUpdateContent,
        }
      }
      // tslint:disable-next-line:no-console

      requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)

      if (requestBody.request.content.duration === 0 || requestBody.request.content.duration) {
        requestBody.request.content.duration =
          isNumber(requestBody.request.content.duration) ?
            requestBody.request.content.duration.toString() : requestBody.request.content.duration
      }

      if (requestBody.request.content.category) {
        delete requestBody.request.content.category
      }

      if (requestBody.request.content.trackContacts && requestBody.request.content.trackContacts.length > 0) {
        requestBody.request.content.reviewer = JSON.stringify(requestBody.request.content.trackContacts)
        requestBody.request.content.reviewerIDs = []
        const tempTrackRecords: string[] = []
        requestBody.request.content.trackContacts.forEach(element => {
          tempTrackRecords.push(element.id)
        })
        requestBody.request.content.reviewerIDs = tempTrackRecords
        delete requestBody.request.content.trackContacts
      }

      if (requestBody.request.content.gatingEnabled && requestBody.request.content.gatingEnabled) {

        requestBody.request.content.gatingEnabled = requestBody.request.content.gatingEnabled
        delete requestBody.request.content.gatingEnabled
      }

      if (requestBody.request.content.publisherDetails && requestBody.request.content.publisherDetails.length > 0) {
        requestBody.request.content.publisherIDs = []
        const tempPublisherRecords: string[] = []
        requestBody.request.content.publisherDetails.forEach(element => {
          tempPublisherRecords.push(element.id)
        })
        requestBody.request.content.publisherIDs = tempPublisherRecords
      }
      if (requestBody.request.content.creatorContacts && requestBody.request.content.creatorContacts.length > 0) {
        requestBody.request.content.creatorIDs = []
        const tempCreatorsRecords: string[] = []
        requestBody.request.content.creatorContacts.forEach(element => {
          tempCreatorsRecords.push(element.id)
        })
        requestBody.request.content.creatorIDs = tempCreatorsRecords
      }
      if (requestBody.request.content.catalogPaths && requestBody.request.content.catalogPaths.length > 0) {
        requestBody.request.content.topics = []
        const tempTopicData: string[] = []
        requestBody.request.content.catalogPaths.forEach((element: any) => {
          tempTopicData.push(element.identifier)
        })
        requestBody.request.content.topics = tempTopicData
      }

      this.contentService.currentContentData = requestBody.request.content
      this.contentService.currentContentID = this.currentCourseId
      //let nodesModified = {}
      // tslint:disable-next-line:no-console
      console.log("requestBody", requestBody)

      if (tempUpdateContent.category === 'Resource' || tempUpdateContent.category === undefined || tempUpdateContent.category === 'Course') {
        return this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.currentCourseId).pipe(
          tap(() => {
            this.storeService.changedHierarchy = {}
            this.loader.changeLoad.next(true)

            this.editorService.readcontentV3(this.contentService.parentContent).subscribe(async (data: any) => {
              this.courseData = await data
              this.contentService.resetOriginalMetaWithHierarchy(data)
              if (this.isSettingsPage && !this.isError) {
                this.action("push")
                this.loader.changeLoad.next(false)
              }
              // tslint:disable-next-line: align
            })
            Object.keys(this.contentService.upDatedContent).forEach(id => {
              this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
            })
            this.contentService.upDatedContent = {}
          })
        )
      } else {

      }

    }

    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.contentService.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }


    return this.editorService.updateContentV4(requestBodyV2).pipe(
      tap(() => {
        this.editorService.readcontentV3(this.contentService.parentContent).subscribe(async (data: any) => {
          this.courseData = await data
          this.contentService.resetOriginalMetaWithHierarchy(data)
        })
        this.storeService.changedHierarchy = {}
        Object.keys(this.contentService.upDatedContent).forEach(async id => {
          this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
        })
        this.contentService.upDatedContent = {}
      }),
    )


  }
  async updates() {
    // tslint:disable-next-line:no-console
    console.log("update")
    this.resourseSelected = ''
    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.contentService.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }
    await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
      this.editorService.readcontentV3(this.contentService.parentContent).subscribe(async (data: any) => {
        this.courseData = await data
        this.contentService.resetOriginalMetaWithHierarchy(data)
        // tslint:disable-next-line: align
      })
    })
  }
  get validationCheck(): boolean {
    const currentNodeId = this.storeService.lexIdMap.get(this.currentParentId) as number[]
    console.log("this.courseData", this.courseData)
    let returnValue = this.storeService.validationCheck(currentNodeId[0], this.courseData)

    // console.log('returnvalue ', returnValue)

    // returnValue = null

    if (returnValue) {
      this.isError = true
      const dialog = this.dialog.open(ErrorParserComponent, {
        width: '80vw',
        height: '90vh',
        data: {
          processErrorData: returnValue,
        },
      })
      dialog.afterClosed().subscribe(v => {
        if (v) {
          if (typeof v === 'string') {
            this.storeService.selectedNodeChange.next(
              (this.storeService.lexIdMap.get(v) as number[])[0],
            )
            this.contentService.changeActiveCont.next(v)
          } else {
            this.storeService.selectedNodeChange.next(v)
            this.contentService.changeActiveCont.next(
              this.storeService.uniqueIdMap.get(v) as string,
            )
          }
        }
        this.isError = false
      })
      return false
    }
    return true
  }
  takeAction(contentAction?: string) {
    this.isSubmitPressed = true

    if (this.validationCheck) {

      this.editorService.readcontentV3(this.contentService.parentContent).subscribe((resData: any) => {
        if (resData && Object.keys(resData).length > 0) {
          resData.creatorContacts =
            this.jsonVerify(resData.creatorContacts) ? JSON.parse(resData.creatorContacts) : []
          resData.trackContacts =
            this.jsonVerify(resData.reviewer) ? JSON.parse(resData.reviewer) : []
          resData.gatingEnabled =
            this.jsonVerify(resData.gatingEnabled) ? JSON.parse(resData.gatingEnabled) : []
          resData.creatorDetails =
            this.jsonVerify(resData.creatorDetails) ? JSON.parse(resData.creatorDetails) : []
          resData.publisherDetails = this.jsonVerify(resData.publisherDetails) ?
            JSON.parse(resData.publisherDetails) : []
          if (resData.children.length > 0) {
            resData.children.forEach((element: any) => {
              element.creatorContacts = this.jsonVerify(element.creatorContacts) ? JSON.parse(element.creatorContacts) : []
              element.trackContacts = this.jsonVerify(element.reviewer) ? JSON.parse(element.reviewer) : []
              element.creatorDetails = this.jsonVerify(element.creatorDetails) ? JSON.parse(element.creatorDetails) : []
              element.publisherDetails = this.jsonVerify(element.publisherDetails) ? JSON.parse(element.publisherDetails) : []
            })
          }
          this.contentService.setOriginalMeta(resData)
        }
      })
      if (contentAction !== 'publishResources' && !this.isVisibleReviewDialog) {
        this.isVisibleReviewDialog = true
        const dialogRef = this.dialog.open(CommentsDialogComponent, {
          width: '750px',
          height: '450px',
          data: this.contentService.getOriginalMeta(this.currentParentId),
        })

        dialogRef.afterClosed().subscribe((d) => {
          console.log(d)
          this.isVisibleReviewDialog = false
          // this.finalCall(contentAction)
          if (d) {
            if (this.getAction() === 'sendForReview' && d.value.action === 'reject') {
              contentAction = 'rejectContent'
              //this.finalCall(contentAction)
              let dat = {
                "userId": this._configurationsService!.userProfile!.userId,
                "courseId": this.courseData.identifier,
                "role": "creator",
                "comments": d.value.comments,
                "currentStatus": "Draft",
                "nextStatus": "Review",
                "readComments": false,
                "createdDate": new Date(),
                "updatedDate": new Date(),

              }
              this.progressSvc.addComment(dat).subscribe(res => {
                console.log(res)
                if (res) {
                  this.finalCall(contentAction)
                }
                //this.commentsList = res
              }, (err: any) => {
                console.log(err)
                this.finalCall(contentAction)
              })
              console.log(contentAction)
            } else {
              console.log(contentAction)
              if (contentAction === 'acceptConent') {
                let dat = {
                  "userId": this._configurationsService!.userProfile!.userId,
                  "courseId": this.courseData.identifier,
                  "role": "creator",
                  "comments": d.value.comments,
                  "currentStatus": "Draft",
                  "nextStatus": "Review",
                  "readComments": false,
                  "createdDate": new Date(),
                  "updatedDate": new Date(),

                }
                this.progressSvc.addComment(dat).subscribe(res => {
                  console.log(res)
                  if (res) {
                    this.finalCall(contentAction)
                  }
                  //this.commentsList = res
                }, (err: any) => {
                  console.log(err)
                  this.finalCall(contentAction)
                })
              }
              //this.finalCall(contentAction)
            }
          }
        })
      }
      if (contentAction === 'publishResources') {
        // tslint:disable-next-line:no-console
        console.log("here", this.getAction())

        this.finalCall(contentAction)
      }
    }



  }
  async finalCall(contentActionTaken: any) {
    console.log(contentActionTaken, 'tok')
    let flag = 0
    const resourceListToReview: any = []
    const moduleListToReview: any = []
    const updatedMeta = this.contentService.getUpdatedMeta(this.currentParentId)
    const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
    if (contentActionTaken === 'acceptConent' || contentActionTaken === 'publishResources') {
      if (originalData && originalData.children && originalData.children.length > 0) {

        for (const element of originalData.children) {
          if (element.contentType === 'CourseUnit' || element.contentType === 'Collection') {
            if (element.children.length > 0) {
              element.children.forEach((subElement: any) => {
                const tempChildData = {
                  identifier: subElement.identifier,
                  status: subElement.status,
                  parentStatus: updatedMeta.status,
                  versionKey: subElement.versionKey,
                  reviewerStatus: subElement.reviewStatus,
                }
                resourceListToReview.push(tempChildData)
              })
            }
            const tempParentData = {
              identifier: element.identifier,
              status: element.status,
              parentStatus: updatedMeta.status,
              versionKey: element.versionKey,
            }
            moduleListToReview.push(tempParentData)

          } else {
            const tempData = {
              identifier: element.identifier,
              status: element.status,
              parentStatus: updatedMeta.status,
              versionKey: element.versionKey,
              reviewerStatus: element.reviewStatus,
            }
            resourceListToReview.push(tempData)
          }
        }

        if (originalData.reviewStatus === 'InReview' && originalData.status === 'Review') {
          // this.reviewerApproved(originalData, resourceListToReview)
        } else if (originalData.reviewStatus === 'Reviewed' && originalData.status === 'Review') {
          //this.contentPublish(originalData, resourceListToReview)
          // this.contentPublish(resourceListToReview)
        } else if (resourceListToReview.length > 0) {

          this.loader.changeLoad.next(true)
          for await (const element of resourceListToReview) {

            if ((element.status === 'Live' || element.status === 'Review') && updatedMeta.status === 'Draft') {
              flag += 1
            } else if ((element.status === 'Live') && updatedMeta.status === 'Review') {
              flag += 1
            } else {
              const requestPayload = {
                request: {
                  content: {
                    reviewStatus: 'InReview',
                    versionKey: element.versionKey,
                  },
                },
              }

              const reviewRes =
                await this.editorService.sendToReview(element.identifier, updatedMeta.status).toPromise().catch(_error => { })
              if (reviewRes && reviewRes.params && reviewRes.params.status === 'successful') {
                const updateContentRes =
                  await this.editorService.updateContentWithFewFields(requestPayload, element.identifier).toPromise().catch(_error => { })
                if (updateContentRes && updateContentRes.params && updateContentRes.params.status === 'successful') {
                  flag += 1
                } else {
                  flag -= 1
                }
              } else {
                flag -= 1
              }
            }
          }
          if (resourceListToReview.length === flag && moduleListToReview.length > 0) {
            this.storeService.parentData = this.courseData
            const tempRequset: NSApiRequest.IContentUpdateV3 = {
              request: {
                data: {
                  //nodesModified: {},
                  nodesModified: this.contentService.getNodeModifyData(),
                  hierarchy: this.storeService.getTreeHierarchy(),
                },
              },
            }
            if (updatedMeta.status === 'Draft') {
              this.editorService.updateContentV4(tempRequset).subscribe(() => {
                this.dialog.closeAll()
                this.finalSaveAndRedirect(updatedMeta)
                // this.sendModuleToReviewOrPublish(moduleListToReview, updatedMeta)
              })
            } else {
              this.finalSaveAndRedirect(updatedMeta)
            }
          } else if (resourceListToReview.length === flag) {
            this.dialog.closeAll()
            // this.loader.changeLoad.next(false)
            this.finalSaveAndRedirect(updatedMeta)
          } else {
            this.loader.changeLoad.next(false)
          }
        }
      }
    } else {
      // tslint:disable-next-line:no-console
      console.log("yes here")
      // this.changeStatusToDraft('Content Rejected')
    }
  }
  finalSaveAndRedirect(updatedMeta: any) {
    const saveCall = (of({} as any)).pipe(
      mergeMap(() =>
        this.editorService
          // .forwardBackward(
          //   body,
          //   this.currentParentId,
          //   this.contentService.originalContent[this.currentParentId].status,
          // )
          .sendToReview(updatedMeta.identifier, updatedMeta.status)
          .pipe(
            mergeMap(() => {
              // this.notificationSvc
              //   .triggerPushPullNotification(
              //     updatedMeta,
              //     body.comment,
              //     body.operation ? true : false,
              //   )
              // .pipe(
              //   catchError(() => {
              //     return of({} as any)
              //   }),
              // ),
              return of({} as any)
            }
            ),
          ),
      ),
    )
    this.loader.changeLoad.next(true)
    saveCall.subscribe(
      async () => {
        const requestPayload = {
          request: {
            content: {
              reviewStatus: 'InReview',
              versionKey: updatedMeta.versionKey,
            },
          },
        }
        const updateConentRes =
          await this.editorService.updateContentWithFewFields(requestPayload, updatedMeta.identifier).toPromise().catch(_error => { })
        if (updateConentRes && updateConentRes.params && updateConentRes.params.status === 'successful') {
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: this.getMessage('success'),
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          await this.sendEmailNotification('sendForReview')
          this.contents = this.contents.filter(v => v.identifier !== this.currentParentId)
          if (this.contents.length) {
            this.contentService.changeActiveCont.next(this.contents[0].identifier)
          } else {
            this.loader.changeLoad.next(false)
            this.dialog.open(SuccessDialogComponent, {
              width: '450px',
              height: '300x',
              data: { 'message': 'Course Sent For Review', 'icon': 'check_circle', 'color': 'rgb(44, 185, 58)', 'backgroundColor': '#FFFFF', 'padding': '6px 11px 10px 6px !important', 'id': this.contentService.parentContent },
            })
            // this.router.navigate(['author', 'cbp'])
          }
        } else {
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: this.getMessage('failure'),
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        }
      },
      (error: any) => {
        if (error.status === 409) {
          const errorMap = new Map<string, NSContent.IContentMeta>()
          Object.keys(this.contentService.originalContent).forEach(v =>
            errorMap.set(v, this.contentService.originalContent[v]),
          )
          this.isError = true
          const dialog = this.dialog.open(ErrorParserComponent, {
            width: '80vw',
            height: '90vh',
            data: {
              errorFromBackendData: error.error,
              dataMapping: errorMap,
            },
          })
          dialog.afterClosed().subscribe(v => {
            if (v) {
              if (typeof v === 'string') {
                this.storeService.selectedNodeChange.next(
                  (this.storeService.lexIdMap.get(v) as number[])[0],
                )
                this.contentService.changeActiveCont.next(v)
              } else {
                this.storeService.selectedNodeChange.next(v)
                this.contentService.changeActiveCont.next(
                  this.storeService.uniqueIdMap.get(v) as string,
                )
              }
            }
            this.isError = false
          })
        }
        this.loader.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: this.getMessage('failure'),
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }
  async sendEmailNotification(actionType: string) {
    const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
    const emailReqPayload = {
      contentState: actionType,
      contentLink: `${environment.cbpPortal}author/editor/${originalData.identifier}/collection`,
      contentName: (this._configurationsService.userProfile) ? this._configurationsService.userProfile.userName : '',
      sender: (this._configurationsService.userProfile) ? this._configurationsService.userProfile.email : '',
      recipientEmails: <any>[],
    }
    switch (actionType) {
      case 'sendForReview':
        let reviewerData: any[]
        if (typeof originalData.reviewer === 'string') {
          reviewerData = JSON.parse(originalData.reviewer)
        } else {
          reviewerData = originalData.reviewer
        }
        if (reviewerData && reviewerData.length > 0) {
          reviewerData.forEach((element: any) => {
            if (element.email) {
              emailReqPayload.recipientEmails.push(element.email)
            }
          })
        }
        break
      case 'sendForPublish':
        let publisherData: any[]
        if (typeof originalData.publisherDetails === 'string') {
          publisherData = JSON.parse(originalData.publisherDetails)
        } else {
          publisherData = originalData.publisherDetails
        }
        if (publisherData && publisherData.length > 0) {
          publisherData.forEach((element: any) => {
            if (element.email) {
              emailReqPayload.recipientEmails.push(element.email)
            }
          })
        }
        break
      case 'reviewFailed':
      case 'publishFailed':
      case 'publishCompleted':
        let creatorData: any[]
        if (typeof originalData.creatorContacts === 'string') {
          creatorData = JSON.parse(originalData.creatorContacts)
        } else {
          creatorData = originalData.creatorContacts
        }
        if (creatorData && creatorData.length > 0) {
          creatorData.forEach((element: any) => {
            if (element.email) {
              emailReqPayload.recipientEmails.push(element.email)
            }
          })
        }
        break
    }
    if (emailReqPayload.recipientEmails && emailReqPayload.recipientEmails.length > 0) {
      await this.editorService.sendEmailNotificationAPI(emailReqPayload).toPromise().catch(_error => { })
    }
  }
  getMessage(type: 'success' | 'failure') {
    if (type === 'success') {
      switch (this.contentService.originalContent[this.currentParentId].status) {
        case 'Draft':
        case 'Live':
          return Notify.SEND_FOR_REVIEW_SUCCESS
        case 'InReview':
          return Notify.REVIEW_SUCCESS
        case 'Reviewed':
        case 'Review':
          return Notify.PUBLISH_SUCCESS
        default:
          return ''
      }
    }
    switch (this.contentService.originalContent[this.currentParentId].status) {
      case 'Draft':
      case 'Live':
        return Notify.SEND_FOR_REVIEW_FAIL
      case 'InReview':
        return Notify.REVIEW_FAIL
      case 'Reviewed':
      case 'Review':
        return Notify.PUBLISH_FAIL
      default:
        return ''
    }
  }
  async changeStatusToDraft(comment: string) {
    //const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
    const originalData = await this.editorService.readcontentV3(this.contentService.parentContent).toPromise()
    this.dialog.closeAll()
    const resourceListToReview: any = []
    const moduleListToReview: any = []
    originalData.children.forEach((element: any) => {
      if (element.contentType === 'CourseUnit' || element.contentType === 'Collection') {
        if (element.children.length > 0) {
          element.children.forEach((subElement: any) => {
            if (subElement.status === 'Review') {
              const tempChildData = {
                identifier: subElement.identifier,
                status: subElement.status,
                versionKey: subElement.versionKey,
              }
              resourceListToReview.push(tempChildData)
            }
          })
        }
        const tempParentData = {
          identifier: element.identifier,
          status: element.status,
          versionKey: element.versionKey,
        }
        moduleListToReview.push(tempParentData)
      } else {
        if (element.status === 'Review') {
          const tempData = {
            identifier: element.identifier,
            status: element.status,
            versionKey: element.versionKey,
          }
          resourceListToReview.push(tempData)
        }
      }
    })
    let flag = 0
    const updateContentReq: any = {
      request: {
        content: {
          reviewStatus: 'InReview',
          versionKey: 0,
        },
      },
    }
    if (resourceListToReview.length > 0) {
      const requestBody: any = {
        request: {
          content: {
            rejectComment: comment,
          },
        },
      }

      for await (const element of resourceListToReview) {
        this.loader.changeLoad.next(true)
        updateContentReq.request.content.versionKey = element.versionKey
        const updateContentRes =
          await this.editorService.updateContentForReviwer(updateContentReq, element.identifier).toPromise().catch(_error => { })
        if (updateContentRes && updateContentRes.params && updateContentRes.params.status === 'successful') {
          const rejectRes: any = await this.editorService.rejectContentApi(requestBody, element.identifier).toPromise().catch(_error => { })
          if (rejectRes && rejectRes.params && rejectRes.params.status === 'successful') {
            flag += 1
          } else {
            flag -= 1
          }
        } else {
          flag -= 1
        }
      }
      if (flag === resourceListToReview.length) {
        updateContentReq.request.content.versionKey = originalData.versionKey
        const tempRequset: NSApiRequest.IContentUpdateV3 = {
          request: {
            data: {
              nodesModified: this.contentService.getNodeModifyData(),
              hierarchy: this.storeService.getTreeHierarchy(),
            },
          },
        }
        const updateHierarchyRes = await this.editorService.updateHierarchyForReviwer(tempRequset).toPromise().catch(_error => { })
        if (updateHierarchyRes && updateHierarchyRes.params && updateHierarchyRes.params.status === 'successful') {
          const parentMetaRes =
            await this.editorService.updateContentForReviwer(updateContentReq, originalData.identifier).toPromise().catch(_error => { })
          if (parentMetaRes && parentMetaRes.params && parentMetaRes.params.status === 'successful') {
            const rejectParentRes: any =
              await this.editorService.rejectContentApi(requestBody, originalData.identifier).toPromise().catch(_error => { })
            if (rejectParentRes && rejectParentRes.params && rejectParentRes.params.status === 'successful') {
              this.loader.changeLoad.next(false)
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.SAVE_SUCCESS,
                },
                duration: NOTIFICATION_TIME * 1000,
              })
              if (originalData.reviewStatus === 'InReview' && originalData.status === 'Review') {
                await this.sendEmailNotification('reviewFailed')
              } else if (originalData.reviewStatus === 'Reviewed' && originalData.status === 'Review') {
                await this.sendEmailNotification('publishFailed')
              }
              this.dialog.open(SuccessDialogComponent, {
                width: '450px',
                height: '300x',
                data: { 'message': 'Course sent back to Creator’s Draft', 'icon': 'cached', 'color': 'white', 'backgroundColor': '#407BFF', 'padding': '5px 9px 8px 6px !important', 'id': this.contentService.parentContent },
              })
              if (!this.isMoveCourseToDraft) {
                this.router.navigate(['author', 'cbp'])
              }
              this.isMoveCourseToDraft = false
            } else {
              this.loader.changeLoad.next(false)
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.SAVE_FAIL,
                },
                duration: NOTIFICATION_TIME * 1000,
              })
            }
          } else {
            this.loader.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_FAIL,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          }
        } else {
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        }
      } else {
        this.loader.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      }
    } else if (originalData.status === 'Review') {
      const requestBody: any = {
        request: {
          content: {
            rejectComment: comment,
          },
        },
      }
      const updateRequestBody: any = {
        request: {
          content: {
            reviewStatus: 'InReview',
            versionKey: originalData.versionKey,
          },
        },
      }
      const updateRes: any =
        await this.editorService.updateContentForReviwer(updateRequestBody, originalData.identifier).toPromise().catch(_error => { })
      if (updateRes && updateRes.params && updateRes.params.status === 'successful') {
        this.editorService.rejectContentApi(requestBody, originalData.identifier).subscribe((parentData: any) => {
          if (parentData && parentData.params && parentData.params.status === 'successful') {
            this.loader.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_SUCCESS,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
            this.dialog.open(SuccessDialogComponent, {
              width: '450px',
              height: '300x',
              data: { 'message': 'Course sent back to Creator’s Draft', 'icon': 'cached', 'color': 'white', 'backgroundColor': '#407BFF', 'padding': '5px 9px 8px 6px !important', 'id': this.contentService.parentContent },
            })
            if (!this.isMoveCourseToDraft) {
              this.router.navigate(['author', 'cbp'])
            }
            this.isMoveCourseToDraft = false
          } else {

            this.loader.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_FAIL,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          }
        },
          // tslint:disable-next-line: align
          _error => {
            this.loader.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_FAIL,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          })
      } else {
        this.loader.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      }
    } else {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SAVE_FAIL,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    }
  }
  async contentPublish(resourceList: any) {
    this.loader.changeLoad.next(true)
    let flag = 0
    if (resourceList && resourceList.length > 0) {
      for await (const element of resourceList) {
        if (element.status === 'Live' && element.parentStatus === 'Review') {
          flag += 1
        } else if (element.reviewerStatus === 'Reviewed' && element.status === 'Review') {
          const publishRes = await this.editorService.publishContent(element.identifier).toPromise().catch(_error => {
            this.dialog.closeAll()
            this.snackBar.open(_error.statusText, undefined, { duration: 1000 })
          })
          if (publishRes && publishRes.params && publishRes.params.status === 'successful') {
            flag += 1
          } else {
            flag -= 1
          }
        }
      }
      if (flag === resourceList.length) {
        // const publishParentRes = await this.editorService.publishContent(metaData.identifier).toPromise().catch(_error => { })
        // if (publishParentRes && publishParentRes.params && publishParentRes.params.status === 'successful') {
        //   this.loader.changeLoad.next(false)
        //   this.snackBar.openFromComponent(NotificationComponent, {
        //     data: {
        //       type: Notify.SAVE_SUCCESS,
        //     },
        //     duration: NOTIFICATION_TIME * 1000,
        //   })
        //   await this.sendEmailNotification('publishCompleted')
        //   this.router.navigate(['author', 'cbp'])
        // } else {
        //   this.loader.changeLoad.next(false)
        //   this.snackBar.openFromComponent(NotificationComponent, {
        //     data: {
        //       type: Notify.SAVE_FAIL,
        //     },
        //     duration: NOTIFICATION_TIME * 1000,
        //   })
        // }
        // const tempRequset: NSApiRequest.IContentUpdateV3 = {
        //   request: {
        //     data: {
        //       nodesModified: this.contentService.getNodeModifyData(),
        //       hierarchy: this.storeService.getTreeHierarchy(),
        //     },
        //   },
        // }
        // let result = await this.editorService.updateHierarchyForReviwer(tempRequset).toPromise().catch(_error => { })

        //if (result.params.status === 'successful') {
        this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
          // tslint:disable-next-line:no-console
          console.log(data)
          this.contentService.resetOriginalMetaWithHierarchy(data)
          this.initService.publishData(data)
          // tslint:disable-next-line: align
        })
        //}
        this.loader.changeLoad.next(false)

      } else {
        this.loader.changeLoad.next(false)
        this.snackBar.open('The status of the resources present in the course is not correct, please retire the course and start over again', undefined, { duration: 3000 })
        // this.snackBar.openFromComponent(NotificationComponent, {
        //   data: {
        //     type: Notify.SAVE_FAIL,
        //   },
        //   duration: NOTIFICATION_TIME * 1000,
        // })
      }
    }
  }
  async reviewerApproved(metaData: NSContent.IContentMeta, resourceList: any) {
    this.loader.changeLoad.next(true)
    let flag = 0
    if (resourceList && resourceList.length > 0) {
      const requestPayload = {
        request: {
          content: {
            reviewStatus: 'Reviewed',
            versionKey: 0,
          },
        },
      }
      for await (const element of resourceList) {
        requestPayload.request.content.versionKey = element.versionKey
        if (element.status === 'Live' && element.parentStatus === 'Review') {
          flag += 1
        } else if (element.reviewerStatus === 'InReview' && element.status === 'Review') {
          const updateRes =
            await this.editorService.updateContentForReviwer(requestPayload, element.identifier).toPromise().catch(_error => { })
          if (updateRes && updateRes.params && updateRes.params.status === 'successful') {
            flag += 1
          } else {
            flag -= 1
          }
        }
      }
      if (flag === resourceList.length) {
        requestPayload.request.content.versionKey = metaData.versionKey
        // const tempRequset: NSApiRequest.IContentUpdateV3 = {
        //   request: {
        //     data: {
        //       nodesModified: this.contentService.getNodeModifyData(),
        //       hierarchy: this.storeService.getTreeHierarchy(),
        //     },
        //   },
        // }
        // const updateHierarchyRes = await this.editorService.updateHierarchyForReviwer(tempRequset).toPromise().catch(_error => { })
        // if (updateHierarchyRes && updateHierarchyRes.params && updateHierarchyRes.params.status === 'successful') {
        const parentMetaRes =
          await this.editorService.updateContentForReviwer(requestPayload, metaData.identifier).toPromise().catch(_error => { })
        if (parentMetaRes && parentMetaRes.params && parentMetaRes.params.status === 'successful') {
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          await this.sendEmailNotification('sendForPublish')
          this.dialog.open(SuccessDialogComponent, {
            width: '450px',
            height: '300x',
            data: { 'message': 'Course Accepted and sent to Publisher', 'icon': 'check_circle', 'color': 'rgb(44, 185, 58)', 'backgroundColor': '#FFFFF', 'padding': '6px 11px 10px 6px !important', 'id': this.contentService.parentContent },
          })
          // this.router.navigate(['author', 'cbp'])
          // } else {
          //   this.loader.changeLoad.next(false)
          //   this.snackBar.openFromComponent(NotificationComponent, {
          //     data: {
          //       type: Notify.SAVE_FAIL,
          //     },
          //     duration: NOTIFICATION_TIME * 1000,
          //   })
          // }
        } else {
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        }
      } else {
        this.loader.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      }
    }
  }
  getChildrenCount(): any {
    let count = 0
    for (const element of this.courseData.children) {
      // console.log('element', element)
      if (element.contentType !== 'CourseUnit' && (element.mimeType === 'application/quiz' || element.mimeType === 'application/json')) {
        count += 1
      }
      if (element.children) {
        for (const elem of element.children) {
          if (elem.contentType !== 'CourseUnit' && (elem.mimeType === 'application/quiz' || elem.mimeType === 'application/json')) {
            count += 1
          }
        }
      }
    }
    if (this.courseData && this.courseData.competency == true) {
      this.hideModule = true
    } else {
      this.hideModule = false
    }
    if (this.courseData && this.courseData.competency == true && count >= 5) {
      this.hideResource = true
    } else {
      this.hideResource = false
    }
  }
  ngAfterViewInit() {
    this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
      this.courseData = await data
      //this.moduleButtonName = 'Save'
      //this.isSaveModuleFormEnable = true
      //this.showAddModuleForm = true
      this.isSaveModuleFormEnable = true
      //this.showAddModuleForm = true
      if (this.courseData && this.courseData.children.length >= 2) {
        this.showSettingsPage = true
      }

      if (this.courseData && this.courseData.competency == true) {
        this.isSelfAssessment = true
      } else {
        this.isSelfAssessment = false
      }
      this.moduleName = data.name
      this.topicDescription = data.description
      this.thumbnail = data.thumbnail

      // if (data.duration) {
      //   const minutes = data.duration > 59 ? Math.floor(data.duration / 60) : 0
      //   const second = data.duration % 60
      //   const hour = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
      //   const minute = minutes ? minutes % 60 : 0
      //   const seconds = second || 0
      //   this.mainCourseDuration = hour + ':' + minute + ':' + seconds
      // }
      if (data.children.length > 0) {
        this.loader.changeLoad.next(true)
        data.children.forEach((element: any) => {
          if (element.duration) {
            this.resourceDurat.push(parseInt(element.duration))
          }
          if (element.children && element.children.length > 0) {
            element.children.forEach((ele: any) => {
              if (ele.duration) {
                this.resourceDurat.push(parseInt(ele.duration))
              }
            })
          }
        })
        // tslint:disable-next-line:no-console
        console.log(this.resourceDurat)
        if (this.resourceDurat.length > 0) {
          this.sumDuration = this.resourceDurat.reduce((a: any, b: any) => a + b)
          // tslint:disable-next-line:no-console
          console.log(this.sumDuration.toString(), this.courseData.duration)
          if (this.sumDuration.toString() !== this.courseData.duration) {
            let requestBody: any
            requestBody = {
              request: {
                content: {
                  duration: isNumber(this.sumDuration) ?
                    this.sumDuration.toString() : this.sumDuration,
                  versionKey: data.versionKey
                },
              }
            }
            this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.courseData.identifier).subscribe((response: any) => {
              // tslint:disable-next-line:no-console
              console.log(response)
            })
          }
          this.loader.changeLoad.next(false)
          this.setCourseDuration(this.sumDuration)
        }
        this.loader.changeLoad.next(false)

      }
      //this.isResourceTypeEnabled = true
      // tslint:disable-next-line:no-console
      console.log(this.isSaveModuleFormEnable)
      //this.editorStore.resetOriginalMetaWithHierarchy(data)
    })
  }
  setSettingsPage() {
    // this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
    //   if (data) {
    //     this.courseData = await data
    //     this.isSettingsPage = true
    //   }
    // })
    this.editorService.readcontentV3(this.contentService.parentContent).toPromise()
    // this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => { })
    // this.ngAfterViewInit()
    setTimeout(() => {
      sessionStorage.setItem('isSettingsPage', '1')
      this.isSettingsPage = true
      this.editItem = ''
    }, 1000)
    // tslint:disable-next-line:no-console
    console.log("this.settingsPage", this.isSettingsPage)
  }
  moduleCreate(name: string, input1: string, input2: string) {
    // tslint:disable-next-line:no-console
    console.log(input1, input2)
    let obj: any = {}
    if (this.moduleButtonName == 'Create') {
      obj["type"] = 'collection'
      obj["name"] = input1
      obj["description"] = input2
      this.addResourceModule = obj
      this.moduleName = name
      this.isSaveModuleFormEnable = true
      this.moduleButtonName = 'Save'

      this.setContentType(obj)
      //this.initService.createModuleUnit(obj)
      this.clearForm()
      this.editItem = ''
    } else if (this.moduleButtonName == 'Save') {
      this.isResourceTypeEnabled = true
    }
  }
  timeToSeconds() {
    let total = 0
    total += this.seconds ? (this.seconds < 60 ? this.seconds : 59) : 0
    total += this.minutes ? (this.minutes < 60 ? this.minutes : 59) * 60 : 0
    total += this.hours ? this.hours * 60 * 60 : 0
    this.resourceLinkForm.controls.duration.setValue(total)
    return total
  }
  private setDuration(seconds: any) {
    const minutes = seconds > 59 ? Math.floor(seconds / 60) : 0
    const second = seconds % 60
    this.hours = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
    this.minutes = minutes ? minutes % 60 : 0
    this.seconds = second || 0
    // this.mainCourseDuration = this.hours + ':' + this.minutes + ':' + this.seconds
  }
  private setCourseDuration(seconds: any) {
    const minutes = seconds > 59 ? Math.floor(seconds / 60) : 0
    const second = seconds % 60
    this.courseHours = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
    this.courseMinutes = minutes ? minutes % 60 : 0
    this.courseSeconds = second || 0
    this.mainCourseDuration = this.courseHours + ':' + this.courseMinutes + ':' + this.courseSeconds
  }
  async resourceLinkSave() {
    // tslint:disable-next-line:no-console
    console.log(" this.resourceLinkForm", this.resourceLinkForm)
    if (this.resourceLinkForm.status == 'INVALID' && !this.isAssessmentOrQuizEnabled) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.REQUIRED_FIELD,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    } else if (this.resourceLinkForm.controls.instructions.status == 'INVALID' ||
      this.resourceLinkForm.controls.appIcon.status == 'INVALID') {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.REQUIRED_FIELD,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    } else {
      this.resourceLinkForm.controls.duration.setValue(this.timeToSeconds())
      if (this.resourceLinkForm.value.duration == 0 && !this.isAssessmentOrQuizEnabled) {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.DURATION_CANT_BE_0,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      } else {
        //this.versionKey = this.contentService.getUpdatedMeta(this.currentCourseId)
        let iframeSupported
        if (this.resourceLinkForm.value.isIframeSupported)
          iframeSupported = 'Yes'
        else
          iframeSupported = 'No'
        var res = this.resourceLinkForm.value.artifactUrl.match(/(http(s)?:\/\/.)(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
        this.versionKey = this.contentService.getUpdatedMeta(this.currentCourseId)
        if (res !== null) {
          if (this.resourceLinkForm.value.name.trim() === '') {
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.INVALID_RESOURCE_NAME,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          } else {
            const rBody: any = {
              name: this.resourceLinkForm.value.name,
              instructions: this.resourceLinkForm.value.instructions,
              description: this.resourceLinkForm.value.instructions,
              artifactUrl: this.resourceLinkForm.value.artifactUrl,
              isIframeSupported: iframeSupported,
              //gatingEnabled: this.resourceLinkForm.value.isgatingEnabled,
              duration: this.resourceLinkForm.value.duration,
              versionKey: this.updatedVersionKey,
            }
            await this.editorStore.setUpdatedMeta(rBody, this.currentContent)
            await this.saves()
            this.clearForm()
            this.editItem = ''
          }
        } else if (res == null && !this.isAssessmentOrQuizEnabled) {
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.LINK_IS_INVALID,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        } else {
          if (this.resourceLinkForm.value.name.trim() === '') {
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.INVALID_RESOURCE_NAME,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          } else {
            const rBody: any = {
              name: this.resourceLinkForm.value.name,
              instructions: this.resourceLinkForm.value.instructions,
              description: this.resourceLinkForm.value.instructions,
              isIframeSupported: iframeSupported,
              //gatingEnabled: this.resourceLinkForm.value.isgatingEnabled,
              versionKey: this.versionKey.versionKey,
            }
            await this.editorStore.setUpdatedMeta(rBody, this.currentContent)
            await this.saves()
            this.editItem = ''
          }
        }
      }
    }

  }
  async deleteUploadedFile() {
    this.contentService.removeListOfFilesAndUpdatedIPR(this.currentContent)
    this.uploadFileName = ''
    this.file = null
    this.duration = '0'
    this.mimeType = ''
    let meta: any = {}
    meta['versionKey'] = this.content.versionKey
    meta['artifactUrl'] = null
    meta['downloadUrl'] = null
    if (this.content.mimeType === 'video/mp4' || this.content.mimeType === 'audio/mpeg') {
      meta['duration'] = "0"
    }
    let requestBody = {
      request: {
        content: meta
      }
    }
    this.editorStore.setUpdatedMeta(meta, this.currentContent)
    this.loader.changeLoad.next(true)
    await this.editorService.updateNewContentV3(requestBody, this.currentContent).subscribe(
      async (info: any) => {
        // tslint:disable-next-line:no-console
        console.log('info', info, this.editorStore.parentContent)
        if (info) {
          await this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
            this.courseData = data
            // tslint:disable-next-line:no-console
            console.log("this.courseData", this.courseData)
            if (info) {
              const hierarchyData = this.storeService.getNewTreeHierarchy(this.courseData)

              const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
                request: {
                  data: {
                    nodesModified: this.editorStore.getNodeModifyData(),
                    hierarchy: hierarchyData,
                  },
                },
              }
              this.loaderService.changeLoad.next(true)
              await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
                this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
                  this.courseData = data

                  if (this.courseData && this.courseData.children.length >= 2) {
                    this.showSettingsPage = true
                  } else {
                    this.showSettingsPage = false
                  }
                  this.getChildrenCount()
                  if (this.courseData && this.courseData.competency == true) {
                    this.isSelfAssessment = true
                  } else {
                    this.isSelfAssessment = false
                  }
                  this.loader.changeLoad.next(false)
                  this.snackBar.openFromComponent(NotificationComponent, {
                    data: {
                      type: Notify.UPLOAD_FILE_REMOVED,
                    },
                    duration: NOTIFICATION_TIME * 1000,
                  })
                  this.editorStore.resetOriginalMetaWithHierarchy(data)
                  if (this.content.mimeType === 'video/mp4' || this.content.mimeType === 'audio/mpeg') {
                    this.updateCouseDuration(data)
                    this.setDuration(0)
                  }
                })
              })
            }
          })
        }
      })
  }

  updateCouseDuration(data: any) {
    let resourceDurat: any = []
    let sumDuration: any = "0"
    if (data.children.length > 0) {
      data.children.forEach((element: any) => {
        if (element.duration) {
          resourceDurat.push(parseInt(element.duration))
        }
        if (element.children && element.children.length > 0) {
          element.children.forEach((ele: any) => {
            if (ele.duration) {
              resourceDurat.push(parseInt(ele.duration))
            }
          })
        }
      })
      // tslint:disable-next-line:no-console
      console.log(resourceDurat)
      if (resourceDurat.length > 0) {
        sumDuration = resourceDurat.reduce((a: any, b: any) => a + b)
      }

    }
    let requestBody: any
    // tslint:disable-next-line:no-console
    console.log(sumDuration)
    if (sumDuration) {
      requestBody = {
        request: {
          content: {
            duration: isNumber(sumDuration) ?
              sumDuration.toString() : sumDuration,
            versionKey: data.versionKey
          },
        }
      }
      this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.editorStore.parentContent).subscribe((response: any) => {
        // tslint:disable-next-line:no-console
        console.log('duration', response.duration)
        this.setCourseDuration(isNumber(sumDuration) ?
          sumDuration.toString() : sumDuration)
      })
    }
  }
  createResourseContent(name: string, type: string) {
    // tslint:disable-next-line:no-console
    console.log(type)
    this.resourceType = name
    this.independentResourceCount = this.independentResourceCount + 1
    this.independentResourceNames.push({ name: 'Resource ' + this.independentResourceCount })
    if (name == 'Link') {
      this.isLinkEnabled = true
      this.isShowDownloadBtnEnabled = false
      this.isPdfOrAudioOrVedioEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.setContentType(type, 'url')
    } else if (name == 'PDF') {
      this.uploadText = 'PDF'
      this.isLinkEnabled = false
      this.isShowDownloadBtnEnabled = true
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/pdf-icon.svg'
      this.acceptType = '.pdf'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      this.setContentType(type, 'pdf')
    } else if (name == 'Audio') {
      this.uploadText = 'mp3'
      this.isLinkEnabled = false
      this.isShowDownloadBtnEnabled = true
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/audio.png'
      this.acceptType = '.mp3'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      this.setContentType(type, 'audio')
    } else if (name == 'Video') {
      this.uploadText = 'mp4, m4v'
      this.isLinkEnabled = false
      this.isShowDownloadBtnEnabled = true
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/vedio-img.svg'
      this.acceptType = '.mp4, .m4v'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      this.setContentType(type, 'video')
    } else if (name == 'SCORM v1.1/1.2') {
      this.uploadText = '.zip'
      this.isLinkEnabled = false
      this.isShowDownloadBtnEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/SCROM-img.svg'
      this.acceptType = '.zip'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      this.setContentType(type, 'zip')
    } else if (name == 'Assessment') {
      this.isLinkEnabled = false
      this.isShowDownloadBtnEnabled = false
      this.isAssessmentOrQuizEnabled = true
      this.isPdfOrAudioOrVedioEnabled = false
      let obj: any = {}
      sessionStorage.clear()
      obj["type"] = 'assessment'
      obj["name"] = 'assessment'
      obj["description"] = 'assessment'
      sessionStorage.setItem('assessment', 'true')
      //this.initService.updateAssessment(obj)
      this.setContentType(type)
      //this.getassessment()
    } else if (name == 'Quiz') {
      this.isLinkEnabled = false
      this.isShowDownloadBtnEnabled = false
      this.isAssessmentOrQuizEnabled = true
      this.isPdfOrAudioOrVedioEnabled = false
      sessionStorage.clear()
      let obj: any = {}
      obj["type"] = 'assessment'
      obj["name"] = 'quiz'
      obj["description"] = 'quiz'
      sessionStorage.setItem('quiz', 'true')
      //this.initService.updateAssessment(obj)
      this.setContentType(type)
      //this.getassessment()
    }
    //this.addResource()
    this.isLinkPageEnabled = true
    this.isResourceTypeEnabled = false
    this.isOnClickOfResourceTypeEnabled = true
  }

  addModule() {
    this.clearForm()
    this.showAddModuleForm = false
    this.moduleButtonName = 'Create'
    this.moduleCreate('Module Name', 'Module Name', '')
    this.editItem = ''
    // this.moduleNames.push({ name: 'Create Course' })
    // this.moduleName = ''
  }

  async addResModule(modID: string, courseID: string) {
    this.clearForm()
    this.addResourceModule["module"] = true
    this.addResourceModule["modID"] = modID
    this.addResourceModule["courseID"] = courseID
    //this.addIndependentResource()
    this.showAddModuleForm = true
    this.isResourceTypeEnabled = true
    //this.editItem = ''

    await this.editorService.readContentV2(this.courseData.identifier).subscribe(resData => {
      this.updatedVersionKey = resData.versionKey
    })
  }

  async addIndependentResource() {
    this.clearForm()
    this.addResourceModule["module"] = false
    this.addResourceModule["modID"] = this.courseData.identifier
    this.addResourceModule["courseID"] = this.courseData.identifier
    this.showAddModuleForm = true
    this.isResourceTypeEnabled = true

    await this.editorService.readContentV2(this.currentCourseId).subscribe(resData => {
      this.updatedVersionKey = resData.versionKey
    })
    this.editItem = ''
  }

  changeToDefaultImg($event: any) {
    $event.target.src = this._configurationsService.instanceConfig
      ? this._configurationsService.instanceConfig.logos.defaultContent
      : ''
  }

  async editContent(content: any) {
    this.currentCourseId = content.identifier
    if (content.contentType !== 'CourseUnit') {
      await this.editorService.readContentV2(this.currentCourseId).subscribe(resData => {
        this.updatedVersionKey = resData.versionKey
        content = resData
      })
    }

    this.editItem = content.identifier
    this.currentContent = content.identifier
    // if (content.mimeType === "application/json") {
    //   let obj: any = {}
    //   obj["type"] = 'assessment'
    //   obj["name"] = 'assessment'
    //   obj["description"] = 'assessment'
    //   this.initService.createModuleUnit(obj)
    // }
    //this.isResourceTypeEnabled = true
    this.showAddModuleForm = true
    this.isResourceTypeEnabled = false
    this.isOnClickOfResourceTypeEnabled = false
    //this.isOnClickOfResourceTypeEnabled = true
    this.isLinkEnabled = false
    this.isShowDownloadBtnEnabled = false
    this.moduleButtonName = 'Save'
    this.content = content
    this.moduleName = content.name
    this.topicDescription = content.instructions ? content.instructions.replace(/<(.|\n)*?>/g, '') : ''
    this.thumbnail = content.thumbnail
    this.setDuration(content.duration)
    this.isNewTab = content.isIframeSupported == 'Yes' ? true : false
    this.isShowBtn = content.showDownloadBtn == 'Yes' ? true : false
    this.isGating = content.gatingEnabled
    this.duration = content.duration
    this.isPdfOrAudioOrVedioEnabled = false
    if (content.mimeType == 'text/x-url') {
      this.isLinkEnabled = true
      this.isShowDownloadBtnEnabled = false
      this.isPdfOrAudioOrVedioEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.editResourceLinks = content.artifactUrl ? content.artifactUrl : ''
      // tslint:disable-next-line:no-console
      console.log("link content", this.isLinkEnabled, this.editResourceLinks)
      //this.subAction({ type: 'editContent', identifier: this.content.identifier, nodeClicked: false })
    } else if (content.mimeType == 'application/pdf') {
      this.uploadIcon = 'cbp-assets/images/pdf-icon.png'
      this.uploadFileName = content.artifactUrl ? content.artifactUrl.split('_')[4] : ''
      this.uploadText = 'PDF'
      this.isShowDownloadBtnEnabled = true
      this.isLinkEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/pdf-icon.svg'
      this.acceptType = '.pdf'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      //this.subAction({ type: 'editContent', identifier: this.content.identifier, nodeClicked: false })
    } else if (content.mimeType == 'audio/mpeg') {
      this.uploadFileName = content.artifactUrl ? content.artifactUrl.split('_')[4] : ''
      this.uploadIcon = 'cbp-assets/images/video-icon.png'
      this.isShowDownloadBtnEnabled = true
      this.uploadText = 'mp3'
      this.isLinkEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/audio.png'
      this.acceptType = '.mp3'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      //this.subAction({ type: 'editContent', identifier: this.content.identifier, nodeClicked: false })
    } else if (content.mimeType === 'video/mp4') {
      // tslint:disable-next-line:no-console
      console.log("this.uploadFile", content.artifactUrl)
      this.uploadFileName = content.artifactUrl ? content.artifactUrl.split('_')[4] : ''
      this.uploadIcon = 'cbp-assets/images/video-icon.png'
      this.isShowDownloadBtnEnabled = true
      this.uploadText = 'mp4, m4v'
      this.isLinkEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/vedio-img.svg'
      this.acceptType = '.mp4, .m4v'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      //this.subAction({ type: 'editContent', identifier: this.content.identifier, nodeClicked: false })
    } else if (content.mimeType === 'application/vnd.ekstep.html-archive') {
      this.uploadFileName = content.artifactUrl ? content.artifactUrl.split('_')[4] : ''
      this.uploadIcon = 'cbp-assets/images/SCROM-img.svg'
      this.uploadText = '.zip'
      this.isShowDownloadBtnEnabled = false
      this.isLinkEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.isPdfOrAudioOrVedioEnabled = true
      this.resourceImg = 'cbp-assets/images/SCROM-img.svg'
      this.acceptType = '.zip'
      this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
      //this.subAction({ type: 'editContent', identifier: this.content.identifier, nodeClicked: false })
    } else {
      if (content.mimeType == "application/json") {
        const fileData = ((content.artifactUrl || content.downloadUrl) ?
          this.quizResolverSvc.getJSON(this.generateUrl(content.artifactUrl || content.downloadUrl)) : of({} as any))
        fileData.subscribe(jsonResponse => {
          if (jsonResponse && Object.keys(jsonResponse).length > 1) {
            if (jsonResponse) {
              if (jsonResponse.isAssessment) {
                this.initService.isAssessmentOrQuizAction(jsonResponse.isAssessment)
                if (jsonResponse.isAssessment === true) {
                  this.assessmentOrQuizName = "Assessment"
                }
              }
            }
          }
        })
        if (content.artifactUrl) {
          this.isAddOrEdit = true
        }
        //this.initService.updateAssessment(content)
        // this.isLinkEnabled = false
        // this.isAssessmentOrQuizEnabled = true
        // this.isPdfOrAudioOrVedioEnabled = false
        //this.addResourceModule["courseID"]
        // this.setContentType(type)
        // this.getassessment()
      }
    }
  }
  editAssessmentRes(content?: any) {
    console.log("content", content, this.moduleName)
    if (content.name !== this.moduleName && this.moduleName) {
      this.loaderService.changeLoadState(true)
      const requestBody: any = {
        name: this.moduleName,
        versionKey: this.updatedVersionKey,
      }

      const body = {
        request: {
          content: requestBody
        }
      }
      this.editorService.updateNewContentV3(body, this.content.identifier).subscribe(
        async (info: any) => {
          // tslint:disable-next-line:no-console
          console.log('info', info, this.content)
          if (info) {
            this.editItem = ''
            this.initService.updateAssessment(content)
            this.loaderService.changeLoadState(false)
          }
        })
    } else {
      this.initService.updateAssessment(content)
    }


  }

  async addAssessment() {
    this.loaderService.changeLoadState(true)

    this.viewMode = 'assessment'
    this.addResourceModule["viewMode"] = 'assessment'
    let obj: any = {}
    obj["type"] = 'assessment'
    obj["name"] = 'assessment'
    obj["description"] = 'assessment'
    console.log("obj: " + JSON.stringify(obj))
    if (this.resourceLinkForm.value.name) {
      const requestBody: any = {
        name: this.resourceLinkForm.value.name,
        versionKey: this.updatedVersionKey,
      }

      const body = {
        request: {
          content: requestBody
        }
      }
      this.editorService.updateNewContentV3(body, this.currentContent).subscribe(
        async (info: any) => {
          // tslint:disable-next-line:no-console
          console.log('info', info, this.content)
          if (info) {
            this.editItem = ''
            this.initService.updateAssessment(obj)
            this.loaderService.changeLoadState(false)
          }
        })
    } else {
      this.initService.updateAssessment(obj)
    }
  }


  uploadAppIcon(file: File) {
    const formdata = new FormData()
    const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
    if (
      !(
        IMAGE_SUPPORT_TYPES.indexOf(
          `.${fileName
            .toLowerCase()
            .split('.')
            .pop()}`,
        ) > -1
      )
    ) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.INVALID_FORMAT,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      return
    }

    if (file.size > IMAGE_MAX_SIZE) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SIZE_ERROR,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      return
    }

    const dialogRef = this.dialog.open(ImageCropComponent, {
      width: '70%',
      data: {
        isRoundCrop: false,
        imageFile: file,
        width: 265,
        height: 150,
        isThumbnail: true,
        imageFileName: fileName,
      },
    })
    dialogRef.afterClosed().subscribe({
      next: (result: File) => {
        if (result) {
          formdata.append('content', result, fileName)
          this.loader.changeLoad.next(true)

          let randomNumber = ''
          // tslint:disable-next-line: no-increment-decrement
          for (let i = 0; i < 16; i++) {
            randomNumber += Math.floor(Math.random() * 10)
          }

          const requestBody: NSApiRequest.ICreateImageMetaRequestV2 = {
            request: {
              content: {
                code: randomNumber,
                contentType: 'Asset',
                createdBy: this.accessService.userId,
                creator: this.accessService.userName,
                mimeType: 'image/jpeg',
                mediaType: 'image',
                name: fileName,
                lang: ['English'],
                license: 'CC BY 4.0',
                primaryCategory: 'Asset',
              },
            },
          }

          this.http
            .post<NSApiRequest.ICreateMetaRequest>(
              `${AUTHORING_BASE}content/v3/create`,
              requestBody,
            )
            .subscribe(
              (meta: any) => {
                // return data.result.identifier
                this.uploadService
                  .upload(formdata, {
                    contentId: meta.result.identifier,
                    contentType: CONTENT_BASE_STATIC,
                  })

                  .subscribe(
                    data => {
                      if (data && data.name !== 'Error') {
                        this.loader.changeLoad.next(false)
                        //this.moduleForm.controls.appIcon.setValue(data.artifactUrl)
                        //this.courseData.thumbnail = data.artifactUrl
                        let meta: any = {}
                        let requestBody: any
                        // this.editorService.readcontentV3(this.courseData.identifier).subscribe((resData: any) => {
                        //   console.log(resData)
                        // })

                        meta["appIcon"] = data.artifactUrl
                        meta["thumbnail"] = data.content_url
                        this.thumbnail = data.content_url
                        meta["versionKey"] = this.courseData.versionKey
                        this.editorStore.currentContentData = meta

                        this.editorStore.currentContentID = this.content.identifier
                        this.editorStore.setUpdatedMeta(meta, this.content.identifier || data.identifier)
                        // tslint:disable-next-line:no-console

                        console.log(meta)
                        requestBody = {
                          request: {
                            content: meta
                          }
                        }
                        this.editorStore.setUpdatedMeta(meta, this.content.identifier)
                        //this.initService.uploadData('thumbnail')
                        if (this.content.contentType === 'Resource' || this.content.contentType === 'Course') {
                          this.editorService.updateNewContentV3(requestBody, this.content.identifier).subscribe(
                            (info: any) => {
                              // tslint:disable-next-line:no-console
                              console.log('info', info)
                              if (info) {
                                this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
                                  this.courseData = data
                                })
                                //this.update()
                              }
                            })
                        } else {
                          this.update()
                        }
                      }
                    })
              })
        }
      }
    })
  }

  async saveDetails(name: string, topicDescription: string, thumbnail: string, isNewTab: any, isShowBtn: any, content: string) {
    let meta: any = {}
    let requestBody: any
    // this.editorService.readcontentV3(this.courseData.identifier).subscribe((resData: any) => {
    //   console.log(resData)
    // })
    let iframeSupported, showDownloadBtn
    // if (topicDescription != '') {
    if (this.timeToSeconds() == 0 && content !== 'application/json') {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.DURATION_CANT_BE_0,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    } else {
      if (isNewTab)
        iframeSupported = 'Yes'
      else
        iframeSupported = 'No'
      if (isShowBtn)
        showDownloadBtn = 'Yes'
      else
        showDownloadBtn = 'No'
      if (this.acceptType === '.zip') {
        iframeSupported = 'Yes'
      }
      meta["appIcon"] = thumbnail
      meta["thumbnail"] = thumbnail
      meta["versionKey"] = this.updatedVersionKey
      meta["instructions"] = topicDescription
      meta["description"] = topicDescription
      meta["name"] = name ? name.trim() : name
      meta["duration"] = this.timeToSeconds().toString()
      // meta["gatingEnabled"] = isGating
      meta["isIframeSupported"] = iframeSupported
      meta["showDownloadBtn"] = showDownloadBtn


      var res = this.editResourceLinks.match(/^(?:https?:\/\/)(?:www\.)(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/)
      // var res = this.editResourceLinks.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
      if (res !== null && this.content.mimeType === 'text/x-url') {
        meta["artifactUrl"] = this.editResourceLinks
      }
      if (res == null && this.content.mimeType === 'text/x-url') {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.LINK_IS_INVALID,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      } else {
        if (name.trim() === '') {
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: (this.content.contentType === 'Resource' ? Notify.INVALID_RESOURCE_NAME : Notify.INVALID_MODULE_NAME),
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        } else {
          this.editorStore.currentContentData = meta
          this.editorStore.currentContentID = this.content.identifier
          requestBody = {
            request: {
              content: meta
            }
          }

          this.contentService.setUpdatedMeta(meta, this.content.identifier)
          if (this.content.contentType === 'Resource') {
            this.editorService.updateNewContentV3(requestBody, this.content.identifier).subscribe(
              async (info: any) => {
                // tslint:disable-next-line:no-console
                console.log('info', info)
                if (info) {
                  let result = await this.update()
                  // tslint:disable-next-line:no-console
                  console.log(result)
                  this.clearForm()
                  this.editItem = ''
                }
              })
          } else {
            let result = await this.update()
            // tslint:disable-next-line:no-console
            console.log(result)
            this.clearForm()
            this.editItem = ''
          }
        }
      }
    }
  }

  generateUrl(oldUrl: any) {
    //const chunk = oldUrl.split('/')
    //const newChunk = environment.azureHost.split('/')
    // @ts-ignore: Unreachable code error
    this.bucket = window["env"]["azureBucket"]
    if (oldUrl.includes(this.bucket)) {
      return oldUrl
    }

  }
  jsonVerify(s: string) { try { JSON.parse(s); return true } catch (e) { return false } }

  routerValuesCall() {
    this.editorStore.changeActiveCont.subscribe(data => {
      this.currentContent = data
      this.currentCourseId = data
      if (this.editorStore.getUpdatedMeta(data).contentType !== 'Resource') {
        this.viewMode = 'meta'
      }
    })

    if (this.activateRoute.parent && this.activateRoute.parent.parent) {
      this.activateRoute.parent.parent.data.subscribe(data => {

        this.courseName = data.contents[0].content.name

        const contentDataMap = new Map<string, NSContent.IContentMeta>()
        data.contents.map((v: { content: NSContent.IContentMeta; data: any }) => {
          this.storeService.parentNode.push(v.content.identifier)
          this.resolverService.buildTreeAndMap(
            v.content,
            contentDataMap,
            this.storeService.flatNodeMap,
            this.storeService.uniqueIdMap,
            this.storeService.lexIdMap,
          )
        })
        contentDataMap.forEach(content => this.editorStore.setOriginalMeta(content))
        const currentNode = (this.storeService.lexIdMap.get(this.currentContent) as number[])[0]
        this.currentParentId = this.currentContent
        this.storeService.treeStructureChange.next(
          this.storeService.flatNodeMap.get(currentNode) as IContentNode,
        )
        this.storeService.currentParentNode = currentNode
        this.storeService.currentSelectedNode = currentNode
        let newCreatedNode = 0
        const newCreatedLexid = this.editorService.newCreatedLexid
        if (newCreatedLexid) {
          newCreatedNode = (this.storeService.lexIdMap.get(newCreatedLexid) as number[])[0]
          this.storeService.selectedNodeChange.next(newCreatedNode)
        }
        if (data.contents[0] && data.contents[0].content && data.contents[0].content.children[0] &&
          data.contents[0].content.children[0].identifier) {
          this.storeService.selectedNodeChange.next(data.contents[0].content.children[0].identifier)
        }
      })

      this.activateRoute.parent.url.subscribe(data => {
        const urlParam = data[0].path
        if (urlParam === 'collection') {
          this.headerService.showCreatorHeader(this.courseName)
        }

      })
    }
  }
  click(action: any, type?: string) {
    this.actions.emit({ action, type })
  }
  async save() {
    if (this.resourseSelected !== '') {
      this.update()
    }
    const updatedContent = this.editorStore.upDatedContent || {}

    if (
      (Object.keys(updatedContent).length &&
        (Object.values(updatedContent).length && JSON.stringify(Object.values(updatedContent)[0]) !== '{}')) ||
      Object.keys(this.storeService.changedHierarchy).length
    ) {
      this.loaderService.changeLoad.next(true)
      if (this.editorStore.getUpdatedMeta(this.currentCourseId).contentType !== "CourseUnit") {
        this.versionID = await this.editorService.readcontentV3(this.currentCourseId).toPromise()
        this.versionKey = this.editorStore.getUpdatedMeta(this.currentCourseId)
      }
      this.triggerSave().subscribe(
        () => {
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
        (error: any) => {
          if (error.status === 409) {
            const errorMap = new Map<string, NSContent.IContentMeta>()
            Object.keys(this.editorStore.originalContent).forEach(v =>
              errorMap.set(v, this.editorStore.originalContent[v]),
            )
            this.isError = true
            const dialog = this.dialog.open(ErrorParserComponent, {
              width: '80vw',
              height: '90vh',
              data: {
                errorFromBackendData: error.error,
                dataMapping: errorMap,
              },
            })
            dialog.afterClosed().subscribe(v => {
              if (v) {
                if (typeof v === 'string') {
                  this.storeService.selectedNodeChange.next(
                    (this.storeService.lexIdMap.get(v) as number[])[0],
                  )
                  this.editorStore.changeActiveCont.next(v)
                } else {
                  this.storeService.selectedNodeChange.next(v)
                  this.editorStore.changeActiveCont.next(
                    this.storeService.uniqueIdMap.get(v) as string,
                  )
                }
              }
              this.isError = false
            })
          }
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        })
    }
  }
  async update() {
    this.resourseSelected = ''
    this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
      this.courseData = data
    })
    const hierarchyData = this.storeService.getNewTreeHierarchy(this.courseData)

    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.editorStore.getNodeModifyData(),
          hierarchy: hierarchyData,
        },
      },
    }
    this.loaderService.changeLoad.next(true)
    await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
      this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
        this.courseData = data
        let resourceDurat: any = []
        let sumDuration: any
        if (data.children.length > 0) {
          data.children.forEach((element: any) => {
            if (element.duration) {
              resourceDurat.push(parseInt(element.duration))
            }
            if (element.children && element.children.length > 0) {
              element.children.forEach((ele: any) => {
                if (ele.duration) {
                  resourceDurat.push(parseInt(ele.duration))
                }
              })
            }
          })
          // tslint:disable-next-line:no-console
          console.log(resourceDurat)
          if (resourceDurat.length > 0) {
            sumDuration = resourceDurat.reduce((a: any, b: any) => a + b)
          }

        }
        let requestBody: any
        // tslint:disable-next-line:no-console
        console.log(sumDuration)
        if (sumDuration) {
          requestBody = {
            request: {
              content: {
                duration: isNumber(sumDuration) ?
                  sumDuration.toString() : sumDuration,
                versionKey: data.versionKey
              },
            }
          }
          this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.editorStore.parentContent).subscribe((response: any) => {
            // tslint:disable-next-line:no-console
            console.log('duration', response.duration)
            this.setCourseDuration(isNumber(sumDuration) ?
              sumDuration.toString() : sumDuration)
          })
        }

        if (this.courseData && this.courseData.children.length >= 2) {
          this.showSettingsPage = true
        } else {
          this.showSettingsPage = false
        }
        this.getChildrenCount()
        if (this.courseData && this.courseData.competency == true) {
          this.isSelfAssessment = true
        } else {
          this.isSelfAssessment = false
        }
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS
          },
          duration: NOTIFICATION_TIME * 500,

        })
        this.editorStore.resetOriginalMetaWithHierarchy(data)
        // tslint:disable-next-line: align
      })
    })
  }

  triggerSave() {
    const nodesModified: any = {}
    let isRootPresent = false
    Object.keys(this.editorStore.upDatedContent).forEach(v => {
      if (!isRootPresent) {
        isRootPresent = this.storeService.parentNode.includes(v)
      }
      nodesModified[v] = {
        isNew: false,
        root: this.storeService.parentNode.includes(v),
        metadata: this.editorStore.upDatedContent[v],
      }
    })
    if (!isRootPresent) {
      nodesModified[this.currentParentId] = {
        isNew: false,
        root: true,
        metadata: {},
      }
    }
    if (Object.keys(this.editorStore.upDatedContent).length > 0 && nodesModified[this.currentCourseId]) {
      let tempUpdateContent = this.editorStore.upDatedContent[this.currentCourseId]
      let requestBody: NSApiRequest.IContentUpdateV2

      if (tempUpdateContent.category === 'CourseUnit' || tempUpdateContent.category === 'Collection') {
        tempUpdateContent.visibility = 'Parent'
      } else {
        this.versionKey = this.contentService.getUpdatedMeta(this.currentCourseId)
        tempUpdateContent.versionKey = this.versionKey.versionKey == undefined ? this.versionID.versionKey : this.versionKey.versionKey
        // tempUpdateContent.versionKey = this.versionID === undefined ? this.versionKey.versionKey : this.versionID.versionKey
      }

      requestBody = {
        request: {
          content: tempUpdateContent,
        }
      }
      requestBody.request.content = this.editorStore.cleanProperties(requestBody.request.content)
      if (requestBody.request.content.duration === 0 || requestBody.request.content.duration) {
        // tslint:disable-next-line:max-line-length
        requestBody.request.content.duration =
          isNumber(requestBody.request.content.duration) ?
            requestBody.request.content.duration.toString() : requestBody.request.content.duration
      }

      if (requestBody.request.content.category) {
        delete requestBody.request.content.category
      }

      if (requestBody.request.content.trackContacts && requestBody.request.content.trackContacts.length > 0) {
        requestBody.request.content.reviewer = JSON.stringify(requestBody.request.content.trackContacts)
        requestBody.request.content.reviewerIDs = []
        const tempTrackRecords: string[] = []
        requestBody.request.content.trackContacts.forEach(element => {
          tempTrackRecords.push(element.id)
        })
        requestBody.request.content.reviewerIDs = tempTrackRecords
        delete requestBody.request.content.trackContacts
      }

      if (requestBody.request.content.trackContacts && requestBody.request.content.trackContacts.length > 0) {
        requestBody.request.content.reviewer = JSON.stringify(requestBody.request.content.trackContacts)
        requestBody.request.content.reviewerIDs = []
        const tempTrackRecords: string[] = []
        requestBody.request.content.trackContacts.forEach(element => {
          tempTrackRecords.push(element.id)
        })
        requestBody.request.content.reviewerIDs = tempTrackRecords
        delete requestBody.request.content.trackContacts
      }

      if (requestBody.request.content.publisherDetails && requestBody.request.content.publisherDetails.length > 0) {
        requestBody.request.content.publisherIDs = []
        const tempPublisherRecords: string[] = []
        requestBody.request.content.publisherDetails.forEach(element => {
          tempPublisherRecords.push(element.id)
        })
        requestBody.request.content.publisherIDs = tempPublisherRecords
      }
      if (requestBody.request.content.creatorContacts && requestBody.request.content.creatorContacts.length > 0) {
        requestBody.request.content.creatorIDs = []
        const tempCreatorsRecords: string[] = []
        requestBody.request.content.creatorContacts.forEach(element => {
          tempCreatorsRecords.push(element.id)
        })
        requestBody.request.content.creatorIDs = tempCreatorsRecords
      }
      if (requestBody.request.content.catalogPaths && requestBody.request.content.catalogPaths.length > 0) {
        requestBody.request.content.topics = []
        const tempTopicData: string[] = []
        requestBody.request.content.catalogPaths.forEach((element: any) => {
          tempTopicData.push(element.identifier)
        })
        requestBody.request.content.topics = tempTopicData
      }

      this.editorStore.currentContentData = requestBody.request.content
      this.editorStore.currentContentID = this.currentCourseId

      if (tempUpdateContent.category === 'Resource' || tempUpdateContent.category === undefined) {
        return this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.currentCourseId).pipe(
          tap(() => {
            this.storeService.changedHierarchy = {}
            this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
              this.courseData = data
              let resourceDurat: any = []
              let sumDuration: any
              if (data.children.length > 0) {
                data.forEach((element: any) => {
                  // tslint:disable-next-line:no-console
                  console.log(element)
                  resourceDurat.push(parseInt(element.duration))
                })
                // tslint:disable-next-line:no-console
                console.log(resourceDurat)
                if (resourceDurat.length > 0) {
                  sumDuration = resourceDurat.reduce((a: any, b: any) => a + b)
                }
              }
              // tslint:disable-next-line:no-console
              console.log(sumDuration)
            })
            Object.keys(this.editorStore.upDatedContent).forEach(id => {
              this.editorStore.resetOriginalMeta(this.editorStore.upDatedContent[id], id)
              // this.editorService.readContentV2(id).subscribe(resData => {
              //   this.contentService.resetVersionKey(resData.versionKey, resData.identifier)
              // })
            })
            this.editorStore.upDatedContent = {}
          })
        )
      } else {
        if (tempUpdateContent.category === 'Course') {
          return this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.currentCourseId).pipe(
            tap(() => {
              this.storeService.changedHierarchy = {}
              this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
                this.courseData = data
              })
              Object.keys(this.editorStore.upDatedContent).forEach(id => {
                this.editorStore.resetOriginalMeta(this.editorStore.upDatedContent[id], id)
                // this.editorService.readContentV2(id).subscribe(resData => {
                //   this.contentService.resetVersionKey(resData.versionKey, resData.identifier)
                // })
              })
              this.editorStore.upDatedContent = {}
            })
          )
        }
      }
    }
    //console.log('updateContentV4  COURSE COLL')
    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.editorStore.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }

    return this.editorService.updateContentV4(requestBodyV2).pipe(
      tap(() => {

        this.storeService.changedHierarchy = {}
        Object.keys(this.editorStore.upDatedContent).forEach(async id => {
          this.editorStore.resetOriginalMeta(this.editorStore.upDatedContent[id], id)
        })
        this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
          this.courseData = data
          this.editorStore.resetOriginalMetaWithHierarchy(data)
        })
        this.editorStore.upDatedContent = {}
      }),
    )

  }

  subAction(event: { type: string; identifier: string, nodeClicked?: boolean }) {
    this.editorStore.changeActiveCont.next(event.identifier)
    switch (event.type) {
      case 'editContent':
        if (event.nodeClicked === false) {
        }
        const content = this.editorStore.getUpdatedMeta(event.identifier)
        // tslint:disable-next-line:no-console
        console.log(content)
        if (content.contentType === 'Resource') {
          this.editItem = content.identifier

          this.resourceLinkForm.controls.name.setValue(content.name)
        }
        const isCreator = (this._configurationsService.userProfile
          && this._configurationsService.userProfile.userId === content.createdBy)
          ? true : false
        this.checkCreator = isCreator
        // const isCreator = (this.configSvc.userProfile
        //   && this.configSvc.userProfile.userId === content.createdBy)
        //   ? true : false
        // this.checkCreator = isCreator
        if (['application/pdf', 'application/x-mpegURL', 'application/vnd.ekstep.html-archive', 'audio/mpeg', 'video/mp4'].includes(content.mimeType)) {
          this.viewMode = 'upload'
          // } else if (['video/x-youtube', 'text/x-url', 'application/html'].includes(content.mimeType) && content.fileType === 'link') {
        } else if (['video/x-youtube', 'text/x-url', 'application/html'].includes(content.mimeType) && content.fileType === '') {
          this.viewMode = 'curate'
        } else if (content.mimeType === 'application/html') {
          this.viewMode = 'upload'
        } else if (content.mimeType === 'application/quiz' || content.mimeType === 'application/json') {
          // this.viewMode = 'assessment'
          // this.addResourceModule["viewMode"] = 'assessment'
          // let obj: any = {}
          // obj["type"] = 'assessment'
          // obj["name"] = 'assessment'
          // obj["description"] = 'assessment'
          // this.initService.updateAssessment(obj)
        } else if (content.mimeType === 'application/web-module') {
          this.viewMode = 'webmodule'
        } else {
          this.viewMode = 'meta'
        }
        break
    }
  }

  async setContentType(type: any, filetype?: string) {
    this.resourseSelected = type
    if (filetype) {
      this.storeService.uploadFileType.next(filetype)
    }
    let couseCreated = type
    const asSibling = false
    const node = {
      id: this.storeService.currentParentNode,
      identifier: this.storeService.parentNode[0],
      editable: true,
      category: 'Course',
      childLoaded: true,
      expandable: true,
      level: 1,
    }

    const newData = {
      topicDescription: '',
      topicName: type.type === 'collection' ? 'Add Module' : 'Resource'
    }
    if (type.type === 'collection') {
      this.storeService.parentData = this.courseData
    }

    const parentNode = node
    this.loaderService.changeLoad.next(true)
    const isDone = await this.storeService.createChildOrSibling(
      couseCreated,
      parentNode,
      asSibling ? node.id : undefined,
      'below',
      newData,
      couseCreated === 'web' ? 'link' : '',
    )
    // this.snackBar.openFromComponent(NotificationComponent, {
    //   data: {
    //     type: isDone ? Notify.SUCCESS : Notify.FAIL,
    //   },
    //   duration: NOTIFICATION_TIME * 1000,

    // })
    if (isDone) {
      const newCreatedLexid = this.editorService.newCreatedLexid
      if (this.addResourceModule["module"] === true) {
        let request: any
        request = {
          request: {
            rootId: this.addResourceModule["courseID"],
            unitId: this.addResourceModule["modID"],
            children: [this.editorService.resourseID],
          },
        }
        //if (this.parentNode[0] !== dropNode.identifier) {
        const result = await this.editorService.resourceToModule(request).toPromise()
        // tslint:disable-next-line:no-console
        console.log(result)
        await this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
          this.courseData = await data

          const hierarchyData = this.storeService.getNewTreeHierarchy(this.courseData)

          hierarchyData[this.editorService.resourseID] = {
            root: false,
            name: this.resourseSelected !== 'assessment' ? 'Resource 1' : 'Assessment',
            children: [],
          }

          Object.keys(hierarchyData).forEach((ele: any) => {
            if (ele === this.addResourceModule["modID"]) {
              hierarchyData[ele].children.push(this.editorService.resourseID)
            }
          })

          const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
            request: {
              data: {
                nodesModified: this.editorStore.getNodeModifyData(),
                hierarchy: hierarchyData,
              },
            },
          }
          await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
            this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
              this.courseData = await data
              this.getChildrenCount()
            })
          })
        })
        //}
      } else {
        //const hierarchyData = this.storeService.getTreeHierarchy()
        //this.courseData = []
        await this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {

          this.courseData = await data

          const hierarchyData = this.storeService.getNewTreeHierarchy(this.courseData)

          Object.keys(hierarchyData).forEach((ele: any) => {
            if (ele === this.addResourceModule["courseID"]) {
              hierarchyData[this.editorService.resourseID] = {
                root: false,
                name: this.resourseSelected !== 'assessment' ? 'Resource 1' : 'Assessment',
                children: [],
              }
              hierarchyData[ele].children.push(this.editorService.resourseID)
            }
          })

          const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
            request: {
              data: {
                nodesModified: this.editorStore.getNodeModifyData(),
                hierarchy: hierarchyData,
              },
            },
          }
          await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
            this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
              this.courseData = await data
              this.getChildrenCount()
              this.loaderService.changeLoad.next(false)
              this.editorStore.setOriginalMeta(data)
            })
          })
        })

      }
      if (newCreatedLexid) {
        const newCreatedNode = (this.storeService.lexIdMap.get(newCreatedLexid) as number[])[0]
        this.storeService.currentSelectedNode = newCreatedNode
        this.storeService.selectedNodeChange.next(newCreatedNode)
      }
      this.currentContent = this.editorService.newCreatedLexid
      // update the id
      this.editorStore.currentContent = newCreatedLexid
    }
    this.loaderService.changeLoad.next(false)
    this.subAction({ type: 'editContent', identifier: this.editorService.newCreatedLexid, nodeClicked: false })
    //this.save()
  }
  copyToClipboard(module: any) {
    // tslint:disable-next-line:no-console
    navigator.clipboard.writeText(module).then().catch(e => console.log(e))
  }

  uploadResourceAppIcon(file: File) {
    const formdata = new FormData()
    const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')

    if (
      !(
        IMAGE_SUPPORT_TYPES.indexOf(
          `.${fileName
            .toLowerCase()
            .split('.')
            .pop()}`,
        ) > -1
      )
    ) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.INVALID_FORMAT,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      return
    }

    if (file.size > IMAGE_MAX_SIZE) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SIZE_ERROR,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      return
    }

    const dialogRef = this.dialog.open(ImageCropComponent, {
      width: '70%',
      data: {
        isRoundCrop: false,
        imageFile: file,
        width: 265,
        height: 150,
        isThumbnail: true,
        imageFileName: fileName,
      },
    })

    dialogRef.afterClosed().subscribe({
      next: (result: File) => {
        if (result) {
          formdata.append('content', result, fileName)
          this.loader.changeLoad.next(true)

          let randomNumber = ''
          // tslint:disable-next-line: no-increment-decrement
          for (let i = 0; i < 16; i++) {
            randomNumber += Math.floor(Math.random() * 10)
          }

          const requestBody: NSApiRequest.ICreateImageMetaRequestV2 = {
            request: {
              content: {
                code: randomNumber,
                contentType: 'Asset',
                createdBy: this.accessService.userId,
                creator: this.accessService.userName,
                mimeType: 'image/jpeg',
                mediaType: 'image',
                name: fileName,
                lang: ['English'],
                license: 'CC BY 4.0',
                primaryCategory: 'Asset',
              },
            },
          }

          this.http
            .post<NSApiRequest.ICreateMetaRequest>(
              `${AUTHORING_BASE}content/v3/create`,
              requestBody,
            )
            .subscribe(
              (meta: any) => {
                this.uploadService
                  .upload(formdata, {
                    contentId: meta.result.identifier,
                    contentType: CONTENT_BASE_STATIC,
                  })

                  .subscribe(
                    data => {
                      if (data && data.name !== 'Error') {
                        this.loader.changeLoad.next(false)
                        this.canUpdate = false
                        this.resourceLinkForm.controls.appIcon.setValue(this.generateUrl(data.artifactUrl))
                        this.resourceLinkForm.controls.thumbnail.setValue(this.generateUrl(data.artifactUrl))
                        this.resourcePdfForm.controls.appIcon.setValue(this.generateUrl(data.artifactUrl))
                        this.resourcePdfForm.controls.thumbnail.setValue(this.generateUrl(data.artifactUrl))
                        this.canUpdate = true
                        // this.data.emit('save')
                        this.updateStoreData()

                        this.initService.uploadData('thumbnail')
                        // this.contentForm.controls.posterImage.setValue(data.artifactURL)
                        this.snackBar.openFromComponent(NotificationComponent, {
                          data: {
                            type: Notify.UPLOAD_SUCCESS,
                          },
                          duration: NOTIFICATION_TIME * 2000,
                        })
                      }
                      else {
                        this.loader.changeLoad.next(false)
                        this.snackBar.open(data.message, undefined, { duration: 2000 })
                      }
                    },
                    () => {
                      this.loader.changeLoad.next(false)
                      this.snackBar.openFromComponent(NotificationComponent, {
                        data: {
                          type: Notify.UPLOAD_FAIL,
                        },
                        duration: NOTIFICATION_TIME * 1000,
                      })
                    },
                  )
              })
        }
      }
    })
  }

  updateStoreData() {
    try {
      const originalMeta = this.contentService.getOriginalMeta(this.editorService.newCreatedLexid)
      if (originalMeta) {
        const currentMeta: NSContent.IContentMeta = JSON.parse(JSON.stringify(this.resourceLinkForm.value))
        const exemptArray = ['application/quiz', 'application/x-mpegURL', 'audio/mpeg', 'video/mp4',
          'application/vnd.ekstep.html-archive', 'application/json']
        if (exemptArray.includes(originalMeta.mimeType)) {
          currentMeta.artifactUrl = originalMeta.artifactUrl
          currentMeta.mimeType = originalMeta.mimeType
        }
        if (!currentMeta.duration && originalMeta.duration) {
          currentMeta.duration = originalMeta.duration
        }
        if (!currentMeta.appIcon && originalMeta.appIcon) {
          currentMeta.appIcon = originalMeta.appIcon
          currentMeta.thumbnail = originalMeta.thumbnail
        }
        // currentMeta.resourceType=currentMeta.categoryType;

        if (currentMeta.status === 'Draft') {
          const parentData = this.contentService.parentUpdatedMeta()

          if (parentData && currentMeta.identifier !== parentData.identifier) {
            //   currentMeta.thumbnail = parentData.thumbnail !== '' ? parentData.thumbnail : currentMeta.thumbnail
            // currentMeta.appIcon = parentData.appIcon !== '' ? parentData.appIcon : currentMeta.appIcon
            //  if (!currentMeta.posterImage) {
            //   currentMeta.posterImage = parentData.posterImage !== '' ? parentData.posterImage : currentMeta.posterImage
            //  }
            currentMeta.cneName = ''
            if (!currentMeta.subTitle) {
              currentMeta.subTitle = parentData.subTitle !== '' ? parentData.subTitle : currentMeta.subTitle
              currentMeta.purpose = parentData.subTitle !== '' ? parentData.subTitle : currentMeta.subTitle
            }
            if (!currentMeta.body) {
              currentMeta.body = parentData.body !== '' ? parentData.body : currentMeta.body
            }

            if (!currentMeta.instructions) {
              currentMeta.instructions = parentData.instructions !== '' ? parentData.instructions : currentMeta.instructions
            }
            if (!currentMeta.description) {
              currentMeta.description = parentData.description !== '' ? parentData.description : currentMeta.description
            }

            if (!currentMeta.categoryType) {
              currentMeta.categoryType = parentData.categoryType !== '' ? parentData.categoryType : currentMeta.categoryType
            }
            if (!currentMeta.resourceType) {
              currentMeta.resourceType = parentData.resourceType !== '' ? parentData.resourceType : currentMeta.resourceType
            }

            if (!currentMeta.sourceName) {
              currentMeta.sourceName = parentData.sourceName !== '' ? parentData.sourceName : currentMeta.sourceName
            }
            if (!currentMeta.lang) {
              currentMeta.lang = parentData.lang !== '' ? parentData.lang : currentMeta.lang


            }
          }
        }
        // if(currentMeta.categoryType && !currentMeta.resourceType){
        //   currentMeta.resourceType = currentMeta.categoryType
        // }

        // if(currentMeta.resourceType && !currentMeta.categoryType){
        //   currentMeta.categoryType = currentMeta.resourceType
        // }

        const meta = <any>{}

        Object.keys(currentMeta).map(v => {
          if (
            v !== 'versionKey' && v !== 'visibility' &&
            JSON.stringify(currentMeta[v as keyof NSContent.IContentMeta]) !==
            JSON.stringify(originalMeta[v as keyof NSContent.IContentMeta]) && v !== 'jobProfile'
          ) {
            if (
              currentMeta[v as keyof NSContent.IContentMeta] ||
              // (this.authInitService.authConfig[v as keyof IFormMeta].type === 'boolean' &&
              currentMeta[v as keyof NSContent.IContentMeta] === false) {
              if (v !== 'isIframeSupported') {
                meta[v as keyof NSContent.IContentMeta] = currentMeta[v as keyof NSContent.IContentMeta]
              }
            } else {
              if (this.initService.authConfig[v as keyof IFormMeta] && this.initService.authConfig[v as keyof IFormMeta].defaultValue) {
                if (v !== 'isIframeSupported') {
                  meta[v as keyof NSContent.IContentMeta] = JSON.parse(
                    JSON.stringify(
                      this.initService.authConfig[v as keyof IFormMeta].defaultValue[
                        originalMeta.contentType
                        // tslint:disable-next-line: ter-computed-property-spacing
                      ][0].value,
                    ),
                  )
                }

              }

            }
          } else if (v === 'versionKey') {
            meta[v as keyof NSContent.IContentMeta] = originalMeta[v as keyof NSContent.IContentMeta]
          } else if (v === 'visibility') {
            // if (currentMeta['contentType'] === 'CourseUnit' && currentMeta[v] !== 'Parent') {
            //   // console.log('%c COURSE UNIT ', 'color: #f5ec3d', meta[v],  currentMeta[v])
            //   meta[v as keyof NSContent.IContentMeta] = 'Default'
            // }
          }
        })
        this.contentService.setUpdatedMeta(meta, this.editorService.newCreatedLexid)
      }
    } catch (ex) {
      this.snackBar.open('Please Save Parent first and refresh page.')
      if (ex) {
      }
    }
  }
  closeDialog() {
    this.dialog.closeAll()
  }
  /*PDF/audio/vedio functionality start*/
  uploadPdf(file: File) {
    this.fileUploadCondition = {
      fileName: false,
      eval: false,
      externalReference: false,
      iframe: false,
      isSubmitPressed: false,
      preview: false,
      url: '',
    }
    let type
    if (file.type == 'video/mp4')
      type = '.mp4'
    else if (file.type == 'video/m4v')
      type = '.m4v'
    else
      type = this.acceptType

    const fileName = file.name.replace(/[^A-Za-z0-9_.]/g, '')
    if (fileName.toLowerCase().endsWith(type)) {
      if (
        !fileName.toLowerCase().endsWith('.pdf') &&
        !fileName.toLowerCase().endsWith('.zip') &&
        !fileName.toLowerCase().endsWith('.mp4') &&
        !fileName.toLowerCase().endsWith('.m4v') &&
        !fileName.toLowerCase().endsWith('.mp3')
      ) {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.INVALID_FORMAT,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      } else if (file.size > VIDEO_MAX_SIZE) {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SIZE_ERROR,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      } else {
        if (fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.m4v')) {
          const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: this.isMobile ? '90vw' : '600px',
            height: 'auto',
            data: 'transcodeMessage',
          })
          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              this.uploadFileName = fileName
              this.assignFileValues(file, fileName)
              this.triggerUpload()
            }
          })
        } else if (fileName.toLowerCase().endsWith('.zip')) {
          const dialogRef = this.dialog.open(this.guideline, {
            width: this.isMobile ? '90vw' : '600px',
            height: 'auto',
          })
          dialogRef.afterClosed().subscribe(_ => {
            if (
              this.fileUploadCondition.fileName &&
              this.fileUploadCondition.iframe &&
              this.fileUploadCondition.eval &&
              this.fileUploadCondition.preview &&
              this.fileUploadCondition.externalReference && this.fileUploadCondition.isSubmitPressed
            ) {

              this.assignFileValues(file, fileName)
              this.fileUploaded = file
              // this.triggerUpload()
            }
          })
        } else {
          this.uploadFileName = fileName
          this.fileUploaded = file
          this.assignFileValues(file, fileName)
          this.triggerUpload()
        }
      }
    }
    else {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.INVALID_FORMAT,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    }
  }

  assignFileValues(file: File, fileName: string) {
    const currentContentData = this.contentService.originalContent[this.currentContent]
    this.contentService.updateListOfFiles(this.currentContent, file)
    this.contentService.updateListOfUpdatedIPR(this.currentContent, this.iprAccepted)

    this.file = file
    this.mimeType = fileName.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : (fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.m4v'))
        ? 'video/mp4'
        : fileName.toLowerCase().endsWith('.zip')
          ? 'application/vnd.ekstep.html-archive'
          : 'audio/mpeg'
    // tslint:disable-next-line:no-console
    console.log(this.currentContent)
    // tslint:disable-next-line:no-console
    console.log(currentContentData)
    if (
      (currentContentData.status === 'Live' || currentContentData.prevStatus === 'Live')
      && this.mimeType !== currentContentData.mimeType
    ) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.CANNOT_CHANGE_MIME_TYPE,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      this.fileUploadForm.controls.artifactUrl.setValue(currentContentData.artifactUrl)
      // tslint:disable-next-line:no-console
      console.log("this.fileUploadForm.controls.artifactUrl", this.fileUploadForm.controls.artifactUrl)
      this.mimeType = currentContentData.mimeType
      this.iprChecked()
    } else {
      this.file = file
      if (this.mimeType === 'video/mp4' || this.mimeType === 'audio/mpeg') {
        this.getDuration()
      } else if (this.mimeType === 'application/vnd.ekstep.html-archive') {
        this.extractFile()
      }
    }

    // tslint:disable-next-line:no-console
    console.log("this.uploadFileName", this.mimeType)
    if (this.mimeType == 'application/pdf') {
      this.uploadIcon = 'cbp-assets/images/pdf-icon.png'
    } else if (this.mimeType == 'application/vnd.ekstep.html-archive') {
      this.uploadIcon = 'cbp-assets/images/SCROM-img.svg'
    } else {
      this.uploadIcon = 'cbp-assets/images/video-icon.png'
    }


  }

  iprChecked() {
    this.iprAccepted = !this.iprAccepted
    this.contentService.updateListOfUpdatedIPR(this.currentContent, this.iprAccepted)
  }

  extractFile() {
    this.errorFileList = []
    this.fileList = []
    zip.useWebWorkers = false
    zip.createReader(new zip.BlobReader(this.file as File), (reader: zip.ZipReader) => {
      reader.getEntries((entry: zip.Entry[]) => {
        entry.forEach(element => {
          // if (element.filename.match(/[^A-Za-z0-9_.\-\/]/g)) {
          //   this.errorFileList.push(element.filename)
          // } else if (!element.directory) {
          this.fileList.push(element.filename)
          // }
        })
        this.processAndShowResult()
      })
    })
  }

  processAndShowResult() {
    if (this.errorFileList.length) {
      this.file = null
      this.dialog.open(this.errorFile, {
        width: this.isMobile ? '90vw' : '600px',
        height: 'auto',
      })
      setTimeout(() => {
        const error = document.getElementById('errorFiles')
        if (error) {
          for (let i = 0; i < error.children.length; i += 1) {
            error.children[i].innerHTML = error.children[i].innerHTML.replace(
              /[^A-Za-z0-9./]/g,
              match => {
                return `<i style=background-color:red;font-weight:bold>${match}</i>`
              },
            )
          }
        }
      })
    } else {
      const dialogRef = this.dialog.open(this.selectFile, {
        width: this.isMobile ? '90vw' : '600px',
        height: 'auto',
      })
      dialogRef.afterClosed().subscribe(_ => {
        if (
          this.fileUploadCondition.fileName &&
          this.fileUploadCondition.iframe &&
          this.fileUploadCondition.eval &&
          this.fileUploadCondition.preview &&
          this.fileUploadCondition.externalReference &&
          this.fileUploadCondition.url && this.selectedEntryFile
        ) {
          const fileName = this.fileUploaded.name.replace(/[^A-Za-z0-9_.]/g, '')
          this.uploadFileName = fileName
          // this.assignFileValues(this.fileUploaded, fileName)
          this.triggerUpload()
        }
      })
    }
  }
  selectEntryPoint(file: any) {
    this.entryPoint = '/' + `${file}`
  }
  getDuration() {
    const content = document.createElement(
      this.mimeType === 'video/mp4' ? 'video' : 'audio',
    )
    content.preload = 'metadata'
    content.onloadedmetadata = () => {
      window.URL.revokeObjectURL(content.src)
      this.duration = JSON.stringify(Math.round(content.duration))
    }
    content.src = URL.createObjectURL(this.file)
  }

  async resourcePdfSave() {
    if (this.resourcePdfForm.status == 'INVALID' || this.uploadFileName == '') {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.REQUIRED_FIELD,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    } else {
      if (this.resourcePdfForm.value.duration == 0) {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.DURATION_CANT_BE_0,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      } else if (this.resourcePdfForm.value.name.trim() === '') {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.INVALID_RESOURCE_NAME,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      } else {
        this.resourcePdfForm.controls.duration.setValue(this.timeToSeconds())
        let iframeSupported, showDownloadBtn
        if (this.resourcePdfForm.value.isIframeSupported)
          iframeSupported = 'Yes'
        else
          iframeSupported = 'No'
        if (this.resourcePdfForm.value.showDownloadBtn)
          showDownloadBtn = 'Yes'
        else
          showDownloadBtn = 'No'

        if (this.acceptType === '.zip') {
          iframeSupported = 'Yes'
        }

        //this.triggerUpload()
        this.resourcePdfForm.controls.duration.setValue(this.timeToSeconds())
        this.duration = this.resourcePdfForm.value.duration
        // this.versionKey = this.contentService.getUpdatedMeta(this.currentCourseId)
        const rBody: any = {
          name: this.resourcePdfForm.value.name,
          instructions: this.resourcePdfForm.value.instructions,
          description: this.resourcePdfForm.value.instructions,
          appIcon: this.resourcePdfForm.value.appIcon,
          thumbnail: this.resourcePdfForm.value.thumbnail,
          isIframeSupported: iframeSupported,
          showDownloadBtn,
          gatingEnabled: this.resourcePdfForm.value.isgatingEnabled,
          duration: this.resourcePdfForm.value.duration,
          versionKey: this.updatedVersionKey,
        }
        await this.editorStore.setUpdatedMeta(rBody, this.currentContent)
        await this.update()
        await this.save()
        // this.loaderService.changeLoad.next(false)
        this.clearForm()
        this.editItem = ''
      }
    }
  }

  clearForm() {
    this.showAddModuleForm = false
    this.resourcePdfForm.setValue({
      name: '',
      instructions: '',
      appIcon: '',
      thumbnail: '',
      isIframeSupported: '',
      showDownloadBtn: '',
      isgatingEnabled: '',
      duration: ''
    })

    this.resourceLinkForm.setValue({
      name: '',
      instructions: '',
      artifactUrl: '',
      appIcon: '',
      thumbnail: '',
      isIframeSupported: '',
      showDownloadBtn: '',
      isgatingEnabled: '',
      duration: ''
    })

    this.fileUploadForm.reset()

    this.clearUploadedFile()
    this.moduleName = ''
    this.topicDescription = ''
    this.editResourceLinks = ''
    this.isNewTab = false
    this.isShowBtn = false
    this.isGating = false
    this.thumbnail = ''
    this.hours = 0
    this.minutes = 0
    this.seconds = 0

  }
  dragDrop(type1: any, type2: any, type3: string) {
    console.log(type1, type1.parent, type2, type3)
    this.dragEle1 = type1
    this.dragEle2 = type2
    this.dragEle3 = type3
  }

  compute(data?: any) {
    let dataCheck = data
    var tmpList = this.courseData!.children
    let found = tmpList.filter((child: any) => {
      return child.identifier === data
    })
    console.log(found)
    if (found.length === 0) {
      let found1 = tmpList.map((ch: any) => {
        if (ch && ch.children) {
          ch.children!.filter((child1: any) => {
            console.log(child1, data, dataCheck)
            if (child1.identifier === data) {
              return child1
            }
          }
          )
        }
      })
      console.log(found1)
      return found1
    } else {
      return found
    }
  }
  async drop(event: any) {
    this.loader.changeLoad.next(true)
    console.log(event)
    let dataList = this.courseData
    let identfs: any[] = []
    //1.push all identifiers to array of strings
    dataList.children.forEach((element: any) => {
      identfs.push(element.identifier)
      if (element.children && element.children.length > 0) {
        element.children.forEach((subElement: any) => {
          identfs.push(subElement.identifier)
        })
      }
    })
    console.log(identfs)

    //2.find identifier based on current and dropIndex
    let currentPosition = identfs[event.currentIndex]
    let prevPosition = identfs[event.previousIndex]

    let currentIndex = identfs.indexOf(currentPosition)
    let previousIndex = identfs.indexOf(prevPosition)
    console.log('identfs-current', currentIndex, currentPosition)
    console.log('identfs-previous', previousIndex, prevPosition)

    //find parent identifier of currentDrag and prevDrag
    var tmpList = this.courseData!.children
    this.storeService.parentData = this.courseData
    let currentFound = tmpList.find((el: any) => el.identifier === currentPosition)
    let previousFound = tmpList.find((el: any) => el.identifier === prevPosition)
    console.log('previous', previousFound)
    console.log('current', currentFound)
    if (currentFound == undefined) {
      tmpList.map((ch: any) => {
        if (ch && ch.children) {
          ch.children!.map((child: any) => {
            if (child.identifier === currentPosition) {
              console.log(child.identifier, child.parent)
              currentFound = child
            }
          })
        }
      })
    }
    if (previousFound == undefined) {
      tmpList.map((ch: any) => {
        if (ch && ch.children) {
          ch.children!.map((child: any) => {
            if (child.identifier === prevPosition) {
              console.log(child.identifier, child.parent)
              previousFound = child
            }
          })
        }
      })
    }
    console.log(currentFound)
    console.log(previousFound)
    let hierarchy = this.storeService.getTreeHierarchy()
    console.log(hierarchy, 'init')

    if (previousIndex > currentIndex) {
      if (previousFound && currentFound && previousFound.parent === this.courseData.identifier &&
        currentFound.parent === this.courseData.identifier && currentFound.contentType === "Resource" && previousFound.contentType === "Resource") {
        console.log('1')
        let parentData = hierarchy[this.courseData.identifier]
        let prevIndex = parentData["children"].indexOf(previousFound.identifier)
        //parentData["children"].splice(prevIndex, 0, currentFound.identifier)
        //parentData["children"].splice(prevIndex + 1, 1)
        let currIndex = parentData["children"].indexOf(currentFound.identifier)
        parentData["children"].splice(prevIndex, 1)
        parentData["children"].splice(currIndex, 0, previousFound.identifier)
        //parentData["children"].splice(prevIndex, 1)
        console.log(parentData["children"])
      } else {
        let prevContent = previousFound//this.compute(previousFound.identifier)
        let currentContent = currentFound//this.compute(currentFound.identifier)
        console.log(prevContent, currentContent, currentFound, currentContent["0"])

        let prevData = prevContent["0"] === undefined ? previousFound : prevContent[0]
        let currData = currentContent["0"] === undefined ? currentFound : currentContent[0]
        if (currData.contentType === "CourseUnit" && prevData.contentType === 'Resource') {
          let cCourseData = hierarchy[currData.identifier]
          console.log(cCourseData["children"])
          if (cCourseData["children"].length == 0) {
            cCourseData["children"].push(previousFound.identifier)
          } else {
            let courseData = hierarchy[currData.parent]
            let cIndex = courseData["children"].indexOf(currData.identifier)
            courseData["children"].splice(cIndex, 0, previousFound.identifier)
          }
        } else {
          if (currData.contentType === 'Resource' && prevData.contentType === 'Resource') {
            let cCourseData = hierarchy[currData.parent]
            let cIndex = cCourseData["children"].indexOf(currData.identifier)
            cCourseData["children"].splice(cIndex, 0, previousFound.identifier)
          }
        }
        if (prevData.contentType === 'Resource') {
          let pCourseData = hierarchy[prevData.parent]
          let pIndex = pCourseData["children"].lastIndexOf(previousFound.identifier)
          pCourseData["children"].splice(pIndex, 1)
        }
        if (prevData.contentType === 'CourseUnit') {
          let pCourseData = hierarchy[prevData.parent]
          let cIndex = pCourseData["children"].indexOf(currData.identifier)
          let pIndex = pCourseData["children"].indexOf(previousFound.identifier)
          pCourseData["children"].splice(pIndex, 1)
          pCourseData["children"].splice(cIndex, 0, previousFound.identifier)
        }
        console.log(hierarchy)
      }
    } else if (previousIndex <= currentIndex) {
      console.log('2')
      if (previousFound && currentFound && previousFound.parent === this.courseData.identifier &&
        currentFound.parent === this.courseData.identifier && currentFound.contentType === "Resource" && previousFound.contentType === "Resource") {
        let parentData = hierarchy[this.courseData.identifier]
        let prevIndex = parentData["children"].indexOf(previousFound.identifier)
        let currIndex = parentData["children"].indexOf(currentFound.identifier)
        parentData["children"].splice(prevIndex, 1)
        parentData["children"].splice(currIndex, 0, previousFound.identifier)
        console.log(parentData["children"])
      } else {
        console.log('here123')
        let prevContent = previousFound//this.compute(previousFound.identifier)
        let currentContent = currentFound//this.compute(currentFound.identifier)

        console.log(prevContent, currentContent)
        let prevData = prevContent["0"] === undefined ? previousFound : prevContent[0]
        let currData = currentContent["0"] === undefined ? currentFound : currentContent[0]

        if (currData.contentType === "CourseUnit" && prevData.contentType === 'Resource') {

          let cCourseData = hierarchy[currData.identifier]
          console.log(cCourseData["children"])
          if (cCourseData["children"].length == 0) {
            cCourseData["children"].push(previousFound.identifier)
          } else {

            let courseData = hierarchy[currData.parent]
            let cIndex = courseData["children"].indexOf(currData.identifier)
            courseData["children"].splice(cIndex, 0, previousFound.identifier)
            // let cIndex = cCourseData["children"].indexOf(currData.identifier)
            // cCourseData["children"].splice(cIndex, 0, previousFound.identifier)
          }
        } else {
          if (currData.contentType === 'Resource'
            && prevData.contentType === 'Resource'
          ) {

            console.log(identfs[identfs.length - 1] === currData.identifier)
            if (identfs[identfs.length - 1] === currData.identifier) {
              let cCourseData1 = hierarchy[this.courseData.identifier]
              this.loaderService.changeLoad.next(false)
              const dialogRef = this.dialog.open(UserIndexConfirmComponent, {
                width: '450px',
                height: '450x',
                data: { 'message': 'Do you want to place this selection outside the collection list or within the last Module?', 'id': this.contentService.parentContent },
              })

              dialogRef.afterClosed().subscribe(async result => {
                console.log(result)
                this.loaderService.changeLoad.next(true)

                if (result === 'New') {
                  cCourseData1["children"].push(prevPosition)
                  console.log(cCourseData1)
                } else {
                  let cCourseData2 = hierarchy[currData.parent]
                  console.log(cCourseData2["children"])
                  let cIndex = cCourseData2["children"].indexOf(currData.identifier)
                  console.log(cIndex)
                  cCourseData2["children"].splice(cIndex + 1, 0, previousFound.identifier)
                }
                if (prevData.contentType === 'Resource') {
                  let pCourseData = hierarchy[prevData.parent]
                  console.log(pCourseData["children"])
                  let pIndex = pCourseData["children"].indexOf(previousFound.identifier)
                  console.log(pIndex)
                  pCourseData["children"].splice(pIndex, 1)
                  console.log(pCourseData)
                }
                console.log(hierarchy, 'final123--------')

                const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
                  request: {
                    data: {
                      nodesModified: this.editorStore.getNewNodeModifyData(),
                      hierarchy: hierarchy,
                    },
                  },
                }

                console.log(requestBodyV2, "data123")
                await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
                  this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
                    this.loaderService.changeLoad.next(false)
                    this.courseData = data
                  })
                })
              })
              return
            } else {
              let cCourseData = hierarchy[currData.parent]
              console.log(cCourseData)
              let cIndex = cCourseData["children"].indexOf(currData.identifier)
              console.log(cIndex)
              cCourseData["children"].splice(cIndex + 1, 0, previousFound.identifier)
              console.log(cCourseData["children"], 'pppp')
            }

          }
        }
        if (prevData.contentType === 'Resource') {
          let pCourseData = hierarchy[prevData.parent]
          let pIndex = pCourseData["children"].indexOf(previousFound.identifier)
          pCourseData["children"].splice(pIndex, 1)
          console.log(pCourseData)
        }
        if (prevData.contentType === 'CourseUnit') {

          let pCourseData = hierarchy[prevData.parent]
          let cIndex = pCourseData["children"].indexOf(currData.identifier)
          let pIndex = pCourseData["children"].indexOf(previousFound.identifier)
          pCourseData["children"].splice(pIndex, 1)
          pCourseData["children"].splice(cIndex, 0, previousFound.identifier)

        }
        console.log(hierarchy)
        //console.log(currData["children"])
      }
    } else {
      console.log('same')
      let currentPosition = identfs[event.currentIndex]
      let prevPosition = identfs[event.previousIndex]
      if (currentPosition === prevPosition) {
        if (identfs.includes(prevPosition)) {
          let parentData = hierarchy[this.courseData.identifier]
          parentData["children"].push(prevPosition)
          if (currentFound.contentType === 'Resource') {
            let pCourseData = hierarchy[currentFound.parent]
            console.log(pCourseData)
            let pIndex = pCourseData["children"].indexOf(currentFound.identifier)
            pCourseData["children"].splice(pIndex, 1)
          }
        }
      }
    }

    //drag resource to courseunit index its-self
    console.log(hierarchy, 'final--------')

    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.editorStore.getNewNodeModifyData(),
          hierarchy: hierarchy,
        },
      },
    }

    console.log(requestBodyV2, "data")
    await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
      this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
        this.loaderService.changeLoad.next(false)
        this.courseData = data
      })
    })
  }
  dragEnd(event: any) {
    console.log(event)
  }
  async triggerUpload() {
    if (!this.file) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.UPLOAD_FILE,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    } else {
      this.fileUploadForm.controls.mimeType.setValue(this.mimeType)
      this.storeData()

      const nodesModified: any = {}
      Object.keys(this.contentService.upDatedContent).forEach(v => {
        nodesModified[v] = {
          isNew: false,
          root: this.storeService.parentNode.includes(v),
          metadata: this.contentService.upDatedContent[v],
        }
      })
      // tslint:disable-next-line:no-console
      console.log(this.currentContent)
      // tslint:disable-next-line:no-console
      console.log(this.contentService.getOriginalMeta(this.currentContent))
      const tempUpdateContent = this.contentService.getOriginalMeta(this.currentContent)
      let requestBody: NSApiRequest.IContentUpdateV2

      if (tempUpdateContent.category === 'CourseUnit') {
        nodesModified.visibility = 'Parent'
      }

      let currentContent = this.currentContent
      // tslint:disable-next-line:no-console
      console.log(nodesModified[currentContent])
      requestBody = {
        request: {
          content: nodesModified[currentContent].metadata,
        },
      }
      requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)

      if (requestBody.request.content.category) {
        delete requestBody.request.content.category
      }
      const contenUpdateRes: any =
        await this.editorService.updateContentV3(requestBody, currentContent).toPromise().catch(_error => { })
      if (contenUpdateRes && contenUpdateRes.params && contenUpdateRes.params.status === 'successful') {
        const hierarchyData = await this.editorService.readcontentV3(this.contentService.parentContent).toPromise().catch(_error => { })
        if (hierarchyData) {
          this.loaderService.changeLoad.next(true)
          this.contentService.resetOriginalMetaWithHierarchy(hierarchyData)
          this.upload()
        } else {
          this.errorMessage()
        }
      }
    }
  }

  upload() {
    const formdata = new FormData()
    formdata.append(
      'content',
      this.file as Blob,
      (this.file as File).name.replace(/[^A-Za-z0-9_.]/g, ''),
    )
    this.loaderService.changeLoad.next(true)
    this.uploadService
      .upload(
        formdata,
        {
          contentId: this.currentContent,
          contentType:
            this.mimeType === 'application/pdf'
              ? CONTENT_BASE_STATIC
              : this.mimeType === 'application/vnd.ekstep.html-archive'
                ? CONTENT_BASE_WEBHOST
                : CONTENT_BASE_STREAM,
        },
        undefined,
        // this.mimeType === 'application/html',
        this.mimeType === 'application/vnd.ekstep.html-archive',
      ).pipe(
        tap(v => {
          this.canUpdate = false
          // const artifactUrl = v.result && v.result.artifactUrl ? v.result.artifactUrl : ''
          const artifactUrl = v && v.artifactUrl ? v.artifactUrl : ''
          // tslint:disable-next-line:no-console
          console.log("this.mimeType", this.mimeType)
          if (this.mimeType === 'video/mp4' || this.mimeType === 'application/pdf' || this.mimeType === 'audio/mpeg') {
            this.fileUploadForm.controls.artifactUrl.setValue(v ? this.generateUrl(artifactUrl) : '')
            this.fileUploadForm.controls.downloadUrl.setValue(v ? this.generateUrl(artifactUrl) : '')
          } else {
            this.fileUploadForm.controls.artifactUrl.setValue(v ? artifactUrl : '')
            this.fileUploadForm.controls.downloadUrl.setValue(v ? artifactUrl : '')
          }
          this.fileUploadForm.controls.mimeType.setValue(this.mimeType)
          if (this.mimeType === 'application/vnd.ekstep.html-archive' && this.file && this.file.name.toLowerCase().endsWith('.zip')) {
            this.fileUploadForm.controls.isExternal.setValue(false)
            this.fileUploadForm.controls['streamingUrl'].setValue(v ?
              this.generateStreamUrl((this.fileUploadCondition.url) ? this.fileUploadCondition.url : '') : '')
            this.fileUploadForm.controls['entryPoint'].setValue(this.entryPoint ? this.entryPoint : '')
            this.fileUploadForm.controls.duration.setValue(this.duration)
          }

          if (this.mimeType === 'video/mp4') {
            this.fileUploadForm.controls.transcoding.setValue({
              lastTranscodedOn: null,
              retryCount: 0,
              status: 'STARTED',
            })
          }

          this.fileUploadForm.controls.duration.setValue(this.duration)
          this.fileUploadForm.controls.size.setValue((this.file as File).size)
          this.canUpdate = true
        }),
        mergeMap(v => {

          if (this.mimeType === 'application/pdf') {
            this.profanityCheckAPICall(v.artifactUrl)
          }
          return of(v)
        }),
      )
      .subscribe(
        _ => {
          // this.loaderService.changeLoad.next(false)
          this.storeData()
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.UPLOAD_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          this.action('save')
          this.validateFile(this.file as File)
          this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
            this.courseData = data
          })
          this.loaderService.changeLoad.next(false)
        },
        () => {
          this.loaderService.changeLoad.next(false)
          this.uploadFileName = ''
          this.file = null
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.UPLOAD_FILE_ERROR,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
      )
  }
  validateFile(file: File) {
    const content = document.createElement(
      this.mimeType === 'video/mp4' ? 'video' : 'audio',
    )
    content.preload = 'metadata'
    content.onloadedmetadata = () => {
      window.URL.revokeObjectURL(content.src)
      this.setDuration(JSON.stringify(Math.round(content.duration)))
      this.resourcePdfForm.controls.duration.setValue(this.timeToSeconds())
    }
    content.src = URL.createObjectURL(file)
  }
  generateStreamUrl(fileName: string) {
    return `${environment.azureHost}/${environment.azureBucket}/html/${this.currentContent}-snapshot/${fileName}`
  }


  profanityCheckAPICall(url: string) {
    this.profanityService.startProfanity(this.currentContent, url, (this.file ? this.file.name : this.currentContent)).subscribe()
  }

  errorMessage() {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: {
        type: Notify.UPLOAD_FAIL,
      },
      duration: NOTIFICATION_TIME * 1000,
    })
  }

  storeData() {
    const originalMeta = this.contentService.getOriginalMeta(this.currentContent)
    const currentMeta = this.fileUploadForm.value
    const meta: any = {}
    Object.keys(currentMeta).map(v => {
      if (
        v !== 'versionKey' &&
        JSON.stringify(currentMeta[v as keyof NSContent.IContentMeta]) !==
        JSON.stringify(originalMeta[v as keyof NSContent.IContentMeta])
      ) {
        if (
          currentMeta[v] ||
          (this.initService.authConfig[v as keyof IFormMeta].type === 'boolean' &&
            currentMeta[v] === false)
        ) {
          if (v !== 'duration') {
            meta[v] = currentMeta[v]
          }

        } else {
          if (v !== 'duration') {
            meta[v] = JSON.parse(
              JSON.stringify(
                this.initService.authConfig[v as keyof IFormMeta].defaultValue[
                  originalMeta.contentType
                  // tslint:disable-next-line: ter-computed-property-spacing
                ][0].value,
              ),
            )
          }
        }
      } else if (v === 'versionKey') {
        meta[v as keyof NSContent.IContentMeta] = originalMeta[v as keyof NSContent.IContentMeta]
      }
    })
    this.contentService.setUpdatedMeta(meta, this.currentContent)
  }

  clearUploadedFile() {
    this.contentService.removeListOfFilesAndUpdatedIPR(this.currentContent)
    this.uploadFileName = ''
    //this.fileUploadForm.controls.artifactUrl.setValue(null)
    this.file = null
    this.duration = '0'
    this.mimeType = ''
  }
  /*PDF/audio/vedio functionality end*/
  takeActions(action: string, node: IContentTreeNode) {
    switch (action) {
      case 'editMeta':
      case 'editContent':

      case 'delete':
        this.delete(node)
        break

      default:
        break
    }
  }

  delete(node: IContentTreeNode) {

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      height: '175px',
      data: 'deleteTreeNode',
    })
    //this.preserveExpandedNodes()
    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.loader.changeLoad.next(true)
        this.parentHierarchy = []
        this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
          this.courseData = data
        })
        const hierarchyData = this.storeService.getNewTreeHierarchy(this.courseData)
        //const hierarchyData = this.storeService.getTreeHierarchy()
        Object.keys(hierarchyData).forEach(async (ele: any) => {
          if (ele === node.identifier) {
            this.storeService.deleteContentNode(node)
            delete hierarchyData[ele]
          }
          if (ele === node.parent) {
            const index = hierarchyData[ele]["children"].indexOf(node.identifier)
            if (index > -1) {
              hierarchyData[ele]["children"].splice(index, 1)
              const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
                request: {
                  data: {
                    nodesModified: this.editorStore.getNodeModifyData(),
                    hierarchy: hierarchyData,
                  },
                },
              }
              await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
                this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
                  this.courseData = data
                  this.updateCouseDuration(data)
                  this.showAddModuleForm = false
                  if (this.courseData && this.courseData.competency == true) {
                    this.isSelfAssessment = true
                  } else {
                    this.isSelfAssessment = false
                  }
                  this.getChildrenCount()
                  if (this.courseData && this.courseData.children.length >= 2) {
                    this.showSettingsPage = true
                  } else {
                    this.showSettingsPage = false
                  }
                  this.snackBar.openFromComponent(NotificationComponent, {
                    data: {
                      type: Notify.SUCCESS
                    },
                    duration: NOTIFICATION_TIME * 500,

                  })
                  this.loader.changeLoad.next(false)
                  this.clearForm()
                  this.editorStore.resetOriginalMetaWithHierarchy(data)
                  // tslint:disable-next-line: align
                })
              })
            }
          }
        })
      }
    })
  }
  /*
   Get the parent node of a node
    */
  getParentNode(node: IContentTreeNode): IContentTreeNode | null {
    const currentLevel = node.level

    if (currentLevel < 1) {
      return null
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1

    for (let i = startIndex; i >= 0; i = i - 1) {
      const currentNode = this.treeControl.dataNodes[i]

      if (currentNode.level < currentLevel) {
        return currentNode
      }
    }
    return null
  }
  preserveExpandedNodes() {
    this.expandedNodes = new Set<number>()
    this.treeControl.dataNodes.forEach(v => {
      if (this.treeControl.isExpandable(v) && this.treeControl.isExpanded(v)) {
        this.expandedNodes.add(v.id)
      }
    })
    // this.store.expendedNode = this.expandedNodes
  }
  /*Assessment functionality start*/
  getassessment() {

    this.activeContentSubscription = this.contentService.changeActiveCont.subscribe(id => {
      this.allLanguages = this.initService.ordinals.subTitles
      this.loaderService.changeLoadState(true)
      this.quizConfig = this.quizStoreSvc.getQuizConfig('ques')
      this.mediumSizeBreakpoint$.subscribe(isLtMedium => {
        this.sideNavBarOpened = !isLtMedium
        this.mediumScreenSize = isLtMedium
        if (isLtMedium) {
          this.showContent = false
        } else {
          this.showContent = true
        }
      })

      if (this.activateRoute.parent && this.activateRoute.parent.parent) {
        this.activateRoute.parent.parent.data.subscribe(v => {
          this.quizResolverSvc.getUpdatedData(v.contents[0].content.identifier).subscribe(newData => {
            const quizContent = this.contentService.getOriginalMeta(this.contentService.currentContent)
            if (quizContent.mimeType === 'application/json') {
              const fileData = ((quizContent.artifactUrl || quizContent.downloadUrl) ?
                this.quizResolverSvc.getJSON(this.generateUrl(quizContent.artifactUrl || quizContent.downloadUrl)) : of({} as any))
              fileData.subscribe(jsonResponse => {
                if (jsonResponse && Object.keys(jsonResponse).length > 1) {
                  if (v.contents && v.contents.length) {
                    if (jsonResponse) {
                      v.contents[0].data = jsonResponse
                      this.quizStoreSvc.assessmentDuration = jsonResponse.assessmentDuration
                      this.quizStoreSvc.passPercentage = jsonResponse.passPercentage
                      this.assessmentDuration = (jsonResponse.assessmentDuration) / 60
                      this.passPercentage = jsonResponse.passPercentage
                    }
                    this.allContents.push(v.contents[0].content)
                    if (v.contents[0].data) {
                      this.quizStoreSvc.collectiveQuiz[id] = v.contents[0].data.questions
                    } else if (newData[0] && newData[0].data && newData[0].data.questions) {
                      this.quizStoreSvc.collectiveQuiz[id] = newData[0].data.questions
                    } else {
                      this.quizResolverSvc.getUpdatedData(id).subscribe(updatedData => {
                        if (updatedData && updatedData[0]) {
                          this.quizStoreSvc.collectiveQuiz[id] = updatedData[0].data.questions
                          // need to arrange
                          this.canEditJson = this.quizResolverSvc.canEdit(quizContent)
                          this.resourceType = quizContent.categoryType || 'Assessment'
                          this.questionsArr =
                            this.quizStoreSvc.collectiveQuiz[id] || []
                          this.contentLoaded = true
                          this.questionsArr = this.quizStoreSvc.collectiveQuiz[id]
                          this.currentId = id
                          this.quizStoreSvc.currentId = id
                          this.quizStoreSvc.changeQuiz(0)
                        }
                      })
                      this.quizStoreSvc.collectiveQuiz[id] = []
                    }
                    this.canEditJson = this.quizResolverSvc.canEdit(quizContent)
                    this.resourceType = quizContent.categoryType || 'Assessment'
                    this.quizDuration = quizContent.duration || '300'
                    this.questionsArr =
                      this.quizStoreSvc.collectiveQuiz[id] || []
                    this.contentLoaded = true
                  }
                  if (!this.quizStoreSvc.collectiveQuiz[id]) {
                    this.quizStoreSvc.collectiveQuiz[id] = []
                  }
                } else {
                  this.assessmentDuration = ''
                  this.passPercentage = ''
                  this.canEditJson = this.quizResolverSvc.canEdit(quizContent)
                  this.resourceType = quizContent.categoryType || 'Assessment'
                  this.quizDuration = quizContent.duration || '300'
                  this.questionsArr =
                    this.quizStoreSvc.collectiveQuiz[id] || []
                  this.contentLoaded = true
                  if (!this.quizStoreSvc.collectiveQuiz[id]) {
                    this.quizStoreSvc.collectiveQuiz[id] = []
                  }
                }
              })
            }
          })
        })
        // selected quiz index
        this.activeIndexSubscription = this.quizStoreSvc.selectedQuizIndex.subscribe(index => {
          this.selectedQuizIndex = index
        })
        // active lex id
        if (!this.quizStoreSvc.collectiveQuiz[id]) {
          this.quizStoreSvc.collectiveQuiz[id] = []
        }
        this.questionsArr = this.quizStoreSvc.collectiveQuiz[id]
        this.currentId = id
        this.quizStoreSvc.currentId = id
        this.quizStoreSvc.changeQuiz(0)
      }
    })
  }

  addQuestion() {
    this.quizStoreSvc.addQuestion(this.assessmentOrQuizForm.value.questionType)
    this.assessmentData = this.quizStoreSvc.collectiveQuiz[this.currentContent]
  }

  editAssessment(index: number, event: any, data: any) {
    event.stopPropagation()
    //const confirmDelete =
    let dialogRefForPublish = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        type: 'editAssessment',
        index: index + 1,
        currentContent: this.currentContent,
        data: data
      },
    })
    dialogRefForPublish.componentInstance.onFormChange.subscribe((result: any) => {
      this.updateSelectedQuiz(result)
      // tslint:disable-next-line:no-console
      console.log('dialog data', result)
    })

    dialogRefForPublish.componentInstance.onFormQuestion.subscribe((result: any) => {
      this.updateSelectedQuiz(result.question, 'question')
    })

    dialogRefForPublish.afterClosed().subscribe(result => {
      // tslint:disable-next-line:no-console
      console.log(result)
    })
  }

  updateSelectedQuiz(options: any, type?: string) {
    this.quizIndex = 0
    const quizData = JSON.parse(JSON.stringify(this.quizStoreSvc.getQuiz(this.quizIndex)))
    let updatedVal: any = {}
    if (type === 'question') {
      updatedVal = quizData
      updatedVal.question = options
    } else {
      updatedVal = {
        ...quizData,
        ...options,
      }
      for (let i = 0; i < updatedVal.options.length; i = i + 1) {
        updatedVal.options[i] = { ...quizData.options[i], ...options.options[i] }
      }
    }
    this.quizStoreSvc.updateQuiz(this.quizIndex, updatedVal)
    if (updatedVal.isInValid) {
      this.validateNdShowError()
    }
  }

  validateNdShowError(showError?: boolean) {
    const errorType = this.quizStoreSvc.validateQuiz(this.quizIndex)
    if (showError) {
      if (errorType) {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: errorType,
          },
          duration: NOTIFICATION_TIME * 500,
        })
      }
    }
  }
  /*Assessment functionality end*/

  /*course details functionality start*/
  async saveCourseDetails() {
    // if (this.timeToSeconds() == 0) {
    //   this.snackBar.openFromComponent(NotificationComponent, {
    //     data: {
    //       type: Notify.DURATION_CANT_BE_0,
    //     },
    //     duration: NOTIFICATION_TIME * 1000,
    //   })
    // } else
    if (this.moduleName.trim() === '') {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.INVALID_COURSE_NAME,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    } else {
      this.loaderService.changeLoad.next(true)
      this.currentCourseId = this.content.identifier
      await this.editorService.readcontentV3(this.currentCourseId).subscribe(async (resData: any) => {
        const updateContentReq: any = {
          request: {
            content: {
              versionKey: resData.versionKey,
              name: this.moduleName.trim(),
              appIcon: this.thumbnail,
              gatingEnabled: this.isGating,
              instructions: this.topicDescription,
              thumbnail: this.thumbnail,
              duration: this.timeToSeconds().toString()
            },
          },
        }
        await this.editorService.updateNewContentV3(updateContentReq, this.currentCourseId).toPromise().catch((_error: any) => { })
        await this.editorService.readcontentV3(this.currentCourseId).subscribe(async (data: any) => {
          this.courseData = data
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          // if (data.duration) {
          //   const minutes = data.duration > 59 ? Math.floor(data.duration / 60) : 0
          //   const second = data.duration % 60
          //   const hour = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
          //   const minute = minutes ? minutes % 60 : 0
          //   const seconds = second || 0
          //   this.mainCourseDuration = hour + ':' + minute + ':' + seconds
          // }
          this.clearForm()
        })
      })
    }
  }
  /*course details functionality end*/
}
