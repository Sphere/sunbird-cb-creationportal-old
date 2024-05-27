import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms'
import { Component, OnInit, Input } from '@angular/core'
import { Router } from '@angular/router'
import { ICreateEntity } from '@ws/author/src/lib/interface/create-entity'
import { MatSnackBar, MatDialog } from '@angular/material'
import { LoaderService } from '@ws/author/src/lib/services/loader.service'
import { CreateService } from '../create/create.service'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { IprDialogComponent } from '@ws/author/src/lib/modules/shared/components/ipr-dialog/ipr-dialog.component'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { mergeMap } from 'rxjs/operators'
import { IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '../../../../../constants/upload'
import { ConfigurationsService } from '../../../../../../../../../../library/ws-widget/utils/src/lib/services/configurations.service'
import { ImageCropComponent } from '../../../../../../../../../../library/ws-widget/utils/src/public-api'
import { NSApiRequest } from '../../../../../interface/apiRequest'
import { HttpClient } from '@angular/common/http'
import { AUTHORING_BASE, CONTENT_BASE_STATIC } from '../../../../../constants/apiEndpoints'
import { UploadService } from '../../../editor/shared/services/upload.service'
// import { environment } from '../../../../../../../../../../src/environments/environment'
import { ActivatedRoute } from '@angular/router'
import { CollectionStoreService } from '../../../../../../../../author/src/lib/routing/modules/editor/routing/modules/collection/services/store.service'
import { EditorContentService } from 'project/ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { CollectionResolverService } from 'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/services/resolver.service'
import { NSContent } from '@ws/author/src/lib/interface/content'
import moment from 'moment'
import {
  ContentProgressService,
} from '@ws-widget/collection'
@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ws-author-create-course',
  templateUrl: './create-course.component.html',
  styleUrls: ['./create-course.component.scss'],
  providers: [CollectionStoreService, CollectionResolverService],
})

