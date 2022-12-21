import { Component, OnInit } from '@angular/core'
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
import { CollectionStoreService } from '../../../services/store.service'
import { EditorService } from '../../../../../../services/editor.service'
import { EditorContentService } from '../../../../../../services/editor-content.service'
import { ActivatedRoute } from '@angular/router'
import { Subscription } from 'rxjs'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { CollectionResolverService } from '../../../services/resolver.service'
import { IContentNode } from '../../../interface/icontent-tree'
import _ from 'lodash'
import { HeaderServiceService } from '../../../../../../../../../../../../../../src/app/services/header-service.service'

@Component({
  selector: 'ws-author-module-creation',
  templateUrl: './module-creation.component.html',
  styleUrls: ['./module-creation.component.scss'],
  providers: [CollectionStoreService],
})
export class ModuleCreationComponent implements OnInit {
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
  moduleName: string = '';
  resourceNames: any = [];
  resourceCount: number = 0;
  independentResourceNames: any = [];
  independentResourceCount: number = 0;
  imageTypes = IMAGE_SUPPORT_TYPES
  bucket: string = ''
  currentContent!: string
  currentCourseId!: string
  viewMode!: string
  routerSubscription: Subscription | null = null
  courseName: any
  currentParentId!: string
  checkCreator: boolean = false;
  showAddchapter: boolean = false;
  versionID: any
  versionKey: any

  constructor(public dialog: MatDialog,
    private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private loader: LoaderService,
    private accessService: AccessControlService,
    private uploadService: UploadService,
    private http: HttpClient,
    private storeService: CollectionStoreService,
    private editorService: EditorService,
    private contentService: EditorContentService,
    private activateRoute: ActivatedRoute,
    private resolverService: CollectionResolverService,
    private headerService: HeaderServiceService,) {
    this.resourceForm = new FormGroup({
      resourceName: new FormControl(''),
      resourceLinks: new FormControl(''),
      appIcon: new FormControl('')
    })
    this.moduleForm = new FormGroup({
      topicName: new FormControl(''),
      topicDescription: new FormControl(null),
    })
  }

  ngOnInit() {
    this.routerValuesCall()
  }

  moduleCreate(name: string) {
    if (this.moduleButtonName == 'Create') {
      this.moduleName = name
      this.isSaveModuleFormEnable = true
      this.moduleButtonName = 'Save'
      this.setContentType('collection')
    } else if (this.moduleButtonName == 'Save') {
      this.isResourceTypeEnabled = true
    }
  }

  createResourseContent(name: string): void {
    if (name == 'Link') {
      this.isLinkFieldEnabled = true
    } else if (name == 'PDF') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/pdf-icon.svg'
    } else if (name == 'Audio') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/pdf-icon.svg'
    } else if (name == 'Vedio') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/vedio-img.svg'
    } else if (name == 'SCORM') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/SCROM-img.svg'
    }
    this.addResource()
    this.isLinkPageEnabled = true
    this.isResourceTypeEnabled = false
    this.isOnClickOfResourceTypeEnabled = true
  }

  addModule() {
    this.showAddModuleForm = true
    this.moduleNames.push({ name: 'Create Course' })
    this.moduleName = 'Create Course'
  }

  addResource() {
    this.resourceCount = this.resourceCount + 1
    this.resourceNames.push({ name: 'Resource ' + this.resourceCount })
  }

  addIndependentResource() {
    this.showAddModuleForm = true
    this.isResourceTypeEnabled = true
    this.independentResourceCount = this.independentResourceCount + 1
    this.independentResourceNames.push({ name: 'Resource ' + this.independentResourceCount })
  }

  changeToDefaultImg($event: any) {
    $event.target.src = this.configSvc.instanceConfig
      ? this.configSvc.instanceConfig.logos.defaultContent
      : ''
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
                        this.moduleForm.controls.appIcon.setValue(data.artifactUrl)
                        this.moduleForm.controls.thumbnail.setValue(data.artifactUrl)
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

  async setContentType(param: string) {
    let couseCreated
    if (this.moduleForm && this.moduleForm.value) {
      couseCreated = param
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
      this.loader.changeLoad.next(true)
      const isDone = await this.storeService.createChildOrSibling(
        couseCreated,
        parentNode,
        asSibling ? node.id : undefined,
        'below',
        this.moduleForm.value,
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
        // update the id
        this.contentService.currentContent = newCreatedLexid
        this.loader.changeLoad.next(false)
      }
    }
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
      })

      this.activateRoute.parent.url.subscribe(data => {
        const urlParam = data[0].path
        if (urlParam === 'collection') {
          this.headerService.showCreatorHeader(this.courseName)
        }

      })
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
        const content = this.contentService.getUpdatedMeta(event.identifier)
        const isCreator = (this.configSvc.userProfile
          && this.configSvc.userProfile.userId === content.createdBy)
          ? true : false
        this.checkCreator = isCreator

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
      case 'showAddChapter':
        this.showAddchapter = false
    }
  }

}
