// import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { ValueService } from '@ws-widget/utils/src/public-api'
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  TemplateRef,
  OnChanges,
} from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { MatSnackBar } from '@angular/material'
import { MatDialog } from '@angular/material/dialog'
import {
  CONTENT_BASE_STATIC,
  CONTENT_BASE_STREAM,
  CONTENT_BASE_WEBHOST,
} from '@ws/author/src/lib/constants/apiEndpoints'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { VIDEO_MAX_SIZE } from '@ws/author/src/lib/constants/upload'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { IprDialogComponent } from '@ws/author/src/lib/modules/shared/components/ipr-dialog/ipr-dialog.component'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { EditorContentService } from '@ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { UploadService } from '@ws/author/src/lib/routing/modules/editor/shared/services/upload.service'
import { LoaderService } from '@ws/author/src/lib/services/loader.service'
import { of } from 'rxjs'
import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'
import { mergeMap, tap } from 'rxjs/operators'
import { IFormMeta } from './../../../../../../../../interface/form'
import { AuthInitService } from './../../../../../../../../services/init.service'
import { environment } from '../../../../../../../../../../../../../src/environments/environment'
import { ProfanityService } from '../../services/profanity.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { CollectionStoreService } from '../../../collection/services/store.service'
import { NSApiRequest } from '../../../../../../../../interface/apiRequest'

