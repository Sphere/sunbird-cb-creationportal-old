import { DeleteDialogComponent } from '@ws/author/src/lib/modules/shared/components/delete-dialog/delete-dialog.component'
import { Component, OnDestroy, OnInit } from '@angular/core'
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms'
import { MatDialog, MatSnackBar } from '@angular/material'
import { ActivatedRoute, Router } from '@angular/router'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { IActionButton, IActionButtonConfig } from '@ws/author/src/lib/interface/action-button'
import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'
import { IAuthSteps } from '@ws/author/src/lib/interface/auth-stepper'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { CommentsDialogComponent } from '@ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component'
import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'
import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { EditorContentService } from '@ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { LoaderService } from '@ws/author/src/lib/services/loader.service'
import { of, Subscription } from 'rxjs'
// import { map, mergeMap, tap, catchError } from 'rxjs/operators'
import { map, mergeMap, tap } from 'rxjs/operators'
import { IContentNode, IContentTreeNode } from '../../interface/icontent-tree'
import { CollectionResolverService } from './../../services/resolver.service'
import { CollectionStoreService } from './../../services/store.service'
// import { VIEWER_ROUTE_FROM_MIME, WidgetContentService } from '@ws-widget/collection'
import { VIEWER_ROUTE_FROM_MIME } from '@ws-widget/collection'
// import { NotificationService } from '@ws/author/src/lib/services/notification.service'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout'
import { HeaderServiceService } from './../../../../../../../../../../../../../src/app/services/header-service.service'
import { RootService } from 'src/app/component/root/root.service'
import { FlatTreeControl } from '@angular/cdk/tree'
import { isNumber } from 'lodash'
import { environment } from '../../../../../../../../../../../../../src/environments/environment'
import { ConfigurationsService } from '../../../../../../../../../../../../../library/ws-widget/utils/src/public-api'
/* tslint:disable */
import _ from 'lodash'
// import { VariableAst } from '@angular/compiler'

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ws-author-course-collection',
  templateUrl: './course-collection.component.html',
  styleUrls: ['./course-collection.component.scss'],
  providers: [CollectionStoreService, CollectionResolverService],
})
export class CourseCollectionComponent implements OnInit, OnDestroy {
  contents: NSContent.IContentMeta[] = []
  couseCreated = ''
  currentParentId!: string
  stepper: IAuthSteps[] = [
    { title: 'Choose Type', disabled: true },
    { title: 'Content', disabled: false },
    { title: 'Details', disabled: false },
  ]
  isSubmitPressed = false
  showLanguageBar = false
  actionButton: IActionButtonConfig | null = null
  currentStep = 1
  currentContent!: string
  currentCourseId!: string
  activeContentSubscription: Subscription | null = null
  routerSubscription: Subscription | null = null
  isChanged = false
  previewIdentifier: string | null = null
  viewMode = 'meta'
  mimeTypeRoute = ''

  mediumScreen = false
  sideBarOpened = false
  mediumSizeBreakpoint$ = this.breakpointObserver
    .observe([Breakpoints.XSmall, Breakpoints.Small])
    .pipe(map((res: BreakpointState) => res.matches))
  mode$ = this.mediumSizeBreakpoint$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  leftArrow = true
  showAddchapter = false
  createTopicForm: FormGroup | undefined
  reloadTOC = false
  public sideNavBarOpened = false
  callSaveFn!: boolean
  courseName: any
  parentNodeId!: number
  expandedNodes = new Set<number>()
  treeControl!: FlatTreeControl<IContentTreeNode>
  triggerQuizSave = false
  triggerUploadSave = false
  courseId = ''
  checkCreator = false
  versionKey: any
  versionID: any

  constructor(
    private contentService: EditorContentService,
    private activateRoute: ActivatedRoute,
    private storeService: CollectionStoreService,
    private resolverService: CollectionResolverService,
    private initService: AuthInitService,
    private loaderService: LoaderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private editorService: EditorService,
    private router: Router,
    // private notificationSvc: NotificationService,
    private accessControlSvc: AccessControlService,
    private breakpointObserver: BreakpointObserver,
    private fb: FormBuilder,
    private headerService: HeaderServiceService,
    private rootSvc: RootService,
    // private contentSvc: WidgetContentService,
    private _configurationsService: ConfigurationsService,
  ) {
    this.callSaveFn = this.headerService.isSavePressed
    this.rootSvc.showNavbarDisplay$.next(false)
    this.headerService.headerSaveData.subscribe(data => {
      if (data) {
        this.save()
      }
    })
    this.initService.currentMessage.subscribe(
      (data: any) => {
        if (data === 'publishResources') {
          this.takeAction('publishResources')
        }
        if (data === 'PublishCBP') {
          this.PublishCBP()
        }
      })

    this.initService.uploadMessage.subscribe(
      (data: any) => {
        if (data) {
          this.save()
          this.update()
        }
      })
    this.initService.editCourseMessage.subscribe(
      (data: any) => {
        if (data) {
          this.editPublishCourse()
        }
      })
  }

  ngOnInit() {
    this.routerValuesCall()
    this.courseId = this.storeService.parentNode[0]
    this.parentNodeId = this.storeService.currentParentNode
    // this.expandNodesById([this.parentNodeId])
    this.createTopicForm = this.fb.group({
      topicName: new FormControl('', [Validators.required]),
      topicDescription: new FormControl('', [Validators.required]),
    })

    this.stepper = this.initService.collectionConfig.stepper
    this.showLanguageBar = this.initService.collectionConfig.languageBar
    const actionButton: IActionButton[] = []

    this.initService.collectionConfig.actionButtons.buttons.forEach(action => {
      if (
        this.contentService.checkConditionV2(
          this.contentService.getOriginalMeta(this.currentParentId),
          action.conditions,
          action.title
        )
      ) {
        actionButton.push({
          title: action.title,
          icon: action.icon,
          event: action.event,
          conditions: action.conditions,
        })
      }
    })
    this.actionButton = {
      enabled: this.initService.collectionConfig.actionButtons.enabled,
      buttons: actionButton,
    }
    this.mediumSizeBreakpoint$.subscribe(isLtMedium => {
      this.mediumScreen = isLtMedium
      this.sideBarOpened = !isLtMedium
    })
  }