export class CreateCourseComponent implements OnInit {
  @Input() content: any
  currentContent!: string
  currentCourseId!: string
  language = ''
  entity: ICreateEntity[] = []
  resourceEntity!: ICreateEntity
  courseData: any
  iprAccepted = false
  identifier: any
  infoType: string = ''
  canUpdate = true
  contentForm!: FormGroup
  bucket: string = ''
  imageTypes = IMAGE_SUPPORT_TYPES
  isSelfAssessment = false
  languageList: any[] = [
    {
      "name": 'English',
      "value": 'en'
    },
    {
      "name": 'Hindi',
      "value": 'hi'
    }
  ]
  addResourceModule: any = {}
  resourseSelected: string = ''
  searchComp: any = ''
  proficiencyList: any
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private svc: CreateService,
    private router: Router,
    private loaderService: LoaderService,
    private dialog: MatDialog,
    private authInitService: AuthInitService,
    private accessControlSvc: AccessControlService,
    private editorService: EditorService,
    private formBuilder: FormBuilder,
    private configSvc: ConfigurationsService,
    private loader: LoaderService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private uploadService: UploadService,
    private storeService: CollectionStoreService,
    private editorStore: EditorContentService,
    private resolverService: CollectionResolverService,
    private progressSvc: ContentProgressService,
  ) { }
  createCourseForm!: FormGroup
  createSelfAssessmentForm!: FormGroup
  proficiency: any
  getAllEntities: any
  ngOnInit() {
    this.getAllEntities = this.editorService.getAllEntities().subscribe(async (res: any) => {
      this.proficiencyList = await res.result.response
      this.searchComp = this.proficiencyList
    })
    this.route.queryParams.subscribe(params => {
      // Access individual query parameters
      const value = params['status']
      if (value == 'selfAssessment') {
        this.isSelfAssessment = true
      }
    })
    this.createCourseForm = this.fb.group({
      courseName: new FormControl('', [Validators.required]),
      // courseSummary: new FormControl(''),
      courseDescription: new FormControl('', [Validators.required]),
      appIcon: new FormControl([])
    })
    this.createSelfAssessmentForm = this.fb.group({
      lang: new FormControl(''),
      proficiency: new FormControl('', [Validators.required]),
    })
    this.authInitService.creationEntity.forEach(v => {
      // console.log('vvvvvvvv   ', v)
      if (!v.parent && v.available) {
        if (v.id === 'resource') {
          this.resourceEntity = v
        } else {
          // console.log('========  ')
          this.entity.push(v)
          if (this.entity[1]) {
            // this.content = this.entity[1]          // Here type is Learning Path
            this.content = this.entity[0]             // Here type is course
          }
          v.enabled = true
          // this.entity.push(v)
        }
      }
    })

    this.loaderService.changeLoadState(false)
    // this.allLanguages = this.authInitService.ordinals.subTitles || []
    this.language = this.accessControlSvc.locale

    // const navigation = this.router.getCurrentNavigation()
    // if (navigation && navigation.extras && navigation.extras.state) {
    //   this.content = navigation.extras.state
    // }

  }


  onKey(value: string) {
    this.proficiencyList = this.search(value)
  }
  eventSelection(event: any) {
    this.proficiency = event
  }
  search(value: string) {
    let filter = value.toLowerCase()
    if (!filter) {
      return this.searchComp
    }
    return this.proficiencyList = this.searchComp.filter((option: any) =>
      option.name.toLowerCase().includes(filter)
    )
  }

  createSelfAssessmentCourse() {
    this.loaderService.changeLoad.next(true)
    const competency = this.proficiencyList.find((obj: any) => obj.id === this.courseData.proficiency.id)
    this.courseData.courseName = this.courseData.proficiency.name
    this.courseData.courseDescription = this.courseData.proficiency.description


    if (this.content && competency && this.courseData.proficiency.name) {
      this.svc
        .createV2({
          name: this.courseData,
          contentType: this.content.contentType,
          mimeType: this.content.mimeType,
          locale: this.language,
          primaryCategory: this.content.primaryCategory,
          ...(this.content.additionalMeta || {}),

        }).pipe(mergeMap((id: string) => {

          this.identifier = id
          const request = {
            category: {
              context: [
                {
                  type: 'course',
                  identifier: this.identifier.identifier,
                },
              ],
            },
          }
          return this.svc.createForum(request)
        }))
        .subscribe(
          async (data: any) => {
            let competencies_obj = {
              competencyName: this.courseData.proficiency.name,
              competencyId: this.courseData.proficiency.id,
            }
            let link = "https://sunbirdcontent.s3-ap-south-1.amazonaws.com/content/do_1139718921061744641126/artifact/do_1139718921061744641126_1705553236239_justwhiteplainwhitewhitewallpaperpreview1705553235473.jpg"

            const updateContentReq: any = {
              request: {
                content: {
                  competency: true,
                  competencies_v1: competencies_obj,
                  lang: this.courseData.lang ? this.courseData.lang : 'en',
                  versionKey: this.identifier.versionKey,
                  appIcon: link,
                  thumbnail: link
                },
              },
            }
            // tslint:disable-next-line:max-line-length
            const result = await this.editorService.updateNewContentV3(updateContentReq, this.identifier.identifier).toPromise().catch((_error: any) => { })
            if (data && result) {
              // this.loaderService.changeLoad.next(false)
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.CONTENT_SELF_ASSESSMENT_SUCCESS,
                },
                duration: NOTIFICATION_TIME * 3000,
              })
              let competencyLevelDescription = JSON.parse(competency.additionalProperties.competencyLevelDescription)
              // console.log("competencyLevelDescription", competencyLevelDescription)
              this.editorStore.parentContent = this.identifier.identifier
              this.editorService.readcontentV3(this.editorStore.parentContent).subscribe(async (data: any) => {
                this.courseData = data
                this.getChildrenCount()

                const contentDataMap = new Map<string, NSContent.IContentMeta>()
                // data.contents.map((v: { content: NSContent.IContentMeta; data: any }) => {
                this.storeService.parentNode.push(data.identifier)
                this.resolverService.buildTreeAndMap(
                  data,
                  contentDataMap,
                  this.storeService.flatNodeMap,
                  this.storeService.uniqueIdMap,
                  this.storeService.lexIdMap,
                )
                // })
                this.currentContent = this.identifier.identifier
                this.currentCourseId = this.identifier.identifier
                contentDataMap.forEach(content => this.editorStore.setOriginalMeta(content))
                const currentNode = (this.storeService.lexIdMap.get(this.currentContent) as number[])[0]
                this.storeService.currentParentNode = currentNode
                this.storeService.currentSelectedNode = currentNode

                if (competencyLevelDescription.length > 0) {
                  this.loaderService.changeLoad.next(true)
                  for (const level of competencyLevelDescription) {
                    if (level) {
                      this.courseData = await this.editorService.readcontentV3(this.editorStore.parentContent).toPromise()
                      this.editorStore.setOriginalMeta(data)
                      await this.setContentType('assessment', level, '')
                    }
                  }
                }
                // this.loaderService.changeLoad.next(false)
                this.router.navigateByUrl(`/author/editor/${this.editorStore.parentContent}/collection`, { state: this.courseData })
              })
            }

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
  }
  contentClicked() {
    this.loaderService.changeLoad.next(true)
    // const _name = this.createCourseForm.get('name')
    if (this.content && this.courseData.courseName) {
      this.svc
        .createV2({
          name: this.courseData,
          contentType: this.content.contentType,
          mimeType: this.content.mimeType,
          locale: this.language,
          primaryCategory: this.content.primaryCategory,
          ...(this.content.additionalMeta || {}),

        }).pipe(mergeMap((id: string) => {

          this.identifier = id
          const request = {
            category: {
              context: [
                {
                  type: 'course',
                  identifier: this.identifier.identifier,
                },
              ],
            },
          }
          return this.svc.createForum(request)
        }))
        .subscribe(
          async (data: any) => {

            const updateContentReq: any = {
              request: {
                content: {
                  competency: false,
                  versionKey: this.identifier.versionKey,
                },
              },
            }
            // tslint:disable-next-line:max-line-length
            const result = await this.editorService.updateNewContentV3(updateContentReq, this.identifier.identifier).toPromise().catch((_error: any) => { })
            console.log("this.configSvc!.userProfile!.userId", this.configSvc!.userProfile!.userName)
            let val = {
              "userId": this.configSvc!.userProfile!.userId,
              "userName": this.configSvc!.userProfile!.userName,
              "courseId": this.courseData.identifier,
              "role": "creator",
              "comments": '',
              "currentStatus": "course-created",
              "nextStatus": "draft",
              "readComments": false,
              "createdDate": moment(new Date()).toISOString(),
              "updatedDate": moment(new Date()).toISOString(),
            }
            await this.progressSvc.addComment(val).toPromise().catch((_error: any) => { })

            if (data && result) {
              this.loaderService.changeLoad.next(false)
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.CONTENT_CREATE_SUCCESS,
                },
                duration: NOTIFICATION_TIME * 1000,
              })
              this.router.navigateByUrl(`/author/editor/${this.identifier.identifier
                }`)
            }

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
  }

  createForm() {
    this.createCourseForm = this.formBuilder.group({
      name: new FormControl('', []),
    })
  }

  changeToDefaultImg($event: any) {
    $event.target.src = this.configSvc.instanceConfig
      ? this.configSvc.instanceConfig.logos.defaultContent
      : ''
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
                createdBy: this.accessControlSvc.userId,
                creator: this.accessControlSvc.userName,
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
                        this.createCourseForm.controls.appIcon.setValue(this.generateUrl(data.artifactUrl))
                        this.contentForm.controls.thumbnail.setValue(this.generateUrl(data.artifactUrl))
                        this.canUpdate = true
                        // this.data.emit('save')
                        // this.storeData()
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

  showIpr() {
    const dialogRef = this.dialog.open(IprDialogComponent, {
      width: '70%',
      data: { iprAccept: this.iprAccepted },
    })
    dialogRef.afterClosed().subscribe(result => {
      this.iprAccepted = result
    })
  }

  iprChecked() {
    this.iprAccepted = !this.iprAccepted
  }

  showInfo(type: string) {
    this.infoType = this.infoType === type ? '' : type
  }

  onSubmit(form: any) {
    this.courseData = form.value
    this.contentClicked()
  }
  createSelfAssessment(form: any) {
    this.courseData = form.value
    this.createSelfAssessmentCourse()
  }

  navigateTo(params: string) {
    if (params === 'features') {
      this.router.navigate(['/app/features'])
    }
  }
  async setContentType(type: any, level: any, filetype?: string) {
    try {
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
      console.log("level", level)
      const newData = {
        topicDescription: level.description ? level.description : '',
        topicName: '( Level ' + level.level + ') ' + level.name ? level.name : 'Resource',
      }

      if (type.type === 'collection') {
        this.storeService.parentData = this.courseData
      }

      const parentNode = node
      const isDone = await this.storeService.createChildOrSibling(
        couseCreated,
        parentNode,
        asSibling ? node.id : undefined,
        'below',
        newData,
        couseCreated === 'web' ? 'link' : ''
      )

      if (isDone) {
        this.addResourceModule['module'] = false
        this.addResourceModule['courseID'] = this.courseData.identifier

        const data = await this.editorService.readcontentV3(this.editorStore.parentContent).toPromise()
        const newCreatedLexid = this.editorService.newCreatedLexid
        this.courseData = data

        const hierarchyData = this.storeService.getNewTreeHierarchys(this.courseData)

        Object.keys(hierarchyData).forEach((ele: any) => {
          if (ele === this.addResourceModule['courseID']) {
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
        const dataAfterUpdate = await new Promise((resolve) => {
          this.editorService.updateContentV4(requestBodyV2).subscribe((data: any) => {
            resolve(data)
          })
        })

        this.courseData = dataAfterUpdate
        this.getChildrenCount()
        if (newCreatedLexid) {
          const newCreatedNode = (this.storeService.lexIdMap.get(newCreatedLexid) as number[])[0]
          this.storeService.currentSelectedNode = newCreatedNode
          this.storeService.selectedNodeChange.next(newCreatedNode)
        }

        this.currentContent = this.editorService.newCreatedLexid
        this.editorStore.currentContent = newCreatedLexid
        // this.snackBar.openFromComponent(NotificationComponent, {
        //   data: {
        //     type: Notify.CONTENT_CREATE_SUCCESS,
        //   },
        //   duration: NOTIFICATION_TIME * 1000,
        // })

      }
    } catch (error) {
      console.error('Error in setContentType:', error)
    } finally {
      // this.loaderService.changeLoad.next(false)
    }
  }



  getChildrenCount(): any {
    let count = 0

    if (this.courseData.children && Array.isArray(this.courseData.children)) {
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
    }

    return count
  }

}
