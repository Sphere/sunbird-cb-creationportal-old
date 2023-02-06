import { HttpClient } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ImageCropComponent } from '../../../../../../../../../../../../../../library/ws-widget/utils/src/public-api'
import { NotificationComponent } from '../../../../../../../../../../../../app/src/lib/routes/notification/components/notification/notification.component'
import { AUTHORING_BASE, CONTENT_BASE_STATIC } from '../../../../../../../../../constants/apiEndpoints'
import { NOTIFICATION_TIME } from '../../../../../../../../../constants/constant'
import { Notify } from '../../../../../../../../../constants/notificationMessage'
import { IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '../../../../../../../../../constants/upload'
import { NSApiRequest } from '../../../../../../../../../interface/apiRequest'
import { AccessControlService } from '../../../../../../../../../modules/shared/services/access-control.service'
import { AuthInitService } from '../../../../../../../../../services/init.service'
import { LoaderService } from '../../../../../../../../../services/loader.service'
import { UploadService } from '../../../../../../shared/services/upload.service'
import { ConfigurationsService } from '@ws-widget/utils'

@Component({
  selector: 'ws-author-resource-module',
  templateUrl: './resource-module.component.html',
  styleUrls: ['./resource-module.component.scss']
})
export class ResourceModuleComponent implements OnInit {
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
  imageTypes = IMAGE_SUPPORT_TYPES
  isResoureCreate: boolean = false
  resourceForm: FormGroup
  hours: number = 0
  minutes: number = 0
  canUpdate = true
  bucket: string = ''


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

  constructor(private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private loader: LoaderService,
    private accessService: AccessControlService,
    private http: HttpClient,
    private uploadService: UploadService,
    private authInitService: AuthInitService,
    private configSvc: ConfigurationsService) {
    this.resourceForm = new FormGroup({
      resourceName: new FormControl(''),
      resourceLinks: new FormControl(''),
      appIcon: new FormControl('')
    })
  }

  ngOnInit() {
  }

  createResourseContent(): void {
    this.isResoureCreate = true
  }

  generateUrl(oldUrl: any) {
    //const chunk = oldUrl.split('/')
    //const newChunk = environment.azureHost.split('/')
    // @ts-ignore: Unreachable code error
    this.bucket = window["env"]["azureBucket"]
    if (oldUrl.includes(this.bucket)) {
      return oldUrl
    }
    // const newChunk = this.bucket
    // const newLink = []
    // for (let i = 0; i < chunk.length; i += 1) {
    //   console.log(i)
    //   if (i === 2) {
    //     newLink.push(newChunk[i])
    //   } else if (i === 3) {
    //     newLink.push(environment.azureBucket)
    //   } else {
    //     newLink.push(chunk[i])
    //   }
    // }
    // const newUrl = newLink.join('/')
    // console.log(newUrl)
    // return newUrl
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
                        // const generateURL = this.generateUrl(data.artifactUrl)
                        // const updateArtf: NSApiRequest.IUpdateImageMetaRequestV2 = {
                        //   request: {
                        //     content: {
                        //       // content_url: data.result.artifactUrl,
                        //       // identifier: data.result.identifier,
                        //       // node_id: data.result.node_id,
                        //       thumbnail: generateURL,
                        //       appIcon: generateURL,
                        //       artifactUrl: generateURL,
                        //       // versionKey: (new Date()).getTime().toString(),
                        //       versionKey: meta.result.versionKey,
                        //     },
                        //   },
                        // }

                        // this.apiService
                        //   .patch<NSApiRequest.ICreateMetaRequest>(
                        //     `${AUTHORING_BASE}content/v3/update/${data.identifier}`,
                        //     updateArtf,
                        //   )
                        // this.editorService.checkReadAPI(data.identifier)
                        // .subscribe(
                        //   (res: any) => {
                        //     console.log(res)
                        //     if (res) {
                        //     }
                        this.loader.changeLoad.next(false)
                        this.canUpdate = false
                        this.resourceForm.controls.appIcon.setValue(this.generateUrl(data.artifactUrl))
                        //this.resourceForm.controls.thumbnail.setValue(this.generateUrl(data.artifactUrl))
                        this.canUpdate = true
                        // this.data.emit('save')
                        //this.storeData()
                        this.authInitService.uploadData('thumbnail')
                        // this.contentForm.controls.posterImage.setValue(data.artifactURL)
                        this.snackBar.openFromComponent(NotificationComponent, {
                          data: {
                            type: Notify.UPLOAD_SUCCESS,
                          },
                          duration: NOTIFICATION_TIME * 2000,
                        })
                        // })
                      } else {
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

                // .subscribe(
                //   data => {
                //     if (data.result) {
                //       this.loader.changeLoad.next(false)
                //       this.canUpdate = false
                //       this.contentForm.controls.appIcon.setValue(data.result.artifactUrl)
                //       this.contentForm.controls.thumbnail.setValue(data.result.artifactUrl)
                //       // this.contentForm.controls.posterImage.setValue(data.artifactURL)
                //       this.canUpdate = true
                //       this.storeData()
                //       this.snackBar.openFromComponent(NotificationComponent, {
                //         data: {
                //           type: Notify.UPLOAD_SUCCESS,
                //         },
                //         duration: NOTIFICATION_TIME * 1000,
                //       })
                //     }
                //   },
                //   () => {
                //     this.loader.changeLoad.next(false)
                //     this.snackBar.openFromComponent(NotificationComponent, {
                //       data: {
                //         type: Notify.UPLOAD_FAIL,
                //       },
                //       duration: NOTIFICATION_TIME * 1000,
                //     })
                //   },
                // )
              },
            )

        }
      },
    })
  }
}