  routerValuesCall() {
    this.contentService.changeActiveCont.subscribe(data => {
      this.currentContent = data
      this.currentCourseId = data
      if (this.contentService.getUpdatedMeta(data).contentType !== 'Resource') {
        this.viewMode = 'meta'
      }
    })

    if (this.activateRoute.parent && this.activateRoute.parent.parent) {
      this.routerSubscription = this.activateRoute.parent.parent.data.subscribe(data => {

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
          this.subAction({ type: 'editContent', identifier: data.contents[0].content.children[0].identifier, nodeClicked: true })
          this.storeService.selectedNodeChange.next(data.contents[0].content.children[0].identifier)
        }

        // this.storeService.selectedNodeChange.subscribe(node => {
        //   if (node) {
        //     console.log('selected node', node)
        //     const getNodeId = (this.storeService.lexIdMap.get(node.toString()) as number[])[0]
        //     this.storeService.currentSelectedNode = getNodeId

        //     // this.contentService.currentContent = node.toString()

        //     // this.contentService.changeActiveCont.next(node.toString())

        //   }
        // })

      })

      this.activateRoute.parent.url.subscribe(data => {
        const urlParam = data[0].path
        if (urlParam === 'collection') {
          this.headerService.showCreatorHeader(this.courseName)
        }

      })
    }
  }

  expandNodesById(ids?: number[]) {
    const idSet = ids ? new Set(ids) : this.expandedNodes
    this.treeControl.dataNodes.forEach(node => {
      if (idSet.has(node.id)) {
        this.treeControl.expand(node)
        let parent = this.getParentNode(node)
        while (parent) {
          this.treeControl.expand(parent)
          parent = this.getParentNode(parent)
        }
      }
    })
  }

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

  ngOnDestroy() {
    this.loaderService.changeLoad.next(false)
    this.headerService.showCreatorHeader('showlogo')
    this.rootSvc.showNavbarDisplay$.next(true)
  }

  addChapterName() {
    // console.log('newchap', this.newChapterName)
  }

  async setContentType(param: string, filetype?: string) {
    if (filetype) {
      this.storeService.uploadFileType.next(filetype)
    }
    if (this.createTopicForm && this.createTopicForm.value) {

      this.couseCreated = param
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

      const parentNode = node
      this.loaderService.changeLoad.next(true)
      const isDone = await this.storeService.createChildOrSibling(
        this.couseCreated,
        parentNode,
        asSibling ? node.id : undefined,
        'below',
        this.createTopicForm.value,
        param === 'web' ? 'link' : '',

      )
  
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: isDone ? Notify.SUCCESS : Notify.FAIL,
        },
        duration: NOTIFICATION_TIME * 1000,

      })

      if (isDone) {
        const newCreatedLexid = this.editorService.newCreatedLexid
   
        if (newCreatedLexid) {
          const newCreatedNode = (this.storeService.lexIdMap.get(newCreatedLexid) as number[])[0]
          this.storeService.currentSelectedNode = newCreatedNode
          this.storeService.selectedNodeChange.next(newCreatedNode)
        }
        this.currentContent = this.editorService.newCreatedLexid
        // update the id
        this.contentService.currentContent = newCreatedLexid
        this.loaderService.changeLoad.next(false)
      }
      this.showAddchapter = false
      this.loaderService.changeLoad.next(false)
      this.subAction({ type: 'editContent', identifier: this.editorService.newCreatedLexid, nodeClicked: false })
      this.createTopicForm.reset()
      this.save()
    }
  }

  sidenavClose() {
    setTimeout(() => (this.leftArrow = true), 500)
  }

  async tempSave() {
    if (this.contentService.getUpdatedMeta(this.currentCourseId)) {
      
      this.versionKey = await this.editorService.readcontentV3(this.editorService.newCreatedLexid || this.currentCourseId).toPromise()
    }

    this.loaderService.changeLoad.next(true)
    this.triggerSave().subscribe(
      () => {
        
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        // window.location.reload()
      },
      (error: any) => {
        if (error.status === 409) {
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
          })
        }
        //this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  async save(nextAction?: string) {
    if(nextAction === undefined) {
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
      this.loaderService.changeLoad.next(true)
      if (this.contentService.getUpdatedMeta(this.currentCourseId)) {
        this.versionID = await this.editorService.readcontentV3(this.currentCourseId).toPromise()
        this.versionKey = this.contentService.getUpdatedMeta(this.currentCourseId)
      }

      this.triggerSave().subscribe(
        () => {
          if (nextAction) {
            this.action(nextAction)
          }
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          // window.location.reload()
        },
        (error: any) => {
          if (error.status === 409) {
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
            })
          }
          this.loaderService.changeLoad.next(false)
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
        this.action(nextAction)
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

  get validationCheck(): boolean {
    const currentNodeId = this.storeService.lexIdMap.get(this.currentParentId) as number[]
    let returnValue = this.storeService.validationCheck(currentNodeId[0])

    // console.log('returnvalue ', returnValue)

    // returnValue = null

    if (returnValue) {
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
      })
      return false
    }
    return true
  }

  takeAction(contentAction?: string) {
    this.isSubmitPressed = true
    // const needSave = Object.keys(this.contentService.upDatedContent || {}).length

    // if (!needSave && !this.isChanged) {
    //   // if (!this.isChanged) {
    //   this.snackBar.openFromComponent(NotificationComponent, {
    //     data: {
    //       type: Notify.UP_TO_DATE,
    //     },
    //     duration: NOTIFICATION_TIME * 1000,
    //   })
    //   return
    // }


    // console.log('this.validationCheck', this.validationCheck)

    if (this.validationCheck) {

      this.editorService.readcontentV3(this.contentService.parentContent).subscribe((resData: any) => {
        if (resData && Object.keys(resData).length > 0) {
          resData.creatorContacts =
            this.jsonVerify(resData.creatorContacts) ? JSON.parse(resData.creatorContacts) : []
          resData.trackContacts =
            this.jsonVerify(resData.reviewer) ? JSON.parse(resData.reviewer) : []
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
      if (contentAction !== 'publishResources') {
        const dialogRef = this.dialog.open(CommentsDialogComponent, {
          width: '750px',
          height: '450px',
          data: this.contentService.getOriginalMeta(this.currentParentId),
        })

        // dialogRef.afterClosed().subscribe((commentsForm: FormGroup) => {
        //   this.finalCall(commentsForm)
        // })
        dialogRef.afterClosed().subscribe((d) => {
          // this.finalCall(contentAction)
          if (this.getAction() === 'sendForReview' && d.value.action === 'reject') {
            contentAction = 'rejectContent'
            this.finalCall(contentAction)
          } else {
            this.finalCall(contentAction)
          }
        })
      }
      if (contentAction === 'publishResources') {
        this.finalCall(contentAction)
      }
    }



  }

  // finalCall(commentsForm: FormGroup) {
  //   if (commentsForm) {
  //     const body: NSApiRequest.IForwardBackwardActionGeneral = {
  //       comment: commentsForm.controls.comments.value,
  //       operation:
  //         commentsForm.controls.action.value === 'accept' ||
  //           ['Draft', 'Live'].includes(
  //             this.contentService.originalContent[this.currentParentId].status,
  //           )
  //           ? 1
  //           : 0,
  //     }
  //     const updatedMeta = this.contentService.getUpdatedMeta(this.currentParentId)
  //     const needSave =
  //       Object.keys(this.contentService.upDatedContent || {}).length ||
  //       Object.keys(this.storeService.changedHierarchy).length
  //     const saveCall = (needSave ? this.triggerSave() : of({} as any)).pipe(
  //       mergeMap(() =>
  //         this.editorService
  //           .forwardBackward(
  //             body,
  //             this.currentParentId,
  //             this.contentService.originalContent[this.currentParentId].status,
  //           )
  //           .pipe(
  //             mergeMap(() =>
  //               this.notificationSvc
  //                 .triggerPushPullNotification(
  //                   updatedMeta,
  //                   body.comment,
  //                   body.operation ? true : false,
  //                 )
  //                 .pipe(
  //                   catchError(() => {
  //                     return of({} as any)
  //                   }),
  //                 ),
  //             ),
  //           ),
  //       ),
  //     )
  //     this.loaderService.changeLoad.next(true)
  //     saveCall.subscribe(
  //       () => {
  //         this.loaderService.changeLoad.next(false)
  //         this.snackBar.openFromComponent(NotificationComponent, {
  //           data: {
  //             type: this.getMessage('success'),
  //           },
  //           duration: NOTIFICATION_TIME * 1000,
  //         })
  //         this.contents = this.contents.filter(v => v.identifier !== this.currentParentId)
  //         if (this.contents.length) {
  //           this.contentService.changeActiveCont.next(this.contents[0].identifier)
  //         } else {
  //           this.router.navigateByUrl('/author/home')
  //         }
  //       },
  //       (error: any) => {
  //         if (error.status === 409) {
  //           const errorMap = new Map<string, NSContent.IContentMeta>()
  //           Object.keys(this.contentService.originalContent).forEach(v =>
  //             errorMap.set(v, this.contentService.originalContent[v]),
  //           )
  //           const dialog = this.dialog.open(ErrorParserComponent, {
  //             width: '80vw',
  //             height: '90vh',
  //             data: {
  //               errorFromBackendData: error.error,
  //               dataMapping: errorMap,
  //             },
  //           })
  //           dialog.afterClosed().subscribe(v => {
  //             if (v) {
  //               if (typeof v === 'string') {
  //                 this.storeService.selectedNodeChange.next(
  //                   (this.storeService.lexIdMap.get(v) as number[])[0],
  //                 )
  //                 this.contentService.changeActiveCont.next(v)
  //               } else {
  //                 this.storeService.selectedNodeChange.next(v)
  //                 this.contentService.changeActiveCont.next(
  //                   this.storeService.uniqueIdMap.get(v) as string,
  //                 )
  //               }
  //             }
  //           })
  //         }
  //         this.loaderService.changeLoad.next(false)
  //         this.snackBar.openFromComponent(NotificationComponent, {
  //           data: {
  //             type: this.getMessage('failure'),
  //           },
  //           duration: NOTIFICATION_TIME * 1000,
  //         })
  //       },
  //     )
  //   }
  // }

  // async finalCall(commentsForm: FormGroup) {
  //   let flag = 0
  //   if (commentsForm) {
  //     const body: NSApiRequest.IForwardBackwardActionGeneral = {
  //       comment: commentsForm.controls.comments.value,
  //       operation:
  //         commentsForm.controls.action.value === 'accept' ||
  //           ['Draft', 'Live'].includes(
  //             this.contentService.originalContent[this.currentParentId].status,
  //           )
  //           ? 1
  //           : 0,
  //     }

  //     console.log('Body ===  ', body)

  //     const updatedMeta = this.contentService.getUpdatedMeta(this.currentParentId)
  //     const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
  //     const needSave =
  //       Object.keys(this.contentService.upDatedContent || {}).length ||
  //       Object.keys(this.storeService.changedHierarchy).length

  //     console.log('updatedMeta  ', updatedMeta)
  //     console.log('originalData  ', originalData)
  //     console.log('needSave ', needSave)

  //     if (body.operation) {
  //       if (originalData && originalData.children && updatedMeta.children.length > 0) {
  //         for (const element of originalData.children) {
  //           console.log('Takeaction course 222222', element.identifier, element.status, updatedMeta.status)
  //           await this.editorService.sendToReview(element.identifier, element.status, updatedMeta.status).subscribe(() => {
  //             flag += 1
  //             if (updatedMeta.children.length === flag) {
  //               console.log('IFG flag')
  //               this.finalSaveAndRedirect(needSave, updatedMeta, body)
  //             }
  //           })
  //         }
  //       }
  //     } else {
  //       console.log('ELSE Final call')
  //       // this.changeStatusToDraft(body.comment)
  //     }

  //     // const saveCall = (needSave ? this.triggerSave() : of({} as any)).pipe(
  //     //   mergeMap(() =>
  //     //     this.editorService
  //     //       .forwardBackward(
  //     //         body,
  //     //         this.currentParentId,
  //     //         this.contentService.originalContent[this.currentParentId].status,
  //     //       )
  //     //       .pipe(
  //     //         mergeMap(() =>
  //     //           this.notificationSvc
  //     //             .triggerPushPullNotification(
  //     //               updatedMeta,
  //     //               body.comment,
  //     //               body.operation ? true : false,
  //     //             )
  //     //             .pipe(
  //     //               catchError(() => {
  //     //                 return of({} as any)
  //     //               }),
  //     //             ),
  //     //         ),
  //     //       ),
  //     //   ),
  //     // )

  //   }
  // }


  /**
   * Last changed
   */
  // async finalCall(commentsForm: FormGroup) {
  //   let flag = 0
  //   const resourceListToReview: any = []
  //   const moduleListToReview: any = []
  //   if (commentsForm) {
  //     const body: NSApiRequest.IForwardBackwardActionGeneral = {
  //       comment: commentsForm.controls.comments.value,
  //       operation:
  //         commentsForm.controls.action.value === 'accept' ||
  //           ['Draft', 'Live'].includes(
  //             this.contentService.originalContent[this.currentParentId].status,
  //           )
  //           ? 1
  //           : 0,
  //     }
  //     const updatedMeta = this.contentService.getUpdatedMeta(this.currentParentId)
  //     const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
  //     const needSave =
  //       Object.keys(this.contentService.upDatedContent || { }).length ||
  //       Object.keys(this.storeService.changedHierarchy).length

  //     // console.log('body ', body)
  //     // console.log('updatedMeta ', updatedMeta)
  //     // console.log('originalData ', originalData)

  //     // console.log('this.contentService.upDatedContent ', this.contentService.upDatedContent)
  //     // console.log('this.storeService.changedHierarchy ', this.storeService.changedHierarchy)
  //     // console.log('needSave ', needSave)

  //     if (body.operation) {
  //       if (originalData && originalData.children && updatedMeta.children.length > 0) {
  //         for (const element of originalData.children) {
  //           if (element.contentType === 'Collection') {
  //             if (element.children.length > 0) {
  //               element.children.forEach((subElement: any) => {
  //                 const tempChildData = {
  //                   identifier: subElement.identifier,
  //                   status: subElement.status,
  //                   parentStatus: updatedMeta.status,
  //                 }
  //                 resourceListToReview.push(tempChildData)
  //               })
  //             }
  //             const tempParentData = {
  //               identifier: element.identifier,
  //               status: element.status,
  //               parentStatus: updatedMeta.status,
  //             }
  //             moduleListToReview.push(tempParentData)

  //           } else {
  //             const tempData = {
  //               identifier: element.identifier,
  //               status: element.status,
  //               parentStatus: updatedMeta.status,
  //             }
  //             resourceListToReview.push(tempData)
  //           }
  //         }

  //         // console.log('resourceListToReview ', resourceListToReview)
  //         // console.log('moduleListToReview ', moduleListToReview)

  //         if (resourceListToReview.length > 0) {
  //           for await (const element of resourceListToReview) {
  //             if ((element.status === 'Live' || element.status === 'Review') && updatedMeta.status === 'Draft') {
  //               flag += 1
  //             } else if ((element.status === 'Live') && updatedMeta.status === 'Review') {
  //               flag += 1
  //             } else {
  //               const tempRes = await this.editorService.sendToReview(element.identifier, element.status, updatedMeta.status).toPromise()
  //               if (tempRes && tempRes.params && tempRes.params.status) {
  //                 flag += 1
  //               }
  //             }
  //           }
  //           if (resourceListToReview.length === flag && moduleListToReview.length > 0) {
  //             const tempRequset: NSApiRequest.IContentUpdateV3 = {
  //               request: {
  //                 data: {
  //                   nodesModified: { },
  //                   hierarchy: this.storeService.getTreeHierarchy(),
  //                 },
  //               },
  //             }
  //             if (updatedMeta.status === 'Draft') {
  //               console.log('3333 updateeeeeee')
  //               this.editorService.updateContentV4(tempRequset).subscribe(() => {
  //                 this.finalSaveAndRedirect(needSave, updatedMeta)
  //                 // this.sendModuleToReviewOrPublish(moduleListToReview, needSave, updatedMeta, body)
  //               })
  //             } else {
  //               this.finalSaveAndRedirect(needSave, updatedMeta)
  //             }
  //           } else if (resourceListToReview.length === flag) {
  //             this.finalSaveAndRedirect(needSave, updatedMeta)
  //           }
  //         }
  //       }
  //     } else {
  //       this.changeStatusToDraft(body.comment)
  //     }
  //   }
  // }



  async finalCall(contentActionTaken: any) {
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
          this.reviewerApproved(originalData, resourceListToReview)
        } else if (originalData.reviewStatus === 'Reviewed' && originalData.status === 'Review') {
          //this.contentPublish(originalData, resourceListToReview)
          this.contentPublish(resourceListToReview)
        } else if (resourceListToReview.length > 0) {
          this.loaderService.changeLoad.next(true)
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
                this.finalSaveAndRedirect(updatedMeta)
                // this.sendModuleToReviewOrPublish(moduleListToReview, updatedMeta)
              })
            } else {
              this.finalSaveAndRedirect(updatedMeta)
            }
          } else if (resourceListToReview.length === flag) {
            this.finalSaveAndRedirect(updatedMeta)
          } else {
            this.loaderService.changeLoad.next(false)
          }
        }
      }
    } else {
      this.changeStatusToDraft('Content Rejected')
    }
  }

  //async contentPublish(metaData: NSContent.IContentMeta, resourceList: any) {
  async contentPublish(resourceList: any) {
    this.loaderService.changeLoad.next(true)
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
        //   this.loaderService.changeLoad.next(false)
        //   this.snackBar.openFromComponent(NotificationComponent, {
        //     data: {
        //       type: Notify.SAVE_SUCCESS,
        //     },
        //     duration: NOTIFICATION_TIME * 1000,
        //   })
        //   await this.sendEmailNotification('publishCompleted')
        //   this.router.navigate(['author', 'cbp'])
        // } else {
        //   this.loaderService.changeLoad.next(false)
        //   this.snackBar.openFromComponent(NotificationComponent, {
        //     data: {
        //       type: Notify.SAVE_FAIL,
        //     },
        //     duration: NOTIFICATION_TIME * 1000,
        //   })
        // }
        const tempRequset: NSApiRequest.IContentUpdateV3 = {
          request: {
            data: {
              nodesModified: this.contentService.getNodeModifyData(),
              hierarchy: this.storeService.getTreeHierarchy(),
            },
          },
        }
        let result = await this.editorService.updateHierarchyForReviwer(tempRequset).toPromise().catch(_error => { })

        if (result.params.status === 'successful') {
          this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
            /* tslint:disable-next-line */
            console.log(data)
            this.contentService.resetOriginalMetaWithHierarchy(data)
            this.initService.publishData(data)
            // tslint:disable-next-line: align
          })
        }
        this.loaderService.changeLoad.next(false)

      } else {
        this.loaderService.changeLoad.next(false)
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

  async PublishCBP() {
    this.loaderService.changeLoad.next(true)
            const tempRequset: NSApiRequest.IContentUpdateV3 = {
          request: {
            data: {
              nodesModified: this.contentService.getNodeModifyData(),
              hierarchy: this.storeService.getTreeHierarchy(),
            },
          },
        }
        const updateHierarchyRes = await this.editorService.updateContentV4(tempRequset).toPromise().catch(_error => { })
        // tslint:disable-next-line:no-console
        console.log(updateHierarchyRes)
        // if (updateHierarchyRes && updateHierarchyRes.params && updateHierarchyRes.params.status === 'successful') {

    const url = this.router.url
    const id = url.split('/')
    const publishParentRes = await this.editorService.publishContent(id[3]).toPromise().catch(_error => { })
    if (publishParentRes && publishParentRes.params && publishParentRes.params.status === 'successful') {
      this.loaderService.changeLoad.next(false)
      this.dialog.closeAll()
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SAVE_SUCCESS,
        },
        duration: NOTIFICATION_TIME * 2000,
      })
      this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
        /* tslint:disable-next-line */
        console.log(data)
        // this.contentService.resetOriginalMetaWithHierarchy(data)
        // this.initService.publishData(data)
        // tslint:disable-next-line: align
      })
      await this.sendEmailNotification('publishCompleted')
      this.router.navigate(['author', 'cbp'])
    } else {
      this.loaderService.changeLoad.next(false)
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SAVE_FAIL,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
    }
  }

  async reviewerApproved(metaData: NSContent.IContentMeta, resourceList: any) {
    this.loaderService.changeLoad.next(true)
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
            await this.editorService.updateContentForReviwer(requestPayload, metaData.identifier).toPromise().catch(_error => { })
          if (parentMetaRes && parentMetaRes.params && parentMetaRes.params.status === 'successful') {
            this.loaderService.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_SUCCESS,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
            await this.sendEmailNotification('sendForPublish')
            this.router.navigate(['author', 'cbp'])
          } else {
            this.loaderService.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_FAIL,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          }
        } else {
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        }
      } else {
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      }
    }
  }

  // changeStatusToDraft(comment: string) {
  //   const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
  //   const updatedData: any = []
  //   originalData.children.forEach((ele: any) => {
  //     updatedData.push(ele)
  //   })
  //   updatedData.push(originalData)
  //   let flag = 0
  //   updatedData.forEach((element: any) => {
  //     const requestBody: any = {
  //       request: {
  //         content: {
  //           rejectComment: comment,
  //         },
  //       },
  //     }
  //     this.loaderService.changeLoad.next(true)
  //     this.editorService.rejectContentApi(requestBody, element.identifier).subscribe((resData: any) => {
  //       if (resData && resData.params.status === 'successful') {
  //         flag += 1
  //         if (flag === updatedData.length) {
  //           this.loaderService.changeLoad.next(false)
  //           this.snackBar.openFromComponent(NotificationComponent, {
  //             data: {
  //               type: Notify.SAVE_SUCCESS,
  //             },
  //             duration: NOTIFICATION_TIME * 1000,
  //           })
  //           this.router.navigate(['author', 'cbp'])
  //         } else {
  //           this.loaderService.changeLoad.next(false)
  //           this.snackBar.openFromComponent(NotificationComponent, {
  //             data: {
  //               type: Notify.SAVE_FAIL,
  //             },
  //             duration: NOTIFICATION_TIME * 1000,
  //           })
  //         }
  //       }
  //     },
  //       // tslint:disable-next-line: align
  //       _error => {
  //         this.loaderService.changeLoad.next(false)
  //         this.snackBar.openFromComponent(NotificationComponent, {
  //           data: {
  //             type: Notify.SAVE_FAIL,
  //           },
  //           duration: NOTIFICATION_TIME * 1000,
  //         })
  //       })
  //   })
  // }

  async editPublishCourse() {
    const originalData = await this.editorService.readcontentV3(this.contentService.parentContent).toPromise()

    const resourceListToReview: any = []
    const tempData = {
      identifier: originalData.identifier,
      status: originalData.status,
      versionKey: originalData.versionKey,
    }
    resourceListToReview.push(tempData)

    originalData.children.forEach((element: any) => {

      if (element.contentType === 'CourseUnit' || element.contentType === 'Collection') {
        if (element.children && element.children.length > 0) {
          element.children.forEach((subElement: any) => {
            const tempChildData = {
              identifier: subElement.identifier,
              status: subElement.status,
              versionKey: subElement.versionKey,
            }
            resourceListToReview.push(tempChildData)
          })
        }
      } else {
        const tempData = {
          identifier: element.identifier,
          status: element.status,
          versionKey: element.versionKey,
        }
        resourceListToReview.push(tempData)
      }
    })
    let flag = 0
    const updateContentReq: any = {
      request: {
        content: {
          versionKey: 0,
        },
      },
    }
    if (resourceListToReview.length > 0) {
      for await (const element of resourceListToReview) {
        this.loaderService.changeLoad.next(true)
        updateContentReq.request.content.versionKey = element.versionKey
        const updateContentRes =
          await this.editorService.updateNewContentV3(_.omit(updateContentReq, 'status'), element.identifier).toPromise().catch(_error => { })
        if (updateContentRes) {
          flag += 1
        } else {
          flag -= 1
        }
      }
      if (flag === resourceListToReview.length) {
        this.loaderService.changeLoad.next(false)
      } else {
        this.loaderService.changeLoad.next(false)
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

  async changeStatusToDraft(comment: string) {
    const originalData = this.contentService.getOriginalMeta(this.contentService.parentContent)
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
        this.loaderService.changeLoad.next(true)
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
              this.loaderService.changeLoad.next(false)
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
              this.router.navigate(['author', 'cbp'])
            } else {
              this.loaderService.changeLoad.next(false)
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.SAVE_FAIL,
                },
                duration: NOTIFICATION_TIME * 1000,
              })
            }
          } else {
            this.loaderService.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_FAIL,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          }
        } else {
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SAVE_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        }
      } else {
        this.loaderService.changeLoad.next(false)
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
            this.loaderService.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_SUCCESS,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
            this.router.navigate(['author', 'cbp'])
          } else {
            this.loaderService.changeLoad.next(false)
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
            this.loaderService.changeLoad.next(false)
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.SAVE_FAIL,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          })
      } else {
        this.loaderService.changeLoad.next(false)
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

  // sendModuleToReviewOrPublish(moduleList: any, needSave: any, updatedMeta: any) {
  //   let flag = 0
  //   moduleList.forEach(async (element: any) => {
  //     await this.editorService.sendToReview(element.identifier, element.status, element.parentStatus).subscribe(() => {
  //       flag += 1
  //       if (moduleList.length === flag) {
  //         this.finalSaveAndRedirect(needSave, updatedMeta)
  //       }
  //     })
  //   })
  // }

  sendModuleToReviewOrPublish(moduleList: any, updatedMeta: any) {
    let flag = 0
    moduleList.forEach(async (element: any) => {
      await this.editorService.sendToReview(element.identifier, element.parentStatus).subscribe(() => {
        flag += 1
        if (moduleList.length === flag) {
          this.finalSaveAndRedirect(updatedMeta)
        }
      })
    })
  }

  /**
   * Last changed
   */

  // finalSaveAndRedirect(needSave: any, updatedMeta: any) {
  //   // console.log('finalSaveAndRedirect Need save ', needSave, 'updatedMeta ', updatedMeta)
  //   // needSave = 0
  //   const saveCall = (needSave ? this.triggerSave() : of({ } as any)).pipe(
  //     mergeMap(() =>
  //       this.editorService
  //         .sendToReview(updatedMeta.identifier, updatedMeta.status, updatedMeta.status)
  //         .pipe(
  //           mergeMap(() => {
  //             // this.notificationSvc
  //             //   .triggerPushPullNotification(
  //             //     updatedMeta,
  //             //     body.comment,
  //             //     body.operation ? true : false,
  //             //   )
  //             // .pipe(
  //             //   catchError(() => {
  //             //     return of({} as any)
  //             //   }),
  //             // ),
  //             return of({ } as any)
  //           }
  //           ),
  //         ),
  //     ),
  //   )

  //   this.loaderService.changeLoad.next(true)
  //   saveCall.subscribe(
  //     () => {
  //       this.loaderService.changeLoad.next(false)
  //       this.snackBar.openFromComponent(NotificationComponent, {
  //         data: {
  //           type: this.getMessage('success'),
  //         },
  //         duration: NOTIFICATION_TIME * 1000,
  //       })
  //       this.contents = this.contents.filter(v => v.identifier !== this.currentParentId)
  //       if (this.contents.length) {
  //         this.contentService.changeActiveCont.next(this.contents[0].identifier)
  //       } else {
  //         this.router.navigate(['author', 'cbp'])
  //       }
  //     },
  //     (error: any) => {
  //       if (error.status === 409) {
  //         const errorMap = new Map<string, NSContent.IContentMeta>()
  //         Object.keys(this.contentService.originalContent).forEach(v =>
  //           errorMap.set(v, this.contentService.originalContent[v]),
  //         )
  //         const dialog = this.dialog.open(ErrorParserComponent, {
  //           width: '80vw',
  //           height: '90vh',
  //           data: {
  //             errorFromBackendData: error.error,
  //             dataMapping: errorMap,
  //           },
  //         })
  //         dialog.afterClosed().subscribe(v => {
  //           if (v) {
  //             if (typeof v === 'string') {
  //               this.storeService.selectedNodeChange.next(
  //                 (this.storeService.lexIdMap.get(v) as number[])[0],
  //               )
  //               this.contentService.changeActiveCont.next(v)
  //             } else {
  //               this.storeService.selectedNodeChange.next(v)
  //               this.contentService.changeActiveCont.next(
  //                 this.storeService.uniqueIdMap.get(v) as string,
  //               )
  //             }
  //           }
  //         })
  //       }
  //       this.loaderService.changeLoad.next(false)
  //       this.snackBar.openFromComponent(NotificationComponent, {
  //         data: {
  //           type: this.getMessage('failure'),
  //         },
  //         duration: NOTIFICATION_TIME * 1000,
  //       })
  //     },
  //   )

  // }


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
    this.loaderService.changeLoad.next(true)
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
          this.loaderService.changeLoad.next(false)
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
            this.router.navigate(['author', 'cbp'])
          }
        } else {
          this.loaderService.changeLoad.next(false)
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
          })
        }
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: this.getMessage('failure'),
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }
  preview(id: string) {
    const updatedContent = this.contentService.upDatedContent || {}
    let isContentUpdated = false
    _.each(updatedContent, i => { if (Object.keys(i).length > 0) { isContentUpdated = true } })

    // const saveCall =
    //   Object.keys(updatedContent).length || Object.keys(this.storeService.changedHierarchy).length
    //     ? this.triggerSave()
    //     : of({ } as any)
    const saveCall =
      (isContentUpdated || Object.keys(this.storeService.changedHierarchy).length) && this.checkForEmptyData
        ? this.triggerSave()
        : of({} as any)


    this.loaderService.changeLoad.next(true)
    saveCall.subscribe(
      () => {
        this.mimeTypeRoute = VIEWER_ROUTE_FROM_MIME(
          this.contentService.getUpdatedMeta(id).mimeType as any,
        )
        this.loaderService.changeLoad.next(false)
        // this.previewIdentifier = id
        this.loaderService.changeLoad.next(false)
        const url = `author/viewer/${this.mimeTypeRoute}/${id}?collectionId=${this.courseId}&collectionType=Course`
        this.router.navigateByUrl(url)
      },
      error => {
        if (error.status === 409) {
          const errorMap = new Map<string, NSContent.IContentMeta>()
          Object.keys(this.contentService.originalContent).forEach(v =>
            errorMap.set(v, this.contentService.originalContent[v]),
          )
          const dialog = this.dialog.open(ErrorParserComponent, {
            width: '750px',
            height: '450px',
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
          })
        }
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SAVE_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  closePreview() {
    this.previewIdentifier = null
  }

  // triggerSave() {

  //   const nodesModified: any = {}
  //   let isRootPresent = false
  //   Object.keys(this.contentService.upDatedContent).forEach(v => {
  //     if (!isRootPresent) {
  //       isRootPresent = this.storeService.parentNode.includes(v)
  //     }
  //     nodesModified[v] = {
  //       isNew: false,
  //       root: this.storeService.parentNode.includes(v),
  //       metadata: this.contentService.upDatedContent[v],
  //     }
  //   })
  //   if (!isRootPresent) {
  //     nodesModified[this.currentParentId] = {
  //       isNew: false,
  //       root: true,
  //       metadata: {},
  //     }
  //   }
  //   const requestBody: NSApiRequest.IContentUpdate = {
  //     nodesModified,
  //     hierarchy: this.storeService.changedHierarchy,
  //   }
  //   console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBody, this.storeService.changedHierarchy)

  //   return this.editorService.updateContentV2(requestBody).pipe(
  //     tap(() => {
  //       this.storeService.changedHierarchy = {}
  //       Object.keys(this.contentService.upDatedContent).forEach(id => {
  //         this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //       })
  //       this.contentService.upDatedContent = {}
  //       // window.location.reload()
  //     }),
  //   )
  // }

  // triggerSave() {
  //   const nodesModified: any = {}
  //   let isRootPresent = false
  //   console.log('TTTTTTTTTTTTTTTTTTT ', this.contentService.upDatedContent)

  //   // let isRootPresent = (parentNode && parentNode.identifier) ? true : false
  //   Object.keys(this.contentService.upDatedContent).forEach(v => {
  //     console.log('AAAAAAAAAA STORE SERVICE ', v, this.storeService.parentNode.includes(v))
  //     if (!isRootPresent) {
  //       isRootPresent = this.storeService.parentNode.includes(v)
  //     }
  //     nodesModified[v] = {
  //       isNew: false,
  //       root: this.storeService.parentNode.includes(v),
  //       metadata: this.contentService.upDatedContent[v],
  //     }
  //   })
  //   if (!isRootPresent) {
  //     nodesModified[this.currentParentId] = {
  //       isNew: false,
  //       root: true,
  //       metadata: {},
  //     }
  //   }
  //   // const requestBody: NSApiRequest.IContentUpdate = {
  //   //   nodesModified,
  //   //   hierarchy: this.storeService.changedHierarchy,
  //   // }

  //   const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
  //     request: {
  //       data: {
  //         nodesModified,
  //         hierarchy: this.storeService.changedHierarchy,
  //       },
  //     },
  //   }
  //   console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBodyV2)
  //   console.log('this.contentService.upDatedContent ', this.contentService.upDatedContent)
  //   console.log('nodesModified ', nodesModified)

  //   // if (Object.keys(this.contentService.upDatedContent).length > 0 && nodesModified[this.contentService.currentContent]) {
  //   if (Object.keys(this.contentService.upDatedContent)[0] && nodesModified[Object.keys(this.contentService.upDatedContent)[0]]) {
  //     const requestBody: NSApiRequest.IContentUpdateV2 = {
  //       request: {
  //         content: nodesModified[this.contentService.currentContent].metadata,
  //       },
  //     }
  //     requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)
  //     if (requestBody.request.content.duration) {
  //       requestBody.request.content.duration =
  //         (isNumber(requestBody.request.content.duration)
  //           ? `${requestBody.request.content.duration}` : requestBody.request.content.duration)
  //     }
  //     // if (requestBody.request.content.trackContacts && requestBody.request.content.trackContacts.length > 0) {
  //     //   requestBody.request.content.reviewer = ''
  //     //   requestBody.request.content.trackContacts.forEach((element, index) => {
  //     //     if (index === 0) {
  //     //       requestBody.request.content.reviewer = requestBody.request.content.reviewer + element.id
  //     //     } else {
  //     //       /* tslint:disable */
  //     //       requestBody.request.content.reviewer = requestBody.request.content.reviewer + ', ' + element.id
  //     //     }
  //     //   })
  //     //   delete requestBody.request.content.trackContacts
  //     // }

  //     if (requestBody.request.content.category) {
  //       delete requestBody.request.content.category
  //     }
  //     console.log('requestBody updateContentV3', requestBody)
  //     return this.editorService.updateContentV3(requestBody, this.contentService.currentContent).pipe(
  //       tap(() => {
  //         console.log('SUCCESS RESPONSE')
  //         this.storeService.changedHierarchy = {}
  //         Object.keys(this.contentService.upDatedContent).forEach(id => {
  //           this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //           // this.editorService.readContentV2(id).subscribe(resData => {
  //           //   this.editorStore.resetVersionKey(resData.versionKey, resData.identifier)
  //           // })
  //         })
  //         this.contentService.upDatedContent = {}
  //       }),
  //     )

  //   }

  //   console.log('updateContentV4  COURSE COLL')
  //   return this.editorService.updateContentV4(requestBodyV2).pipe(
  //     tap(() => {
  //       this.storeService.changedHierarchy = {}
  //       Object.keys(this.contentService.upDatedContent).forEach(async id => {
  //         this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //       })
  //       this.contentService.upDatedContent = {}
  //     }),
  //   )

  //   // return this.editorService.updateContentV2(requestBody).pipe(
  //   //   tap(() => {
  //   //     this.storeService.changedHierarchy = {}
  //   //     Object.keys(this.contentService.upDatedContent).forEach(id => {
  //   //       this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //   //     })
  //   //     this.contentService.upDatedContent = {}
  //   //     // window.location.reload()
  //   //   }),
  //   // )
  // }

  // triggerSave1() {
  //   const nodesModified: any = {}
  //   let isRootPresent = false
  //   // console.log('TTTTTTTTTTTTTTTTTTT ', this.contentService.upDatedContent)

  //   // console.log(Object.keys(this.storeService.changedHierarchy).length === 0)

  //   if (Object.keys(this.storeService.changedHierarchy).length === 0) {  // changedHierarchy is empty == Edit update
  //     Object.keys(this.contentService.upDatedContent).forEach(v => {
  //       // console.log('AAAAAAAAAA STORE SERVICE ', v, this.storeService.parentNode.includes(v))
  //       if (!isRootPresent) {
  //         isRootPresent = this.storeService.parentNode.includes(v)
  //       }
  //       nodesModified[v] = {
  //         isNew: false,
  //         root: this.storeService.parentNode.includes(v),
  //         metadata: this.contentService.upDatedContent[v],
  //       }
  //     })
  //     if (!isRootPresent) {
  //       nodesModified[this.currentContent] = {
  //         isNew: false,
  //         root: true,
  //         metadata: {},
  //       }
  //     }
  //     if (Object.keys(this.contentService.upDatedContent)[0] && nodesModified[Object.keys(this.contentService.upDatedContent)[0]]) {
  //       const requestBody: NSApiRequest.IContentUpdateV2 = {
  //         request: {
  //           content: nodesModified[Object.keys(this.contentService.upDatedContent)[0]].metadata,
  //         },
  //       }
  //       requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)
  //       if (requestBody.request.content.duration) {
  //         requestBody.request.content.duration =
  //           (isNumber(requestBody.request.content.duration)
  //             ? `${requestBody.request.content.duration}` : requestBody.request.content.duration)
  //       }

  //       if (requestBody.request.content.category) {
  //         delete requestBody.request.content.category
  //       }
  //       // console.log('requestBody updateContentV3', requestBody)
  //       return this.editorService.updateContentV3(requestBody, this.contentService.currentContent).pipe(
  //         tap(() => {
  //           // console.log('SUCCESS RESPONSE')
  //           this.storeService.changedHierarchy = {}
  //           Object.keys(this.contentService.upDatedContent).forEach(id => {
  //             this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //             this.editorService.readContentV2(id).subscribe(resData => {
  //               this.contentService.resetVersionKey(resData.versionKey, resData.identifier)
  //             })
  //           })
  //           this.contentService.upDatedContent = {}
  //         }),
  //       )

  //     }

  //   }
  //   // else {  // this.storeService.changedHierarchy is empty == Create update

  //   //   const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
  //   //     request: {
  //   //       data: {
  //   //         nodesModified,
  //   //         hierarchy: this.storeService.changedHierarchy,
  //   //       },
  //   //     },
  //   //   }
  //   //   console.log('parentNodeId  ', this.parentNodeId, 'currentParentId  ', this.currentParentId)
  //   //   let childArr: any[] = []
  //   //   let hierarchyOb = this.storeService.changedHierarchy
  //   //   this.storeService.changedHierarchy[this.currentParentId]['children'].forEach((e: any) => {
  //   //     childArr.push(e.identifier)
  //   //   })
  //   //   hierarchyOb[this.currentParentId]['children'] = childArr

  //   //   console.log('------ ', hierarchyOb)

  //   //   console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBodyV2)

  //   //   const requestBodyV22: NSApiRequest.IContentUpdateV3 = {
  //   //     request: {
  //   //       data: {
  //   //         nodesModified,
  //   //         hierarchy: hierarchyOb,
  //   //       },
  //   //     },
  //   //   }

  //   //   console.log('updateContentV4  COURSE COLL')
  //   //   return this.editorService.updateContentV4(requestBodyV22).pipe(
  //   //     tap(() => {
  //   //       this.storeService.changedHierarchy = {}
  //   //       Object.keys(this.contentService.upDatedContent).forEach(async id => {
  //   //         this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //   //       })
  //   //       this.contentService.upDatedContent = {}
  //   //     }),
  //   //   )
  //   // }

  //   // const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
  //   //   request: {
  //   //     data: {
  //   //       nodesModified,
  //   //       hierarchy: this.storeService.changedHierarchy,
  //   //     },
  //   //   },
  //   // }
  //   // console.log('parentNodeId  ', this.parentNodeId, 'currentParentId  ', this.currentParentId)
  //   const childArr: any[] = []
  //   const hierarchyOb = this.storeService.changedHierarchy
  //   this.storeService.changedHierarchy[this.currentParentId]['children'].forEach((e: any) => {
  //     childArr.push(e.identifier)
  //   })
  //   hierarchyOb[this.currentParentId]['children'] = childArr
  //   // console.log('------ ', hierarchyOb)
  //   // console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBodyV2)

  //   const requestBodyV22: NSApiRequest.IContentUpdateV3 = {
  //     request: {
  //       data: {
  //         nodesModified,
  //         hierarchy: hierarchyOb,
  //       },
  //     },
  //   }
  //   // console.log('updateContentV4  COURSE COLL')
  //   return this.editorService.updateContentV4(requestBodyV22).pipe(
  //     tap(() => {
  //       this.storeService.changedHierarchy = {}
  //       Object.keys(this.contentService.upDatedContent).forEach(async id => {
  //         this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //       })
  //       this.contentService.upDatedContent = {}
  //     }),
  //   )

  //   // const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
  //   //   request: {
  //   //     data: {
  //   //       nodesModified,
  //   //       hierarchy: this.storeService.changedHierarchy,
  //   //     },
  //   //   },
  //   // }
  //   // console.log('parentNodeId  ', this.parentNodeId, 'currentParentId  ', this.currentParentId)
  //   // let childArr: any[] = []
  //   // let hierarchyOb = this.storeService.changedHierarchy
  //   // this.storeService.changedHierarchy[this.currentParentId]['children'].forEach((e: any) => {
  //   //   childArr.push(e.identifier)
  //   // })
  //   // hierarchyOb[this.currentParentId]['children'] = childArr

  //   // console.log('------ ', hierarchyOb)
  //   // console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBodyV2)
  //   // const requestBodyV22: NSApiRequest.IContentUpdateV3 = {
  //   //   request: {
  //   //     data: {
  //   //       nodesModified,
  //   //       hierarchy: hierarchyOb,
  //   //     },
  //   //   },
  //   // }

  //   // console.log('updateContentV4  COURSE COLL')
  //   // return this.editorService.updateContentV4(requestBodyV22).pipe(
  //   //   tap(() => {
  //   //     this.storeService.changedHierarchy = {}
  //   //     Object.keys(this.contentService.upDatedContent).forEach(async id => {
  //   //       this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //   //     })
  //   //     this.contentService.upDatedContent = {}
  //   //   }),
  //   // )

  // }

  // triggerSave2() {

  //   const nodesModified: any = {}
  //   let isRootPresent = false

  //   // console.log('TTTTTTTTTTTTTTTTTTT ', this.contentService.upDatedContent)
  //   // console.log('@@@@@@@  ', this.contentService.currentContent)

  //   Object.keys(this.contentService.upDatedContent).forEach(v => {
  //     if (!isRootPresent) {
  //       isRootPresent = this.storeService.parentNode.includes(v)
  //     }
  //     nodesModified[v] = {
  //       isNew: false,
  //       root: this.storeService.parentNode.includes(v),
  //       metadata: this.contentService.upDatedContent[v],
  //     }
  //   })
  //   if (!isRootPresent) {
  //     nodesModified[this.currentParentId] = {
  //       isNew: false,
  //       root: true,
  //       metadata: {},
  //     }
  //   }

  //   // console.log('parentNodeId  ', this.parentNodeId, 'currentParentId  ', this.currentParentId)

  //   // let childArr: any[] = []
  //   // let hierarchyOb = this.storeService.changedHierarchy
  //   // if (Object.keys(hierarchyOb).length !== 0) {
  //   //   this.storeService.changedHierarchy[this.currentParentId]['children'].forEach((e: any) => {
  //   //     childArr.push(e.identifier)
  //   //   })
  //   //   hierarchyOb[this.currentParentId]['children'] = childArr
  //   // }

  //   const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
  //     request: {
  //       data: {
  //         nodesModified: {},
  //         hierarchy: this.storeService.changedHierarchy,
  //       },
  //     },
  //   }

  //   // console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBodyV2, this.storeService.changedHierarchy)
  //   if (Object.keys(this.storeService.changedHierarchy).length === 0) {
  //     if (Object.keys(this.contentService.upDatedContent)[0] && nodesModified[Object.keys(this.contentService.upDatedContent)[0]]) {
  //       const requestBody: NSApiRequest.IContentUpdateV2 = {
  //         request: {
  //           // content: nodesModified[Object.keys(this.contentService.upDatedContent)[0]].metadata,
  //           content: nodesModified[this.currentCourseId].metadata,
  //         },
  //       }
  //       requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)
  //       if (requestBody.request.content.duration) {
  //         // tslint:disable-next-line:max-line-length
  //         requestBody.request.content.duration =
  //           (isNumber(requestBody.request.content.duration) ?
  //             `${requestBody.request.content.duration}` :
  //             requestBody.request.content.duration)
  //       }
  //       if (requestBody.request.content.category) {
  //         delete requestBody.request.content.category
  //       }

  //       // console.log('UPDATE AUTH TABLE Parent ', requestBody)
  //       return this.editorService.updateContentV3(requestBody, this.currentCourseId).pipe(
  //         tap(() => {
  //           this.storeService.changedHierarchy = {}
  //           Object.keys(this.contentService.upDatedContent).forEach(id => {
  //             this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //             this.editorService.readContentV2(id).subscribe(resData => {
  //               this.contentService.resetVersionKey(resData.versionKey, resData.identifier)
  //             })
  //           })
  //           this.contentService.upDatedContent = {}
  //         }),
  //       )
  //     }
  //   }

  //   // console.log('updateContentV4  COURSE COLL')
  //   return this.editorService.updateContentV4(requestBodyV2).pipe(
  //     tap(() => {
  //       this.storeService.changedHierarchy = {}
  //       Object.keys(this.contentService.upDatedContent).forEach(async id => {
  //         this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
  //       })
  //       this.contentService.upDatedContent = {}
  //     }),
  //   )

  // }

  triggerSave() {

    const nodesModified: any = {}
    let isRootPresent = false

    // console.log('TTTTTTTTTTTTTTTTTTT ', this.contentService.upDatedContent)
    // console.log('@@@@@@@  ', this.contentService.currentContent)

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

    // console.log('parentNodeId  ', this.parentNodeId, 'currentParentId  ', this.currentParentId)


    // console.log('COURSE COLLECTION UPDFATEARERTAEA', requestBodyV2, this.storeService.changedHierarchy)

    // if (Object.keys(this.storeService.changedHierarchy).length === 0) {
    // if (Object.keys(this.contentService.upDatedContent).length > 0 && nodesModified[this.contentService.currentContent]) {

    if (Object.keys(this.contentService.upDatedContent).length > 0 && nodesModified[this.currentCourseId]) {
      let tempUpdateContent = this.contentService.upDatedContent[this.currentCourseId]
      let requestBody: NSApiRequest.IContentUpdateV2

      if (tempUpdateContent.category === 'CourseUnit' || tempUpdateContent.category === 'Collection') {
        tempUpdateContent.visibility = 'Parent'
        tempUpdateContent.versionKey = this.versionID === undefined ? this.versionKey.versionKey : this.versionID.versionKey
      } else {
        tempUpdateContent.versionKey = this.versionID === undefined ? this.versionKey.versionKey : this.versionID.versionKey
      }

      requestBody = {
        request: {
          content: tempUpdateContent,
        }
      }

      requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)

      if (requestBody.request.content.duration === 0 || requestBody.request.content.duration) {
        // tslint:disable-next-line:max-line-length
        requestBody.request.content.duration =
          // (isNumber(requestBody.request.content.duration) ?
          //   `${requestBody.request.content.duration}` :
          //   requestBody.request.content.duration)
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

      this.contentService.currentContentData = requestBody.request.content
      this.contentService.currentContentID = this.currentCourseId

      //let nodesModified = {}
      if (tempUpdateContent.category === 'Resource') {
        return this.editorService.updateNewContentV3(requestBody, this.currentCourseId).pipe(
          tap(() => {
            // this.storeService.getHierarchyTreeStructure()
            // Object.keys(this.contentService.upDatedContent).forEach(v => {
            //   nodesModified = {
            //     [v]: {
            //       isNew: false,
            //       objectType: "Content",
            //       root: this.storeService.parentNode.includes(v),
            //       metadata: _.omit(requestBody.request.content, ['versionKey', 'status'])
            //     }
            //   }
            // })
            // modifydata(data) {
            //   let filtered = {}
            //   for (const key in data) {
            //     if (key !== 'visibility' && key !== 'versionKey') {
            //       filtered[key] = data[key]
            //     }
            //     console.log(filtered)
            //     return filtered
            //   }
            // }
            this.storeService.changedHierarchy = {}
            Object.keys(this.contentService.upDatedContent).forEach(id => {
              this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
              // this.editorService.readContentV2(id).subscribe(resData => {
              //   this.contentService.resetVersionKey(resData.versionKey, resData.identifier)
              // })
            })
            this.contentService.upDatedContent = {}
          }),
          tap(async () => {
            // const tempRequset: NSApiRequest.IContentUpdateV3 = {
            //   request: {
            //     data: {
            //       nodesModified: this.contentService.getNodeModifyData(),
            //       hierarchy: this.storeService.getTreeHierarchy(),
            //     },
            //   },
            // }
            //await this.editorService.updateContentV4(tempRequset).subscribe(() => {
            await this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
              this.contentService.resetOriginalMetaWithHierarchy(data)
              // tslint:disable-next-line: align
            })
            //})
            // await this.contentSvc.fetchAuthoringContentHierarchy(this.currentCourseId).subscribe((data) => {
            //   console.log('datatata =======  ', data)
            // })
          })
        )
      } else {
        // Object.keys(this.contentService.upDatedContent).forEach(v => {
        //           nodesModified = {
        //             [v]: {
        //               isNew: false,
        //               objectType: "Content",
        //               root: this.storeService.parentNode.includes(v),
        //               metadata: _.omit(requestBody.request.content, ['versionKey', 'status', 'isIframeSupported'])
        //             }
        //           }
        //         })
        //           console.log(nodesModified)
        //           console.log((Object.keys(nodesModified)[0]))
        //           console.log(nodesModified[Object.keys(nodesModified)[0]])
        //           Object.keys(this.contentService.getNodeModifyData()).forEach((ele: any) => {
        //             console.log(ele)
        //             if(ele === Object.keys(nodesModified)[0]) {

        //             }
        //           })
            const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.contentService.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }
            if (this.storeService.createdModuleUpdate === false) {
      return this.editorService.updateContentV4(requestBodyV2).pipe(
        tap(() => {
          this.storeService.changedHierarchy = {}
          Object.keys(this.contentService.upDatedContent).forEach(async id => {
            this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
          })
          this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
            this.contentService.resetOriginalMetaWithHierarchy(data)
          })
          this.contentService.upDatedContent = {}
        }),
      )
    }

      }

      /**--------------------end------------------ */




      //  return this.editorService.updateContentV3(requestBody, this.currentCourseId).pipe(
      //     tap(() => {
      //       this.storeService.changedHierarchy = {}
      //       // Object.keys(this.contentService.upDatedContent).forEach(id => {
      //         console.log('this.contentService.upDatedContent === ', this.contentService.upDatedContent[this.currentCourseId])
      //         this.contentService.resetOriginalMeta(this.contentService.upDatedContent[this.currentCourseId], this.currentCourseId)
      //         this.editorService.readContentV2(this.currentCourseId).subscribe(resData => {
      //           this.contentService.resetVersionKey(resData.versionKey, resData.identifier)
      //         })
      //       // })
      //       // this.contentService.upDatedContent[this.currentCourseId] = {}
      //     }),
      //   )

    }
    // }


    // console.log('updateContentV4  COURSE COLL')
