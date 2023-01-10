import { Component, OnInit, AfterViewInit } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { ConfigurationsService, ImageCropComponent } from '@ws-widget/utils'
import { IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '@ws/author/src/lib/constants/upload'
import { MatSnackBar } from '@angular/material/snack-bar'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { LoaderService } from '../../../../../../../../../services/loader.service'
import { NSApiRequest } from '../../../../../../../../../interface/apiRequest'
import { AccessControlService } from '../../../../../../../../../modules/shared/services/access-control.service'
import { UploadService } from '../../../../../../shared/services/upload.service'
import { AUTHORING_BASE, CONTENT_BASE_STATIC } from '@ws/author/src/lib/constants/apiEndpoints'
import { HttpClient } from '@angular/common/http'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { EditorContentService } from 'project/ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { CollectionStoreService } from '../../../services/store.service'
import { ActivatedRoute } from '@angular/router'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { CollectionResolverService } from '../../../services/resolver.service'
import { IContentNode } from '../../../interface/icontent-tree'
import { HeaderServiceService } from '../../../../../../../../../../../../../../src/app/services/header-service.service'
import { isNumber } from 'lodash'
import { tap } from 'rxjs/operators'
/* tslint:disable */
import _ from 'lodash'
import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'

@Component({
  selector: 'ws-author-module-creation',
  templateUrl: './module-creation.component.html',
  styleUrls: ['./module-creation.component.scss'],
  providers: [CollectionStoreService, CollectionResolverService],
})
export class ModuleCreationComponent implements OnInit, AfterViewInit {
  contentList: any[] = [
    {
      name: 'Link',
      icon: 'link'

    },
    {
      name: 'PDF',
      icon: 'picture_as_pdf'
    },
    {
      name: 'Audio',
      icon: 'music_note'
    },
    {
      name: 'Video',
      icon: 'videocam'
    },
    {
      name: 'SCORM',
      icon: 'cloud_upload'
    }
  ]

  accessList: any[] = [
    {
      name: 'Assessment',
      icon: 'assessment'
    },
    {
      name: 'Quiz',
      icon: 'smartphone'
    }
  ]

  showAddModuleForm: boolean = false
  moduleNames: any = [];
  isSaveModuleFormEnable: boolean = false
  moduleButtonName: string = 'Create';
  isResourceTypeEnabled: boolean = false
  isLinkPageEnabled: boolean = false
  isOnClickOfResourceTypeEnabled: boolean = false;
  resourceForm: FormGroup
  moduleForm!: FormGroup
  resourceImg: string = '';
  isLinkFieldEnabled: boolean = false;
  openinnewtab: boolean = false
  moduleName: string = '';
  topicDescription: string = ''
  thumbnail: any
  resourceNames: any = [];
  resourceCount: number = 0;
  independentResourceNames: any = [];
  independentResourceCount: number = 0;
  imageTypes = IMAGE_SUPPORT_TYPES
  bucket: string = ''
  courseData: any
  isAssessmentOrQuizEnabled!: boolean
  assessmentOrQuizForm!: FormGroup
  questionTypes: any = ['MCQ', 'Fill in the blanks', 'Match the following']
  hours = 0
  minutes = 1
  resourceType: string = ''
  resourseSelected: string = ''
  currentContent!: string
  currentCourseId!: string
  viewMode!: string
  courseName: any
  currentParentId!: string
  versionID: any
  versionKey: any
  content: any
  constructor(public dialog: MatDialog,
    private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private loader: LoaderService,
    private accessService: AccessControlService,
    private uploadService: UploadService,
    private http: HttpClient,
    private initService: AuthInitService,
    private editorService: EditorService,
    private editorStore: EditorContentService,
    private storeService: CollectionStoreService,
    private activateRoute: ActivatedRoute,
    private resolverService: CollectionResolverService,
    private headerService: HeaderServiceService,
    private loaderService: LoaderService,
  ) {
    this.resourceForm = new FormGroup({
      resourceName: new FormControl(''),
      resourceLinks: new FormControl(''),
      appIcon: new FormControl(''),
      openinnewtab: new FormControl(false),
      duration: new FormControl('')
    })

    this.moduleForm = new FormGroup({
      appIcon: new FormControl('')
    })

    this.assessmentOrQuizForm = new FormGroup({
      resourceName: new FormControl(''),
    })
  }

  ngOnInit() {
    this.routerValuesCall()
  }
  ngAfterViewInit() {
    console.log('dd')
    this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
      console.log(data)
      this.courseData = data
      this.isSaveModuleFormEnable = true
      this.showAddModuleForm = true
      this.moduleName = data.name
      this.topicDescription = data.description
      this.thumbnail = data.thumbnail
      //this.isResourceTypeEnabled = true
      console.log(this.isSaveModuleFormEnable)
      //this.editorStore.resetOriginalMetaWithHierarchy(data)
    })
  }

  moduleCreate(name: string, input1: string, input2: string) {
    console.log(input1, input2)
    let obj: any = {}
    if (this.moduleButtonName == 'Create') {
      obj["type"] = 'collection'
      obj["name"] = input1
      obj["description"] = input2
      this.moduleName = name
      this.isSaveModuleFormEnable = true
      this.moduleButtonName = 'Save'
      this.initService.createModuleUnit(obj)
    } else if (this.moduleButtonName == 'Save') {
      this.isResourceTypeEnabled = true
    }
  }
  timeToSeconds() {
    let total = 0
    //total += this.seconds ? (this.seconds < 60 ? this.seconds : 59) : 0
    total += this.minutes ? (this.minutes < 60 ? this.minutes : 59) * 60 : 0
    total += this.hours ? this.hours * 60 * 60 : 0
    console.log(total)
    this.resourceForm.controls.duration.setValue(total)
  }

  async resourceTypeSave() {
    var res = this.resourceForm.value.resourceLinks.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g)
    if (res !== null) {
      const rBody: any = {
        name: this.resourceForm.value.resourceName,
        artifactUrl: this.resourceForm.value.resourceLinks,
        versionKey: this.versionKey.versionKey
      }
      await this.editorStore.setUpdatedMeta(rBody, this.currentContent)
      this.save()
    }
  }
  async createResourseContent(name: string): Promise<void> {
    this.resourceType = name
    if (name == 'Link') {
      this.isLinkFieldEnabled = true
      this.isAssessmentOrQuizEnabled = false
      this.independentResourceCount = this.independentResourceCount + 1
      this.independentResourceNames.push({ name: 'Resource ' + this.independentResourceCount })

      this.resourseSelected = 'web'
      let couseCreated = 'web'
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
        topicName: 'Resource 1'
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
        this.editorStore.currentContent = newCreatedLexid
        this.loaderService.changeLoad.next(false)
      }
      this.loaderService.changeLoad.next(false)
      this.subAction({ type: 'editContent', identifier: this.editorService.newCreatedLexid, nodeClicked: false })
      this.save()
    } else if (name == 'PDF') {
      this.isLinkFieldEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.resourceImg = 'cbp-assets/images/pdf-icon.svg'
    } else if (name == 'Audio') {
      this.isLinkFieldEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.resourceImg = 'cbp-assets/images/pdf-icon.svg'
    } else if (name == 'Vedio') {
      this.isLinkFieldEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.resourceImg = 'cbp-assets/images/vedio-img.svg'
    } else if (name == 'SCORM') {
      this.isLinkFieldEnabled = false
      this.isAssessmentOrQuizEnabled = false
      this.resourceImg = 'cbp-assets/images/SCROM-img.svg'
    } else if (name == 'Assessment') {
      this.isLinkFieldEnabled = false
      this.isAssessmentOrQuizEnabled = true
    }
    //this.addResource()
    this.isLinkPageEnabled = true
    this.isResourceTypeEnabled = false
    this.isOnClickOfResourceTypeEnabled = true
  }

  addModule() {
    this.showAddModuleForm = true
    this.moduleNames.push({ name: 'Create Course' })
    this.moduleName = ''
  }

  addResource() {
    this.resourceCount = this.resourceCount + 1
    this.resourceNames.push({ name: 'Resource ' + this.resourceCount })
  }

  addIndependentResource() {
    this.showAddModuleForm = true
    this.isResourceTypeEnabled = true
    // this.independentResourceCount = this.independentResourceCount + 1
    // this.independentResourceNames.push({ name: 'Resource ' + this.independentResourceCount })
  }

  changeToDefaultImg($event: any) {
    $event.target.src = this.configSvc.instanceConfig
      ? this.configSvc.instanceConfig.logos.defaultContent
      : ''
  }
  editContent(content: any) {
    console.log(content)
    this.moduleButtonName = 'Save'
    this.content = content
    this.moduleName = content.name
    this.topicDescription = content.description
    this.thumbnail = content.thumbnail
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
                language: ['English'],
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
                        this.editorStore.currentContentID = this.content.identifier
                        this.editorStore.setUpdatedMeta(meta, data.identifier)
                        console.log(meta)
                        requestBody = {
                          request: {
                            content: meta
                          }
                        }

                        // this.editorStore.setUpdatedMeta(meta, this.courseData.identifier)
                        //this.initService.uploadData('thumbnail')
                        this.editorService.updateNewContentV3(requestBody, data.identifier).subscribe(
                          (info: any) => {
                            console.log(info)
                            if (info) {
                              this.update()
                            }
                          })

                      }
                    })
              })
        }
      }
    })
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
    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: this.editorStore.getNodeModifyData(),
          hierarchy: this.storeService.getTreeHierarchy(),
        },
      },
    }
    await this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
      this.editorService.readcontentV3(this.editorStore.parentContent).subscribe((data: any) => {
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
        tempUpdateContent.versionKey = this.versionID === undefined ? this.versionKey.versionKey : this.versionID.versionKey
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

      if (tempUpdateContent.category === 'Resource' || tempUpdateContent.category === undefined || tempUpdateContent.category === 'Course') {
        return this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.currentCourseId).pipe(
          tap(() => {
            this.storeService.changedHierarchy = {}
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
        console.log(content)
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
          this.viewMode = 'assessment'
        } else if (content.mimeType === 'application/web-module') {
          this.viewMode = 'webmodule'
        } else {
          this.viewMode = 'meta'
        }
        break
    }
  }

}