@Component({
  selector: 'ws-auth-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent implements OnInit, OnChanges {
  @ViewChild('guideline', { static: false }) guideline!: TemplateRef<HTMLElement>
  @ViewChild('errorFile', { static: false }) errorFile!: TemplateRef<HTMLElement>
  @ViewChild('selectFile', { static: false }) selectFile!: TemplateRef<HTMLElement>
  @Input() callSave = false
  fileUploadForm!: FormGroup
  iprAccepted = false
  file!: File | null
  mimeType = ''
  currentContent = ''
  enableUpload = true
  duration = '0'
  canUpdate = true
  fileUploadCondition = {
    fileName: false,
    eval: false,
    externalReference: false,
    iframe: false,
    isSubmitPressed: false,
    preview: false,
    url: '',
  }
  errorFileList: string[] = []
  fileList: string[] = []
  @Input() isCollectionEditor = false
  @Input() isSubmitPressed = false
  @Input() canTransCode = false
  isMobile = false
  @Output() data = new EventEmitter<any>()
  uploadedFileList: { [key: string]: File } = {}
  updatedIPRList: { [key: string]: boolean } = {}
  filetype!: string | null
  acceptType!: string | '.mp3,.mp4,.pdf,.zip,.m4v'
  entryPoint: any

  @Input() isCreatorEnable = true

  constructor(
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private contentService: EditorContentService,
    private uploadService: UploadService,
    private loaderService: LoaderService,
    private authInitService: AuthInitService,
    private valueSvc: ValueService,
    // private accessService: AccessControlService,
    private profanityService: ProfanityService,
    private editorService: EditorService,
    private storeService: CollectionStoreService,
  ) { }

  ngOnInit() {
    this.filetype = this.storeService.uploadFileTypeValue
    if (this.filetype === 'audio') {
      this.acceptType = '.mp3'
    }

    switch (this.filetype) {
      case 'audio':
        this.acceptType = '.mp3'
        break
      case 'video':
        this.acceptType = '.mp4, .m4v'
        break
      case 'pdf':
        this.acceptType = '.pdf'
        break
      case 'zip':
        this.acceptType = '.zip'
        break
      default:
        this.acceptType = '.mp3,.mp4,.pdf,.zip,.m4v'
    }
    this.valueSvc.isXSmall$.subscribe(isMobile => (this.isMobile = isMobile))
    this.currentContent = this.contentService.currentContent
    // this.triggerDataChange()
    this.createFileUploadForm()
    this.contentService.changeActiveCont.subscribe(data => {
      this.currentContent = data
      this.uploadedFileList = this.contentService.getListOfFiles()
      this.updatedIPRList = this.contentService.getListOfUpdatedIPR()
      this.iprAccepted = false
      this.triggerDataChange()
    })
  }

  createFileUploadForm() {
    this.fileUploadForm = this.formBuilder.group({
      artifactUrl: [],
      isExternal: [],
      // isIframeSupported: [],
      // isInIntranet: [],
      mimeType: [],
      size: [],
      duration: [],
      downloadUrl: [],
      transcoding: [],
      versionKey: [],
      streamingUrl: [],
      entryPoint: [],
    })
    this.fileUploadForm.valueChanges.subscribe(() => {
      if (this.canUpdate) {
        this.storeData()
      }
    })
    // this is commented as new UI is not comptable
    this.fileUploadForm.controls.artifactUrl.valueChanges.subscribe(() => {
      this.iprAccepted = false
    })
  }

  ngOnChanges() {
    if (this.callSave) {
      this.triggerUpload()
    }
  }
  triggerDataChange() {
    const updatedMeta = this.contentService.getUpdatedMeta(this.currentContent)
    if (
      !this.isCollectionEditor ||
      (this.isCollectionEditor && updatedMeta.category === 'Resource')
    ) {
      this.assignData(updatedMeta)
    }
  }

  selectEntryPoint(file: any) {
    this.entryPoint = '/' + `${file}`
  }

  assignData(meta: NSContent.IContentMeta) {
    if (!this.fileUploadForm) {
      this.createForm()
    }
    this.canUpdate = false
    this.fileUploadForm.controls.artifactUrl.setValue(meta.artifactUrl || '')
    this.fileUploadForm.controls.mimeType.setValue(meta.mimeType || 'application/pdf')
    this.mimeType = (meta.mimeType) ? meta.mimeType : ''
    // this.fileUploadForm.controls.isIframeSupported.setValue(meta.isIframeSupported || 'Yes')
    // this.fileUploadForm.controls.isInIntranet.setValue(meta.isInIntranet || false)
    this.fileUploadForm.controls.isExternal.setValue(meta.isExternal || false)
    this.fileUploadForm.controls.size.setValue(meta.size || 0)
    this.fileUploadForm.controls.duration.setValue(meta.duration || '0')
    this.fileUploadForm.controls.versionKey.setValue(meta.versionKey || '')
    this.fileUploadForm.controls.streamingUrl.setValue(meta.streamingUrl || '')
    this.fileUploadForm.controls.entryPoint.setValue(meta.entryPoint || '')

    this.canUpdate = true
    this.fileUploadForm.markAsPristine()
    this.fileUploadForm.markAsUntouched()

    if (meta.mimeType) {
      this.setAcceptType(meta.mimeType)
    }

    if (meta.artifactUrl) {
      this.iprAccepted = true
    }
  }

  setAcceptType(mimetype: string) {
    switch (mimetype) {
      case 'audio/mpeg':
        this.acceptType = '.mp3'
        break

      case 'video/mp4':
        this.acceptType = '.mp4, .m4v'
        break
      case 'application/pdf':
        this.acceptType = '.pdf'
        break
      case 'application/vnd.ekstep.html-archive':
        this.acceptType = '.zip'
        break
      default:
        this.acceptType = '.mp3,.mp4,.pdf,.zip,.m4v'
    }

  }

  createForm() {
    this.createFileUploadForm()
    this.fileUploadForm.valueChanges.subscribe(() => {
      if (this.canUpdate) {
        this.storeData()
      }
    })

    // this.fileUploadForm.controls.artifactUrl.valueChanges.subscribe(() => {
    //   this.iprAccepted = false
    // })
  }

  onDrop(file: File) {
    this.fileUploadCondition = {
      fileName: false,
      eval: false,
      externalReference: false,
      iframe: false,
      isSubmitPressed: false,
      preview: false,
      url: '',
    }
    const fileName = file.name.replace(/[^A-Za-z0-9_.]/g, '')
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
            this.assignFileValues(file, fileName)
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
            this.fileUploadCondition.externalReference
          ) {

            this.assignFileValues(file, fileName)
          }
        })
      } else {
        this.assignFileValues(file, fileName)
      }
    }
  }

  // assignFileValues(file: File, fileName: string) {
  //   this.contentService.updateListOfFiles(this.currentContent, file)
  //   this.contentService.updateListOfUpdatedIPR(this.currentContent, this.iprAccepted)

  //   this.file = file
  //   this.mimeType = fileName.toLowerCase().endsWith('.pdf')
  //     ? 'application/pdf'
  //     : (fileName.toLowerCase().endsWith('.mp4') || fileName.toLowerCase().endsWith('.m4v'))
  //       ? 'application/x-mpegURL'
  //       : fileName.toLowerCase().endsWith('.zip')
  //         ? 'application/html'
  //         : 'audio/mpeg'
  //   if (this.mimeType === 'application/x-mpegURL' || this.mimeType === 'audio/mpeg') {
  //     this.getDuration()
  //   } else if (this.mimeType === 'application/html') {
  //     this.extractFile()
  //   }
  // }

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

  }

  // From IGOT

  // assignFileValues(file: File, fileName: string) {
  //   const currentContentData = this.contentService.originalContent[this.currentContent]
  //   this.mimeType = fileName.toLowerCase().endsWith('.pdf')
  //     ? 'application/pdf'
  //     : fileName.toLowerCase().endsWith('.mp4')
  //       ? 'video/mp4'
  //       : fileName.toLowerCase().endsWith('.zip')
  //         ? 'application/vnd.ekstep.html-archive'
  //         : 'audio/mpeg'
  //   if (
  //     (currentContentData.status === 'Live' || currentContentData.prevStatus === 'Live')
  //     && this.mimeType !== currentContentData.mimeType
  //   ) {
  //     this.snackBar.openFromComponent(NotificationComponent, {
  //       data: {
  //         type: Notify.CANNOT_CHANGE_MIME_TYPE,
  //       },
  //       duration: NOTIFICATION_TIME * 1000,
  //     })
  //     this.fileUploadForm.controls.artifactUrl.setValue(currentContentData.artifactUrl)
  //     this.mimeType = currentContentData.mimeType
  //     this.iprChecked()
  //   } else {
  //     this.file = file
  //     if (this.mimeType === 'video/mp4' || this.mimeType === 'audio/mpeg') {
  //       this.getDuration()
  //     } else if (this.mimeType === 'application/vnd.ekstep.html-archive') {
  //       this.extractFile()
  //     }
  //   }
  // }

  showIpr() {
    const dialogRef = this.dialog.open(IprDialogComponent, {
      width: '70%',
      data: { iprAccept: this.iprAccepted },
    })
    dialogRef.afterClosed().subscribe(result => {
      this.iprAccepted = result
      this.contentService.updateListOfUpdatedIPR(this.currentContent, result)
    })
  }

  iprChecked() {
    this.iprAccepted = !this.iprAccepted
    this.contentService.updateListOfUpdatedIPR(this.currentContent, this.iprAccepted)
  }

  clearUploadedFile() {
    this.contentService.removeListOfFilesAndUpdatedIPR(this.currentContent)

    this.fileUploadForm.controls.artifactUrl.setValue(null)
    this.file = null
    this.duration = '0'
    this.mimeType = ''
  }

  // triggerUpload() {
  //   if (!this.file) {
  //     this.snackBar.openFromComponent(NotificationComponent, {
  //       data: {
  //         type: Notify.UPLOAD_FILE,
  //       },
  //       duration: NOTIFICATION_TIME * 1000,
  //     })
  //   } else {
  //     this.upload()
  //   }
  // }

  errorMessage() {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: {
        type: Notify.UPLOAD_FAIL,
      },
      duration: NOTIFICATION_TIME * 1000,
    })
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
      const tempUpdateContent = this.contentService.getOriginalMeta(this.currentContent)
      let requestBody: NSApiRequest.IContentUpdateV2

      if (tempUpdateContent.category === 'CourseUnit') {
        nodesModified.visibility = 'Parent'
      }

      requestBody = {
        request: {
          content: nodesModified[this.contentService.currentContent].metadata,
        },
      }

      requestBody.request.content = this.contentService.cleanProperties(requestBody.request.content)

      if (requestBody.request.content.category) {
        delete requestBody.request.content.category
      }

      const contenUpdateRes: any =
        await this.editorService.updateContentV3(requestBody, this.contentService.currentContent).toPromise().catch(_error => { })
      if (contenUpdateRes && contenUpdateRes.params && contenUpdateRes.params.status === 'successful') {
        const updateHierarchyReq: NSApiRequest.IContentUpdateV3 = {
          request: {
            data: {
              nodesModified: this.contentService.getNodeModifyData(),
              hierarchy: this.storeService.getTreeHierarchy(),
            },
          },
        }
        const updateHierarchyRes: any = await this.editorService.updateContentV4(updateHierarchyReq).toPromise().catch(_error => { })
        if (updateHierarchyRes && updateHierarchyRes.params && updateHierarchyRes.params.status === 'successful') {
          const hierarchyData = await this.editorService.readcontentV3(this.contentService.parentContent).toPromise().catch(_error => { })
          if (hierarchyData) {
            this.contentService.resetOriginalMetaWithHierarchy(hierarchyData)
            this.upload()
          } else {
            this.errorMessage()
          }
        } else {
          this.errorMessage()
        }
      } else {
        this.errorMessage()
      }
      // this.upload()
    }
  }

  // upload() {
  //   const formdata = new FormData()
  //   formdata.append(
  //     'content',
  //     this.file as Blob,
  //     (this.file as File).name.replace(/[^A-Za-z0-9_.]/g, ''),
  //   )
  //   this.loaderService.changeLoad.next(true)
  //   this.uploadService
  //     .upload(
  //       formdata,
  //       {
  //         contentId: this.currentContent,
  //         contentType:
  //           this.mimeType === 'application/pdf'
  //             ? CONTENT_BASE_STATIC
  //             : this.mimeType === 'application/html'
  //               ? CONTENT_BASE_WEBHOST
  //               : CONTENT_BASE_STREAM,
  //       },
  //       undefined,
  //       this.mimeType === 'application/html',
  //     )
  //     .pipe(
  //       tap(v => {
  //         this.canUpdate = false
  //         let url = ''
  //         if (this.mimeType === 'application/html') {
  //           // tslint:disable-next-line:max-line-length
  //           // url = `${document.location.origin}/content-store/${this.accessService.rootOrg}/${this.accessService.org}/
  //                            Public/${this.currentContent}/web-hosted/${this.fileUploadCondition.url}`
  //           url = `${environment.karmYogi}content-store/${this.accessService.rootOrg}/${this.accessService.org}/Public/
  //           ${this.currentContent}/web-hosted/${this.fileUploadCondition.url}`

  //         } else {
  //           // url = (v.authArtifactURL || v.artifactURL).replace(/%2F/g, '/')
  //           url = (v.result.artifactUrl).replace(/%2F/g, '/')
  //         }
  //         this.fileUploadForm.controls.artifactUrl.setValue(url)
  //         // this.fileUploadForm.controls.downloadUrl.setValue(v ? v.downloadURL : '')
  //         this.fileUploadForm.controls.mimeType.setValue(this.mimeType)

  //         this.fileUploadForm.controls.downloadUrl.setValue(v ? v.result.artifactUrl : '')
  //         if (this.mimeType === 'application/html' && this.file && this.file.name.toLowerCase().endsWith('.zip')) {
  //           this.fileUploadForm.controls.isExternal.setValue(false)
  //         }

  //         // if (this.mimeType === 'application/x-mpegURL') {
  //         //   this.fileUploadForm.controls.transcoding.setValue({
  //         //     lastTranscodedOn: null,
  //         //     retryCount: 0,
  //         //     status: 'STARTED',
  //         //   })
  //         // }

  //         this.fileUploadForm.controls.duration.setValue(this.duration)
  //         this.fileUploadForm.controls.size.setValue((this.file as File).size)
  //         this.canUpdate = true
  //       }),
  //       mergeMap(v => {
  //         // if (this.mimeType === 'application/x-mpegURL') {
  //         //   return this.uploadService
  //         //     .startEncoding(v.authArtifactURL || v.artifactURL, this.currentContent)
  //         //     .pipe(map(() => v))
  //         // }

  //         if (this.mimeType === 'application/pdf') {
  //           this.profanityCheckAPICall(v.result.artifactUrl)
  //         }
  //         return of(v)
  //       }),
  //     )
  //     .subscribe(
  //       _ => {
  //         this.loaderService.changeLoad.next(false)
  //         this.storeData()
  //         this.snackBar.openFromComponent(NotificationComponent, {
  //           data: {
  //             type: Notify.UPLOAD_SUCCESS,
  //           },
  //           duration: NOTIFICATION_TIME * 1000,
  //         })
  //         this.data.emit('save')
  //       },
  //       () => {
  //         this.loaderService.changeLoad.next(false)
  //         this.snackBar.openFromComponent(NotificationComponent, {
  //           data: {
  //             type: Notify.UPLOAD_FAIL,
  //           },
  //           duration: NOTIFICATION_TIME * 1000,
  //         })
  //       },
  //     )
  // }

  generateUrl(oldUrl: string) {
    const chunk = oldUrl.split('/')
    const newChunk = environment.azureHost.split('/')
    const newLink = []
    for (let i = 0; i < chunk.length; i += 1) {
      if (i === 2) {
        newLink.push(newChunk[i])
      } else if (i === 3) {
        newLink.push(environment.azureBucket)
      } else {
        newLink.push(chunk[i])
      }
    }
    const newUrl = newLink.join('/')
    return newUrl
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
      )
      .pipe(
        // tap(v => {
        //   this.canUpdate = false
        //   let url = ''
        //   const artifactUrl = v.result && v.result.artifactUrl ? v.result.artifactUrl : ''
        //   if (this.mimeType === 'video/mp4' || this.mimeType === 'application/pdf' || this.mimeType === 'audio/mpeg') {
        //     this.fileUploadForm.controls.artifactUrl.setValue(v ? this.generateUrl(artifactUrl) : '')
        //     this.fileUploadForm.controls.downloadUrl.setValue(v ? this.generateUrl(artifactUrl) : '')
        //   } else {
        //     this.fileUploadForm.controls.artifactUrl.setValue(v ? artifactUrl : '')
        //     this.fileUploadForm.controls.downloadUrl.setValue(v ? artifactUrl : '')
        //   }
        //   this.fileUploadForm.controls.mimeType.setValue(this.mimeType)

        //   if (this.mimeType === 'application/html') {
        //     // tslint:disable-next-line:max-line-length
        //     // url = `${document.location.origin}/content-store/${this.accessService.rootOrg}/
        // ${this.accessService.org}/Public/${this.currentContent}/web-hosted/${this.fileUploadCondition.url}`
        //     url = `${environment.karmYogi}content-store/${this.accessService.rootOrg}/${this.accessService.org}/Public/
        //     ${this.currentContent}/web-hosted/${this.fileUploadCondition.url}`

        //   } else {
        //     // url = (v.authArtifactURL || v.artifactURL).replace(/%2F/g, '/')
        //     url = (v.result.artifactUrl).replace(/%2F/g, '/')
        //   }
        //   this.fileUploadForm.controls.artifactUrl.setValue(url)
        //   // // this.fileUploadForm.controls.downloadUrl.setValue(v ? v.downloadURL : '')
        //   // this.fileUploadForm.controls.mimeType.setValue(this.mimeType)

        //   // this.fileUploadForm.controls.downloadUrl.setValue(v ? v.result.artifactUrl : '')
        //   // if (this.mimeType === 'application/html' && this.file && this.file.name.toLowerCase().endsWith('.zip')) {
        //   //   this.fileUploadForm.controls.isExternal.setValue(false)
        //   // }

        //   if (this.mimeType === 'application/vnd.ekstep.html-archive' && this.file && this.file.name.toLowerCase().endsWith('.zip')) {
        //     this.fileUploadForm.controls.isExternal.setValue(false)
        //     // this.fileUploadForm.controls['streamingUrl'].setValue(v ?
        //     //   this.generateStreamUrl((this.fileUploadCondition.url) ? this.fileUploadCondition.url : '') : '')
        //   }

        //   // if (this.mimeType === 'application/x-mpegURL') {
        //   //   this.fileUploadForm.controls.transcoding.setValue({
        //   //     lastTranscodedOn: null,
        //   //     retryCount: 0,
        //   //     status: 'STARTED',
        //   //   })
        //   // }
        //   if (this.mimeType === 'video/mp4') {
        //     this.fileUploadForm.controls.transcoding.setValue({
        //       lastTranscodedOn: null,
        //       retryCount: 0,
        //       status: 'STARTED',
        //     })
        //   }

        //   this.fileUploadForm.controls.duration.setValue(this.duration)
        //   this.fileUploadForm.controls.size.setValue((this.file as File).size)
        //   this.canUpdate = true
        // }),
        tap(v => {
          this.canUpdate = false
          // const artifactUrl = v.result && v.result.artifactUrl ? v.result.artifactUrl : ''
          const artifactUrl = v && v.artifactUrl ? v.artifactUrl : ''
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
          // if (this.mimeType === 'application/x-mpegURL') {
          //   return this.uploadService
          //     .startEncoding(v.authArtifactURL || v.artifactURL, this.currentContent)
          //     .pipe(map(() => v))
          // }

          if (this.mimeType === 'application/pdf') {
            this.profanityCheckAPICall(v.artifactUrl)
          }
          return of(v)
        }),
      )
      .subscribe(
        _ => {
          this.loaderService.changeLoad.next(false)
          this.storeData()
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.UPLOAD_SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          this.data.emit('save')
        },
        () => {
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.UPLOAD_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
      )
  }

  profanityCheckAPICall(url: string) {
    this.profanityService.startProfanity(this.currentContent, url, (this.file ? this.file.name : this.currentContent)).subscribe()
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
          (this.authInitService.authConfig[v as keyof IFormMeta].type === 'boolean' &&
            currentMeta[v] === false)
        ) {
          meta[v] = currentMeta[v]
        } else {
          meta[v] = JSON.parse(
            JSON.stringify(
              this.authInitService.authConfig[v as keyof IFormMeta].defaultValue[
                originalMeta.contentType
                // tslint:disable-next-line: ter-computed-property-spacing
              ][0].value,
            ),
          )
        }
      } else if (v === 'versionKey') {
        meta[v as keyof NSContent.IContentMeta] = originalMeta[v as keyof NSContent.IContentMeta]
      }
    })
    this.contentService.setUpdatedMeta(meta, this.currentContent)
  }

  getDuration() {
    const content = document.createElement(
      this.mimeType === 'video/mp4' ? 'video' : 'audio',
    )
    content.preload = 'metadata'
    this.enableUpload = false
    content.onloadedmetadata = () => {
      window.URL.revokeObjectURL(content.src)
      this.duration = JSON.stringify(Math.round(content.duration))
      this.enableUpload = true
    }
    content.src = URL.createObjectURL(this.file)
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

  closeDialog() {
    this.dialog.closeAll()
  }

  generateStreamUrl(fileName: string) {
    // return `${environment.karmYogi}${environment.scromContentEndpoint}${this.currentContent}-snapshot/${fileName}`
    return `${environment.azureHost}/${environment.azureBucket}/html/${this.currentContent}-snapshot/${fileName}`

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
      this.dialog.open(this.selectFile, {
        width: this.isMobile ? '90vw' : '600px',
        height: 'auto',
      })
    }
  }
}