const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.contentService.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }

            //if (this.storeService.createdModuleUpdate === false) {
      return this.editorService.updateContentV6(requestBodyV2, this.storeService.createdModuleUpdate).pipe(
        tap(() => {

          this.storeService.changedHierarchy = {}
          Object.keys(this.contentService.upDatedContent).forEach(async id => {
            this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
          })
          // this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
          //   this.contentService.resetOriginalMetaWithHierarchy(data)
          // })
          this.contentService.upDatedContent = {}
        }),
      )
      //     return this.editorService.readcontentV3(this.contentService.parentContent).pipe(
      //   tap(() => {
      //     console.log("ll")
      //     this.storeService.changedHierarchy = {}
      //     Object.keys(this.contentService.upDatedContent).forEach(async id => {
      //       this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
      //     })
      //     this.editorService.readcontentV3(this.contentService.parentContent).subscribe((data: any) => {
      //       this.contentService.resetOriginalMetaWithHierarchy(data)
      //     })
      //     this.contentService.upDatedContent = {}
      //   })
      // )
    
  }
  update(){
    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.contentService.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }

      return this.editorService.updateContentV6(requestBodyV2, this.storeService.createdModuleUpdate).pipe(
        tap(() => {
          this.storeService.changedHierarchy = {}
          Object.keys(this.contentService.upDatedContent).forEach(async id => {
            this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
          })
          this.contentService.upDatedContent = {}
        }),
      )
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

  subAction(event: { type: string; identifier: string, nodeClicked?: boolean }) {

    // const nodeClicked = event.nodeClicked
    this.contentService.changeActiveCont.next(event.identifier)
    switch (event.type) {
      case 'editMeta':
        this.viewMode = 'meta'
        break
      case 'editContent':
        if (event.nodeClicked === false) {
          this.tempSave()
        }
        this.update()
        // const url = this.router.url
        // const id = url.split('/')
        //  this.editorService.contentRead(id[3])
        //    //this.editorService.readcontentV3(id[3])
        //      .subscribe((res: any) => {
        //        console.log(res)
        //        if(res.params.status === 'successful') {
        //          console.log(res)
        //          this.editPublishCourse('editPublishCourse')
        //        }
        //      }, error => {
        //        if (error) {
        //          console.log(error)
        //          //this.courseEdited = false
        //        }
        //      })
        const content = this.contentService.getUpdatedMeta(event.identifier)
        const isCreator = (this._configurationsService.userProfile
          && this._configurationsService.userProfile.userId === content.createdBy)
          ? true : false
        this.checkCreator = isCreator

        // if (['application/pdf', 'application/x-mpegURL'].includes(content.mimeType)) {
        //   this.viewMode = 'upload'
        // } else if (['video/x-youtube', 'application/html'].includes(content.mimeType) && content.fileType === 'link') {
        //   this.viewMode = 'curate'
        // } else if (content.mimeType === 'application/html') {
        //   this.viewMode = 'upload'
        // } else if (content.mimeType === 'application/quiz') {
        //   this.viewMode = 'assessment'
        // } else if (content.mimeType === 'application/web-module') {
        //   this.viewMode = 'webmodule'
        // }

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

        // this.save()
        // localStorage.setItem('afterClick', nodeClicked)
        // if (nodeClicked) {
        //   window.location.reload()
        // }
        // this.routerValuesCall()

        break
      case 'preview':
        this.preview(event.identifier)
        break
      case 'showAddChapter':
        this.showAddchapter = false
    }
  }

  action(type: string) {      // recheck
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
        this.save()
        break

      case 'saveAndNext':
        this.save('next')
        break

      case 'preview':
        this.preview(this.currentContent)
        break

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

      case 'delete':
        const dialog = this.dialog.open(DeleteDialogComponent, {
          width: '600px',
          height: 'auto',
          data: this.contentService.getUpdatedMeta(this.currentParentId),
        })
        dialog.afterClosed().subscribe(confirm => {
          if (confirm) {
            this.contents = this.contents.filter(v => v.identifier !== this.currentParentId)
            if (this.contents.length) {
              this.contentService.changeActiveCont.next(this.contents[0].identifier)
            } else {
              this.router.navigateByUrl('/author/home')
            }
          }
        })
        break

      case 'fullscreen':
        this.fullScreenToggle()
        break

      case 'close':
        this.router.navigateByUrl('/author/home')
        break

      case 'acceptConent':
        this.takeAction('acceptConent')
        break

      case 'rejectContent':
        this.takeAction('rejectContent')
        break
    }
  }

  delete() {
    this.loaderService.changeLoad.next(true)
    this.editorService.deleteContent(this.currentParentId).subscribe(
      () => {
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        this.contents = this.contents.filter(v => v.identifier !== this.currentParentId)
        if (this.contents.length) {
          this.contentService.changeActiveCont.next(this.contents[0].identifier)
        } else {
          this.router.navigateByUrl('/author/home')
        }
      },
      error => {
        if (error.status === 409) {
          const errorMap = new Map<string, NSContent.IContentMeta>()
          Object.keys(this.contentService.originalContent).forEach(v =>
            errorMap.set(v, this.contentService.originalContent[v]),
          )
          const dialog = this.dialog.open(ErrorParserComponent, {
            width: '750px',
            height: '450px',
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
          })
        }
        this.loaderService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  fullScreenToggle = () => {
    const doc: any = document
    const elm: any = doc.getElementById('auth-toc')
    if (elm.requestFullscreen) {
      !doc.fullscreenElement ? elm.requestFullscreen() : doc.exitFullscreen()
    } else if (elm.mozRequestFullScreen) {
      !doc.mozFullScreen ? elm.mozRequestFullScreen() : doc.mozCancelFullScreen()
    } else if (elm.msRequestFullscreen) {
      !doc.msFullscreenElement ? elm.msRequestFullscreen() : doc.msExitFullscreen()
    } else if (elm.webkitRequestFullscreen) {
      !doc.webkitIsFullscreen ? elm.webkitRequestFullscreen() : doc.webkitCancelFullscreen()
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

  canDelete() {
    return (
      this.accessControlSvc.hasRole(['editor', 'admin']) ||
      (['Draft', 'Live'].includes(
        this.contentService.originalContent[this.currentParentId].status,
      ) &&
        this.contentService.originalContent[this.currentParentId].creatorContacts.find(
          v => v.id === this.accessControlSvc.userId,
        ))
    )
  }

  get checkForEmptyData(): boolean {
    const updatedContent = this.contentService.upDatedContent || {}
    let nodesModified = {}
    let flag = false
    Object.keys(updatedContent).forEach(ele => {
      nodesModified = this.contentService.cleanProperties(updatedContent[ele])
    })
    if (Object.keys(nodesModified).length > 0) {
      if (Object.keys(nodesModified).length === 1) {
        Object.keys(nodesModified).forEach(subEle => {
          if (subEle === 'versionKey') {
            flag = false
          }
        })
      } else {
        flag = true
      }
    }
    return flag
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

  jsonVerify(s: string) { try { JSON.parse(s); return true } catch (e) { return false } }
}
