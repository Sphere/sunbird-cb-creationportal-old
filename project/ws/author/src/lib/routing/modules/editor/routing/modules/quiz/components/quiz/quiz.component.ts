import { DeleteDialogComponent } from '@ws/author/src/lib/modules/shared/components/delete-dialog/delete-dialog.component'
import { Component, OnInit, ChangeDetectorRef, OnDestroy, Input, Output, EventEmitter, OnChanges } from '@angular/core'
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar'
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout'
// import { map, mergeMap, tap, catchError } from 'rxjs/operators'
import { map, mergeMap, catchError } from 'rxjs/operators'
import { forkJoin, of, Observable, Subscription, EMPTY } from 'rxjs'
import { MatDialog } from '@angular/material'
import { ActivatedRoute, Router } from '@angular/router'

import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { CommentsDialogComponent } from '@ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component'
import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'
import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'

import { EditorContentService } from '@ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { QuizStoreService } from '../../services/store.service'
import { LoaderService } from '@ws/author/src/lib/services/loader.service'
import { UploadService } from '@ws/author/src/lib/routing/modules/editor/shared/services/upload.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { QuizResolverService } from '../../services/resolver.service'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { NotificationService } from '@ws/author/src/lib/services/notification.service'
// import {
//   FillUps,
//   MatchQuiz,
//   McqQuiz,
// } from '@ws/author/src/lib/routing/modules/editor/routing/modules/quiz/components/quiz-class'
import {
  NOTIFICATION_TIME,
  ASSESSMENT_JSON_WITH_KEY,
  ASSESSMENT_JSON_WITHOUT_KEY,
  ASSESSMENT,
  QUIZ_JSON,
} from '@ws/author/src/lib/routing/modules/editor/routing/modules/quiz/constants/quiz-constants'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'

import { CONTENT_BASE_WEBHOST } from '@ws/author/src/lib/constants/apiEndpoints'
import { VIEWER_ROUTE_FROM_MIME } from '@ws-widget/collection/src/public-api'
import { FormGroup } from '@angular/forms'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { isNumber } from 'lodash'
// import { environment } from '../../../../../../../../../../../../../src/environments/environment'
import { ImageUploadIntroPopupComponent } from 'src/app/image-upload-intro/image-upload-intro-popup.component'

@Component({
  selector: 'ws-auth-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
  providers: [QuizResolverService, QuizStoreService],
})
export class QuizComponent implements OnInit, OnChanges, OnDestroy {

  selectedQuizIndex!: number
  allContents: NSContent.IContentMeta[] = []
  contentLoaded = false
  allLanguages: any = []
  showContent = true
  sideNavBarOpened = false
  submitPressed = false
  canValidate = false
  showSettingButtons = true
  currentId = ''
  disableCursor = false
  resourceType = ''
  isValid = true
  currentStep = 2
  snackbarRef?: MatSnackBarRef<NotificationComponent>
  previewMode = false
  mimeTypeRoute: any
  activeContentSubscription?: Subscription
  activeIndexSubscription?: Subscription
  questionsArr: any[] = []
  quizConfig!: any
  quizData!: any
  bucket: string = ''
  validPercentage = false
  resourceName!: string
  /**
   * reviwer and publisher cannot add or delete or edit quizs but can rearrange them
   */
  isLoading = false
  isEdited = false
  canEditJson = true
  mediumScreenSize = false
  quizDuration!: number
  assessmentDuration: any
  randomCount: any
  passPercentage: any
  isQuiz: string = 'Assessment'
  mediumSizeBreakpoint$ = this.breakpointObserver
    .observe([Breakpoints.XSmall, Breakpoints.Small])
    .pipe(map((res: BreakpointState) => res.matches))
  mode$ = this.mediumSizeBreakpoint$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  // @ViewChild(MatSidenavContainer) sidenavContainer: MatSidenavContainer;

  @Input() isCollectionEditor = false
  @Input() isSubmitPressed = false
  @Output() data = new EventEmitter<string>()
  @Input() callSave = false

  @Input() isCreatorEnable = true
  courseCompetency: any
  courseDetails: any
  resourceDetails: any

  constructor(
    private router: Router,
    private activateRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private quizStoreSvc: QuizStoreService,
    private loaderService: LoaderService,
    private metaContentService: EditorContentService,
    private uploadService: UploadService,
    private editorService: EditorService,
    private notificationSvc: NotificationService,
    private initService: AuthInitService,
    private quizResolverSvc: QuizResolverService,
    private accessControl: AccessControlService,
  ) {

    this.initService.uploadMessage.subscribe(
      (data: any) => {
        if (data !== 'save') {
          this.save()
        }
      })
    this.initService.updateAssessmentMessage.subscribe(
      (data: any) => {
        if (data) {
          this.metaContentService.currentContent = data.identifier
          console.log("data: ", data)
          this.ngOnInit()
        }
      })
    this.initService.isAssessmentOrQuizMessage.subscribe(
      (data: any) => {
        if (data == false) {
          this.isQuiz = 'Assessment'
        } else {
          this.isQuiz = 'Quiz'
        }
      })
    console.log("Quiz12", this.isQuiz)
  }

  ngOnDestroy() {
    this.cdr.detach()
    if (this.activeIndexSubscription) {
      this.activeIndexSubscription.unsubscribe()
    }
    if (this.activeContentSubscription) {
      this.activeContentSubscription.unsubscribe()
    }
  }

  // ngOnInit() {
  //   this.showSettingButtons = this.accessControl.rootOrg === 'client1'
  //   if (this.activateRoute.parent && this.activateRoute.parent.parent) {
  //     this.activateRoute.parent.parent.data.subscribe(v => {
  //       let courseChildren = v.contents[0].content.children
  //       // Children
  //       const firstLevelChilds = courseChildren.filter((item: any) => {
  //         return item.category === 'Collection'
  //       })
  //       // find assements
  //       let firstLevelchildArray: any = []

  //       firstLevelChilds.map((item: any) => {

  //         firstLevelchildArray = firstLevelchildArray.concat(item.children)
  //       })
  //       courseChildren = courseChildren.concat(firstLevelchildArray)

  //       // Children
  //       if (courseChildren) {
  //         courseChildren.forEach((element: NSContent.IContentMeta) => {
  //           if (element.mimeType === 'application/quiz') {
  //             // do a get for the data
  //             this.allContents.push(element)

  //             this.editorService.getDataForContent(element.identifier).subscribe(data => {
  //               v.contents = data

  //               this.quizStoreSvc.collectiveQuiz[element.identifier] = v.contents[0].data
  //                 ? v.contents[0].data.questions
  //                 : []

  //               this.canEditJson = this.quizResolverSvc.canEdit(v.contents[0].content)
  //               this.resourceType = v.contents[0].content.categoryType || 'Quiz'
  //               this.quizDuration = v.contents[0].content.duration || 300
  //               this.questionsArr =
  //                 this.quizStoreSvc.collectiveQuiz[v.contents[0].content.identifier] || []
  //               this.contentLoaded = true
  //             }
  //             )

  //           }
  //         })

  //       }
  //       // this.canEditJson = this.quizResolverSvc.canEdit(v.contents[0].content)
  //       // this.resourceType = v.contents[0].content.categoryType || 'Quiz'
  //       // this.quizDuration = v.contents[0].content.duration || 300
  //       // this.questionsArr =
  //       //   this.quizStoreSvc.collectiveQuiz[v.contents[0].content.identifier] || []
  //       this.contentLoaded = true

  //       if (!this.quizStoreSvc.collectiveQuiz[v.contents[0].content.identifier]) {
  //         this.quizStoreSvc.collectiveQuiz[v.contents[0].content.identifier] = []
  //       }
  //     })
  //   }
  //   this.allLanguages = this.authInitService.ordinals.subTitles
  //   this.loaderService.changeLoadState(true)
  //   this.quizConfig = this.quizStoreSvc.getQuizConfig('ques')
  //   this.mediumSizeBreakpoint$.subscribe(isLtMedium => {
  //     this.sideNavBarOpened = !isLtMedium
  //     this.mediumScreenSize = isLtMedium
  //     if (isLtMedium) {
  //       this.showContent = false
  //     } else {
  //       this.showContent = true
  //     }
  //   })
  //   // selected quiz index
  //   this.activeIndexSubscription = this.quizStoreSvc.selectedQuizIndex.subscribe(index => {
  //     this.selectedQuizIndex = index
  //   })
  //   // active lex id
  //   this.activeContentSubscription = this.metaContentService.changeActiveCont.subscribe(id => {
  //     if (!this.quizStoreSvc.collectiveQuiz[id]) {
  //       this.quizStoreSvc.collectiveQuiz[id] = []
  //     }
  //     this.questionsArr = this.quizStoreSvc.collectiveQuiz[id]
  //     this.currentId = id
  //     this.quizStoreSvc.currentId = id
  //     this.quizStoreSvc.changeQuiz(0)
  //   })
  // }

  /**
   * IGOT Reference of reading
   * https://aastrika-sb.idc.tarento.com/assets/public/public/do_1133575688784117761150
   * /artifact/do_1133575688784117761150_1630583149734_quiz.json
   */

  ngOnInit() {
    (async () => {
      this.showSettingButtons = true
      this.isLoading = true
      // console.log('kk', JSON.parse(sessionStorage.assessment))
      const code = sessionStorage.getItem('assessment') || null
      console.log("sessionStorage.getItem('quiz')", sessionStorage.getItem('quiz'))

      this.activeContentSubscription = this.metaContentService.changeActiveCont.subscribe(id => {
        console.log("code", code)
        if (code) {
          this.loaderService.changeLoad.next(false)
          this.isEdited = true
          this.metaContentService.currentContent = JSON.parse(code)
        } else {
          this.loaderService.changeLoad.next(false)
          this.metaContentService.currentContent = id
        }
        this.allLanguages = this.initService.ordinals.subTitles

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
            // tslint:disable-next-line:no-console
            console.log(v)

            this.quizResolverSvc.getUpdatedData(v.contents[0].content.identifier).subscribe(async newData => {
              // const quizContent = this.metaContentService.getOriginalMeta(this.metaContentService.currentContent)

              let quizContent: any = await this.editorService.readcontentV3(this.metaContentService.currentContent).toPromise()
              this.courseDetails = v.contents[0].content
              this.courseCompetency = v.contents[0].content.competency
              this.isQuiz = quizContent.isAssessment ? 'Assessment' : 'Quiz'
              if (this.courseCompetency) {
                this.isQuiz = 'Assessment'
              }
              console.log("Quiz12", this.isQuiz)

              console.log("this is quiz", v.contents[0].content, this.isQuiz)
              this.resourceName = quizContent ? quizContent.name : 'Resource'
              this.resourceDetails = quizContent
              console.log("quizContent", quizContent, this.metaContentService.currentContent, this.resourceName)
              // console.log(quizContent)
              if (quizContent && quizContent.mimeType === 'application/json') {
                const fileData = ((quizContent.artifactUrl || quizContent.downloadUrl) ?
                  this.quizResolverSvc.getJSON(this.generateUrl(quizContent.artifactUrl || quizContent.downloadUrl)) : of({} as any))
                fileData.subscribe(jsonResponse => {
                  // this.isLoading = false
                  //console.log('jsonResponse ', jsonResponse)
                  if (jsonResponse && Object.keys(jsonResponse).length > 1) {
                    if (v.contents && v.contents.length) {
                      if (jsonResponse) {
                        v.contents[0].data = jsonResponse
                        //this.quizStoreSvc.assessmentDuration = jsonResponse.assessmentDuration
                        //this.quizStoreSvc.passPercentage = jsonResponse.passPercentage
                        if (jsonResponse.passPercentage >= 0) {
                          this.validPercentage = true
                        }
                        console.log("jsonResponse.isAssessment:", jsonResponse.isAssessment, "quizContent.competency:", quizContent.competency)

                        if (jsonResponse.isAssessment === true && quizContent.competency) {
                          console.log("Condition 1 met")
                          this.isQuiz = 'Assessment'
                        } else if (this.courseCompetency === true) {
                          console.log("Condition 2 met")
                          this.isQuiz = 'Assessment'
                        } else {
                          console.log("Condition 3 met")
                          this.validPercentage = true
                          this.isQuiz = 'Quiz'
                        }

                        console.log("this.isQuiz 1", this.isQuiz)
                        this.assessmentDuration = (jsonResponse.timeLimit) / 60
                        this.passPercentage = jsonResponse.passPercentage
                        this.randomCount = jsonResponse.randomCount
                      }
                      this.allContents.push(v.contents[0].content)
                      if (v.contents[0].data) {
                        this.quizStoreSvc.collectiveQuiz[id] = v.contents[0].data.questions
                      } else if (newData[0] && newData[0].data && newData[0].data.questions) {
                        this.quizStoreSvc.collectiveQuiz[id] = newData[0].data.questions
                      } else {
                        this.quizResolverSvc.getUpdatedData(id).subscribe(updatedData => {
                          // this.isLoading = false
                          if (updatedData && updatedData[0]) {
                            this.quizStoreSvc.collectiveQuiz[id] = updatedData[0].data.questions
                            // need to arrange
                            this.canEditJson = this.quizResolverSvc.canEdit(quizContent)
                            this.resourceType = quizContent.categoryType || 'Assessment'
                            // this.timeLimit = quizContent.duration || '300'
                            // this.passPercentage = '50'
                            // this.quizStoreSvc.assessmentDuration = jsonResponse.timeLimit
                            // this.quizStoreSvc.passPercentage = jsonResponse.passPercentage
                            this.questionsArr =
                              this.quizStoreSvc.collectiveQuiz[id] || []
                            this.contentLoaded = true
                            this.questionsArr = this.quizStoreSvc.collectiveQuiz[id]
                            this.currentId = id
                            this.quizStoreSvc.currentId = id
                            this.quizStoreSvc.changeQuiz(0)
                            // need to re-arrange
                          }
                        })
                        this.quizStoreSvc.collectiveQuiz[id] = []
                      }

                      // this.quizStoreSvc.collectiveQuiz[id] = v.contents[0].data
                      //   ? v.contents[0].data.questions
                      //   : []
                      // tslint:disable-next-line:no-console
                      console.log(quizContent)
                      this.canEditJson = this.quizResolverSvc.canEdit(quizContent)
                      this.resourceType = quizContent.categoryType || 'Assessment'
                      this.quizDuration = quizContent.duration
                      this.questionsArr =
                        this.quizStoreSvc.collectiveQuiz[id] || []
                      this.contentLoaded = true
                    }
                    if (!this.quizStoreSvc.collectiveQuiz[id]) {
                      this.quizStoreSvc.collectiveQuiz[id] = []
                    }
                  } else {
                    // this.isLoading = false
                    this.assessmentDuration = ''
                    this.passPercentage = ''
                    this.randomCount = ''
                    this.canEditJson = this.quizResolverSvc.canEdit(quizContent)
                    this.resourceType = quizContent.categoryType || 'Assessment'
                    this.quizDuration = quizContent.duration
                    this.questionsArr =
                      this.quizStoreSvc.collectiveQuiz[id] || []
                    this.contentLoaded = true
                    if (!this.quizStoreSvc.collectiveQuiz[id]) {
                      this.quizStoreSvc.collectiveQuiz[id] = []
                    }
                    console.log("yessfasdf", quizContent)

                  }
                  if (quizContent.isAssessment) {
                    this.isQuiz = 'Assessment'
                  } else {
                    this.validPercentage = true
                    this.isQuiz = 'Quiz'
                  }
                  if (this.courseCompetency) {
                    this.isQuiz = 'Assessment'
                    console.log("this.isQuiz 1", this.isQuiz)
                    this.cdr.detectChanges()  // Manually trigger change detection
                  }
                  console.log("this.isQuiz 1", this.isQuiz)
                })
              }
              if (v.contents[0].content.competency) {
                console.log("ye sasdfsdaf")
                this.isQuiz = 'Assessment'
              }
            })
          })
          // selected quiz index
          this.activeIndexSubscription = this.quizStoreSvc.selectedQuizIndex.subscribe(index => {
            this.selectedQuizIndex = index
            // this.isLoading = false
          })
          // active lex id
          if (!this.quizStoreSvc.collectiveQuiz[id]) {
            this.quizStoreSvc.collectiveQuiz[id] = []
          }
          this.questionsArr = this.quizStoreSvc.collectiveQuiz[id]
          this.currentId = id
          this.quizStoreSvc.currentId = id
          this.quizStoreSvc.changeQuiz(0)
          setTimeout(() => {
            this.isLoading = false
          }, 500)
        }
        if (this.courseCompetency) {
          this.isQuiz = 'Assessment'
          console.log("this.isQuiz 1", this.isQuiz)
          this.cdr.detectChanges()  // Manually trigger change detection
        }
        console.log("Quiz", this.isQuiz)
      })
    })()
  }
  addTodo(event: any, field: string) {
    const meta: any = {}
    console.log("event", event)
    if (event > 100) {
      // Reset the input value to 100
      this.passPercentage = 100
      event = 100
    }
    if (field === 'passPercentage') {
      meta['passPercentage'] = event
      this.passPercentage = event
      if (event >= 0) {
        this.validPercentage = true
      } else {
        this.validPercentage = false
      }
      if (event === null) {
        this.validPercentage = false
      }
      if (this.isQuiz === 'Quiz') {
        this.validPercentage = true
      }
      this.quizStoreSvc.hasChanged = true
    } else {
      if (field === 'randomCount') {
        meta['randomCount'] = event
        this.randomCount = event
        this.quizStoreSvc.hasChanged = true
      } else {
        meta['assessmentDuration'] = event
        this.assessmentDuration = event
        this.quizStoreSvc.hasChanged = true
      }

    }
    this.metaContentService.setUpdatedMeta(meta, this.currentId, true)
  }

  OpenUploadIntro() {
    const dialogRef = this.dialog.open(ImageUploadIntroPopupComponent, {
      width: '85%',
      height: '600px',
    })
    dialogRef.afterClosed().subscribe((response: boolean) => {
      // this.loader.changeLoad.next(true)
      // tslint:disable-next-line:no-console
      console.log(response)
    })
  }

  ngOnChanges() {
    // if (this.callSave) {
    //   this.save()
    // }
    this.assessmentDuration = ''
    this.passPercentage = ''
    this.randomCount = ''
  }
  customStepper(step: number) {
    if (step === 1) {
      this.disableCursor = true
    } else {
      this.currentStep = step
    }
  }

  changeContent(data: NSContent.IContentMeta) {
    this.currentId = data.identifier
    this.metaContentService.changeActiveCont.next(data.identifier)
  }

  /**
   * Navigates to the selected quiz
   * @param steps no of steps it should move
   */
  changeQuiz(steps: number) {
    const index = this.selectedQuizIndex + steps
    this.quizStoreSvc.changeQuiz(index)
    const selectedElem = document.getElementById(`quiz-${index}`)
    // if (this.mediumScreenSize) {
    //    this.sidenav.close()
    // }
    if (selectedElem) {
      setTimeout(() => {
        this.cdr.detectChanges()
        selectedElem.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // tslint:disable-next-line: align
      }, 200)
    }
  }

  createInAnotherLanguage(lang: string) {
    this.loaderService.changeLoad.next(true)
    this.metaContentService
      .createInAnotherLanguage(lang, { artifactURL: '', downloadUrl: '' })
      .subscribe(
        data => {
          this.loaderService.changeLoad.next(false)
          if (data !== true) {
            this.allContents.push(data as NSContent.IContentMeta)
            this.changeContent(data as NSContent.IContentMeta)
            this.showNotification(Notify.CONTENT_CREATE_SUCCESS)
          } else {
            this.showNotification(Notify.DATA_PRESENT)
          }
        },
        error => {
          if (error.status === 409) {
            const errorMap = new Map<string, NSContent.IContentMeta>()
            errorMap.set(this.currentId, this.metaContentService.getUpdatedMeta(this.currentId))
            this.dialog.open(ErrorParserComponent, {
              width: '750px',
              height: '450px',
              data: {
                errorFromBackendData: error.error,
                dataMapping: errorMap,
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

  triggerSave(meta: NSContent.IContentMeta, id: string) {
    // const requestBody: NSApiRequest.IContentUpdate = {
    //   hierarchy: { },
    //   nodesModified: {
    //     [id]: {
    //       isNew: false,
    //       root: true,
    //       metadata: meta,
    //     },
    //   },
    // }

    // return this.editorService
    //   .updateContent(requestBody)
    //   .pipe(tap(() => this.metaContentService.resetOriginalMeta(meta, id)))
    // tslint:disable-next-line:no-console
    console.log('resourceSave', meta, id)

    let isAssessment = this.resourceDetails.isAssessment
    //For assessment and quiz
    if (this.isQuiz === 'Assessment') {
      console.log("yes Assessment")
      isAssessment = true
    } else {
      isAssessment = false
    }
    //for self assessment
    if (this.courseCompetency) {
      this.passPercentage = this.passPercentage
      isAssessment = true
    }

    if (meta && id) {
      this.metaContentService.setUpdatedMeta(meta, id)
      //this.data.emit('save')
      let requestBody = {
        request: {
          content: {
            ...meta,
            isAssessment: isAssessment
          }
        }
      }
      // tslint:disable-next-line:no-console
      console.log(requestBody)
      this.editorService.updateNewContentV3(requestBody, this.currentId).subscribe(
        (data: any) => {
          // tslint:disable-next-line:no-console
          console.log(data)
        })
    }
    return of({})
  }

  generateUrl(oldUrl: any) {
    // @ts-ignore: Unreachable code error
    let bucket = window["env"]["azureBucket"]
    if (oldUrl.includes(bucket)) {
      return oldUrl
    }
    // const chunk = oldUrl.split('/')
    // const newChunk = environment.azureHost.split('/')
    // const newLink = []
    // for (let i = 0; i < chunk.length; i += 1) {
    //   if (i === 2) {
    //     newLink.push(newChunk[i])
    //   } else if (i === 3) {
    //     newLink.push(environment.azureBucket)
    //   } else {
    //     newLink.push(chunk[i])
    //   }
    // }
    // const newUrl = newLink.join('/')
    // return newUrl
  }

  // wrapperForTriggerSave() {
  //   this.loaderService.changeLoad.next(true)
  //   const updatedQuizData = this.quizStoreSvc.collectiveQuiz[this.currentId]

  //   const hasTimeChanged =
  //     (this.metaContentService.upDatedContent[this.currentId] || { }).duration &&
  //     this.quizDuration !== this.metaContentService.upDatedContent[this.currentId].duration
  //   const doUploadJson = this.quizStoreSvc.hasChanged || hasTimeChanged
  //   if (!(this.metaContentService.getUpdatedMeta(this.currentId) || { }).duration) {
  //     this.metaContentService.setUpdatedMeta({ duration: this.quizDuration } as any, this.currentId)
  //   }
  //   return (doUploadJson
  //     ? this.triggerUpload(JSON.parse(JSON.stringify(updatedQuizData)))
  //     : of({ } as any)
  //   ).pipe(
  //     mergeMap(v => {
  //       const updatedMeta = JSON.parse(
  //         JSON.stringify(this.metaContentService.upDatedContent[this.currentId] || { }),
  //       )
  //       const check = this.resourceType === ASSESSMENT ? v.length && v[1] && v[1].code : true
  //       if (v && v[0] && v[0].code && check) {
  //         updatedMeta.artifactUrl = (v[0].authArtifactURL || v[0].artifactURL).replace(/%2F/g, '/')
  //         this.quizDuration = this.metaContentService.getUpdatedMeta(this.currentId).duration
  //         updatedMeta.downloadUrl = v[0].downloadURL.replace(/%2F/g, '/')
  //         this.quizStoreSvc.hasChanged = false
  //       }
  //       return this.triggerSave(updatedMeta, this.currentId)
  //     }),
  //   )
  // }

  wrapperForTriggerSave() {
    this.loaderService.changeLoad.next(false)

    if (this.isEdited) {
      this.currentId = this.metaContentService.parentContent
    }
    //let updatedQuizData = this.quizStoreSvc.collectiveQuiz[this.currentId]
    let updatedQuizData
    if (!updatedQuizData) {
      this.currentId = this.metaContentService.currentContent
      updatedQuizData = this.quizStoreSvc.collectiveQuiz[this.currentId]
      if (!updatedQuizData) {
        this.currentId = this.metaContentService.parentContent
        updatedQuizData = this.quizStoreSvc.collectiveQuiz[this.currentId]
      }
    }
    this.currentId = this.metaContentService.currentContent
    const hasTimeChanged =
      (this.metaContentService.upDatedContent[this.currentId] || {}).duration &&
      this.quizDuration !== this.metaContentService.upDatedContent[this.currentId].duration

    const doUploadJson = this.quizStoreSvc.hasChanged || hasTimeChanged

    if (!(this.metaContentService.getUpdatedMeta(this.currentId) || {}).duration) {
      this.metaContentService.setUpdatedMeta({ duration: this.quizDuration } as any, this.currentId)
    }
    return (doUploadJson
      ? this.triggerUpload(JSON.parse(JSON.stringify(updatedQuizData)))
      : of({} as any)
      // ).pipe(map(v => v.result))
    ).pipe(mergeMap(v => {
      // tslint:disable-next-line:no-console
      console.log(v)
      // tslint:disable-next-line: no-parameter-reassignment
      v = v[0].result || v[0]
      this.showNotification(Notify.SAVE_SUCCESS)
      const updatedMeta = this.metaContentService.upDatedContent[this.currentId] || {}
      // const check = this.resourceType === ASSESSMENT ? v.length && v[1] && v[1].code : true
      // if (v && v[0] && v[0].code && check) {
      if (v && (v.artifactUrl || v.content_url)) {
        updatedMeta.artifactUrl = this.generateUrl(v.authArtifactUrl || v.artifactUrl)
        updatedMeta.versionKey = v.versionKey
        // this.quizDuration = this.metaContentService.getUpdatedMeta(this.currentId).duration
        updatedMeta.downloadUrl = this.generateUrl(v.content_url)
        this.quizStoreSvc.hasChanged = false
        // this.editorService.readContentV2(this.currentId).subscribe(resData => {
        //   this.metaContentService.resetOriginalMeta(resData, this.currentId)
        //   this.metaContentService.resetVersionKey(resData.versionKey, resData.identifier)
        //   this.loaderService.changeLoad.next(true)
        // }, () => {
        //   this.loaderService.changeLoad.next(true)
        //   this.snackBar.open('Error Occured! Please refresh the page.')
        // })
        // this.metaContentService.setUpdatedMeta(updatedMeta, this.currentId)
        // tslint:disable-next-line:no-console
        console.log(updatedMeta, this.currentId)
        this.editorService.readContentV2(this.currentId).subscribe(resData => {
          updatedMeta["versionKey"] = resData.versionKey
          updatedMeta["duration"] = isNumber(this.assessmentDuration) ?
            (this.assessmentDuration * 60).toString() : this.assessmentDuration
          return this.triggerSave(updatedMeta, this.currentId)
        })
      }
      return EMPTY

      // }
    })
    )
  }

  save() {
    this.canValidate = true
    const hasMinLen = (this.resourceType !== ASSESSMENT && this.questionsArr.length)
      || (this.resourceType === ASSESSMENT && this.questionsArr.length >= this.quizConfig.minQues)
    // const needSave = Object.keys(this.metaContentService.upDatedContent[this.currentId] || { }).length
    //   || this.quizStoreSvc.hasChanged
    const needSave = this.quizStoreSvc.hasChanged
    if (hasMinLen && needSave) {
      if (this.canEditJson) {
        this.checkValidity()
      }
      if (this.isValid) {
        // if any change in quiz, then upload json
        this.wrapperForTriggerSave().subscribe(
          () => {
            this.canValidate = false
            this.loaderService.changeLoad.next(false)
            this.showNotification(Notify.SAVE_SUCCESS)
          },
          () => {
            this.canValidate = false
            this.loaderService.changeLoad.next(false)
            this.showNotification(Notify.SAVE_FAIL)
          },
        )
      } else {
        this.currentStep = 2
      }
    } else {
      // enters if the quiz array does not have min len or no changes has been made in meta or quiz
      if (this.resourceType !== ASSESSMENT && !this.questionsArr.length) {
        this.showNotification(Notify.RESOURCE_NO_QUIZ)
        this.currentStep = 2
      } else if (
        this.resourceType === ASSESSMENT &&
        this.questionsArr.length < this.quizConfig.minQues
      ) {
        this.showNotification(Notify.ASSESSMENT_MIN_QUIZ)
        // this.currentStep = 2
      } else {
        this.showNotification(Notify.UP_TO_DATE)
      }
    }
  }

  // uploadJson(array: any[], fileName: string) {
  //   this.quizDuration = this.metaContentService.getUpdatedMeta(this.currentId).duration
  //   const quizData = {
  //     timeLimit: this.quizDuration,
  //     isAssessment: this.resourceType === ASSESSMENT,
  //     questions: array,
  //   }
  //   // const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' })
  //   // const formdata = new FormData()
  //   // formdata.append('content', blob)
  //   return this.uploadService.encodedUpload(quizData, fileName, {
  //     contentId: this.currentId,
  //     contentType: CONTENT_BASE_WEBHOST,
  //   })
  // }

  uploadJson(array: any[], fileName: string) {
    // tslint:disable-next-line:no-console
    console.log(this.assessmentDuration, this.passPercentage, this.isQuiz, this.courseDetails)
    this.quizDuration = (this.metaContentService.getUpdatedMeta(this.currentId).duration &&
      this.metaContentService.getUpdatedMeta(this.currentId).duration !== '0') ?
      this.metaContentService.getUpdatedMeta(this.currentId).duration : this.assessmentDuration
    this.passPercentage = this.isQuiz === 'Quiz' ? 0 : this.passPercentage
    console.log("this.course", this.courseCompetency, this.isQuiz)
    let isAssessment = this.resourceDetails.isAssessment
    //For assessment and quiz
    if (this.isQuiz === 'Assessment') {
      console.log("yes Assessment")
      isAssessment = true
    } else {
      isAssessment = false
    }
    //for self assessment
    if (this.courseCompetency) {
      this.passPercentage = this.passPercentage
      isAssessment = true
    }

    const quizData = {
      // tslint:disable-next-line: prefer-template
      //timeLimit: parseInt(this.quizDuration + '', 10) || 300
      timeLimit: (this.assessmentDuration) * 60,
      //assessmentDuration: (this.assessmentDuration) * 60 || '300',
      passPercentage: this.passPercentage,
      isAssessment: isAssessment,
      randomCount: this.randomCount || this.questionsArr.length,
      questions: array,
    }
    //console.log(this.resourceType, this.resourceType === ASSESSMENT)
    //console.log(quizData)
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' })
    const formdata = new FormData()
    formdata.append('content', blob)
    return this.uploadService.encodedUploadAWS(formdata, fileName, {
      contentId: this.currentId,
      contentType: CONTENT_BASE_WEBHOST,
    })
  }

  shuffle(data: any[]) {
    let currentIndex = data.length
    let temporaryValue: any
    let randomIndex: number
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      // And swap it with the current element.
      temporaryValue = data[currentIndex]
      data[currentIndex] = data[randomIndex]
      data[randomIndex] = temporaryValue
    }
    return data
  }

  // have to upload two jsons one original json and other without answer
  // original json will be in assessment-key.json and other in assessment.json
  triggerUpload(data: any[]) {
    const dataWithOutAns = JSON.parse(JSON.stringify(data))
    const dataWithAns = JSON.parse(JSON.stringify(data))
    dataWithOutAns.map((ques: any) => {
      delete ques.isInValid
      let arr: string[] = []
      if (ques.questionType === 'mtf') {
        arr = this.shuffle(ques.options.map((elem: any) => elem.match))
      }
      ques.options.map((op: any, i: number) => {
        if (!op.hint) {
          delete op.hint
        }
        if (ques.questionType === 'fitb') {
          op.text = ''
        } else if (ques.questionType === 'mtf') {
          op.match = arr[i]
        }
        op.isCorrect = false
      })
    })
    dataWithAns.map((ques: any) => {
      delete ques.isInValid
      ques.options.map((op: any) => {
        if (!op.hint) {
          delete op.hint
        }
      })
    })
    this.resourceType = this.metaContentService.getUpdatedMeta(this.currentId).categoryType
    const uploadData = this.resourceType === ASSESSMENT ? dataWithOutAns : dataWithAns
    return forkJoin([
      this.uploadJson(
        uploadData,
        this.resourceType === ASSESSMENT ? ASSESSMENT_JSON_WITHOUT_KEY : QUIZ_JSON,
      ),
      this.resourceType === ASSESSMENT
        ? this.uploadJson(dataWithAns, ASSESSMENT_JSON_WITH_KEY)
        : of({} as any),
    ])
  }

  action(type: string) {
    switch (type) {
      case 'next':
        this.currentStep += 1
        break
      case 'preview':
        this.preview()
        break
      case 'save':
        this.save()
        break
      case 'push':
        this.takeAction()
        break

      case 'delete':
        const dialog = this.dialog.open(DeleteDialogComponent, {
          width: '600px',
          height: 'auto',
          data: this.metaContentService.getUpdatedMeta(this.currentId),
        })
        dialog.afterClosed().subscribe(confirm => {
          if (confirm) {
            this.allContents = this.allContents.filter(v => v.identifier !== this.currentId)
            if (this.allContents.length) {
              this.metaContentService.changeActiveCont.next(this.allContents[0].identifier)
            } else {
              this.router.navigateByUrl('/author/home')
            }
          }
        })
        break
      case 'close':
        this.router.navigateByUrl('/author/home')
        break
    }
  }

  /**
   * Checks the validity of selected quiz collection and navigates to the first invalid quiz
   * @returns True if the all the quiz is valid else false
   */
  checkValidity() {
    this.isValid = true
    for (let itr = 0; itr < this.questionsArr.length; itr = itr + 1) {
      const errorType = this.quizStoreSvc.validateQuiz(itr)
      if (errorType) {
        // change quiz only once
        if (this.isValid) {
          if (itr !== this.selectedQuizIndex) {
            this.quizStoreSvc.changeQuiz(itr)
          } else {
            this.showNotification(errorType)
          }
        }
        this.isValid = false
        // this.showErrorMessage(errorMessage)
      }
    }
  }

  delete() {
    const confirmDelete = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: 'delete',
    })
    confirmDelete.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.loaderService.changeLoad.next(true)
        this.editorService.deleteContent(this.currentId).subscribe(
          () => {
            this.loaderService.changeLoad.next(false)
            this.showNotification(Notify.SUCCESS)
            this.allContents = this.allContents.filter(v => v.identifier !== this.currentId)
            if (this.allContents.length) {
              this.metaContentService.changeActiveCont.next(this.allContents[0].identifier)
            } else {
              this.router.navigateByUrl('/author/home')
            }
          },
          () => {
            this.loaderService.changeLoad.next(false)
            this.showNotification(Notify.CONTENT_FAIL)
          },
        )
      }
    })
  }

  preview() {
    if (this.resourceType === ASSESSMENT && this.questionsArr.length === 0) {
      this.showNotification(Notify.RESOURCE_NO_QUIZ)
    } else if (
      this.resourceType === ASSESSMENT &&
      this.questionsArr.length < this.quizConfig.minQues
    ) {
      this.showNotification(Notify.ASSESSMENT_MIN_QUIZ)
    } else {
      const needSave =
        this.quizStoreSvc.hasChanged ||
        Object.keys(this.metaContentService.upDatedContent[this.currentId] || {}).length
      if (needSave) {
        this.checkValidity()
        if (this.isValid) {
          this.wrapperForTriggerSave().subscribe(
            () => {
              this.loaderService.changeLoad.next(false)
              this.previewMode = true
              this.mimeTypeRoute = VIEWER_ROUTE_FROM_MIME(
                this.metaContentService.getUpdatedMeta(this.currentId).mimeType as any,
              )
            },
            () => {
              this.loaderService.changeLoad.next(false)
              this.showNotification(Notify.SAVE_FAIL)
            },
          )
        }
      } else {
        this.previewMode = true
        this.mimeTypeRoute = VIEWER_ROUTE_FROM_MIME(
          this.metaContentService.getUpdatedMeta(this.currentId).mimeType as any,
        )
      }
    }
  }

  validationCheck(): Observable<boolean> {
    let returnValue = true
    if (this.resourceType === ASSESSMENT && !this.questionsArr.length) {
      returnValue = false
      this.currentStep = 2
      this.showNotification(Notify.RESOURCE_NO_QUIZ)
    } else if (
      this.resourceType === ASSESSMENT &&
      this.questionsArr.length < this.quizConfig.minQues
    ) {
      returnValue = false
      this.showNotification(Notify.ASSESSMENT_MIN_QUIZ)
      this.currentStep = 2
    } else if (
      !this.metaContentService.isValid(this.currentId) ||
      (!this.metaContentService.isValid(this.currentId) &&
        !this.metaContentService.getUpdatedMeta(this.currentId).artifactUrl)
    ) {
      this.submitPressed = true
      this.showNotification(Notify.MANDATORY_FIELD_ERROR)
      returnValue = false
      this.currentStep = 3
    } else if (this.quizStoreSvc.hasChanged) {
      this.checkValidity()
      if (this.isValid) {
        return this.wrapperForTriggerSave().pipe(map(() => true))
      }
      returnValue = false
    }
    return of(returnValue)
  }

  takeAction() {
    const needSave =
      Object.keys(this.metaContentService.upDatedContent[this.currentId] || {}).length ||
      this.quizStoreSvc.hasChanged
    if (!needSave && this.metaContentService.getUpdatedMeta(this.currentId).status === 'Live') {
      this.showNotification(Notify.UP_TO_DATE)
      return
    }
    this.validationCheck().subscribe(
      valid => {
        if (valid) {
          const dialogRef = this.dialog.open(CommentsDialogComponent, {
            width: '750px',
            height: '450px',
            data: this.metaContentService.getOriginalMeta(this.currentId),
          })
          dialogRef.afterClosed().subscribe((commentsForm: FormGroup) => {
            this.finalCall(commentsForm)
          })
        }
      },
      () => {
        this.showNotification(Notify.SAVE_FAIL)
      },
    )
  }

  isPublisherSame(): boolean {
    const publisherDetails =
      this.metaContentService.getUpdatedMeta(this.currentId).publisherDetails || []
    return publisherDetails.find(v => v.id === this.accessControl.userId) ? true : false
  }

  isDirectPublish(): boolean {
    return (
      ['Draft', 'Live'].includes(this.metaContentService.originalContent[this.currentId].status) &&
      this.isPublisherSame()
    )
  }

  finalCall(commentsForm: FormGroup) {
    if (commentsForm) {
      const body: NSApiRequest.IForwardBackwardActionGeneral = {
        comment: commentsForm.controls.comments.value,
        operation:
          commentsForm.controls.action.value === 'accept' ||
            ['Draft', 'Live'].includes(
              this.metaContentService.originalContent[this.currentId].status,
            )
            ? ((this.accessControl.authoringConfig.isMultiStepFlow && this.isDirectPublish()) ||
              !this.accessControl.authoringConfig.isMultiStepFlow) &&
              this.accessControl.rootOrg.toLowerCase() === 'client1'
              ? 100000
              : 1
            : 0,
      }

      const updatedContent = this.metaContentService.upDatedContent[this.currentId] || {}
      const updatedMeta = this.metaContentService.getUpdatedMeta(this.currentId)
      const needSave = Object.keys(this.metaContentService.upDatedContent[this.currentId] || {})
        .length
      const saveCall = (needSave
        ? this.triggerSave(updatedContent, this.currentId)
        : of({} as any)
      ).pipe(
        mergeMap(() =>
          this.editorService
            .forwardBackward(
              body,
              this.currentId,
              this.metaContentService.originalContent[this.currentId].status,
            )
            .pipe(
              mergeMap(() =>
                this.notificationSvc
                  .triggerPushPullNotification(
                    updatedMeta,
                    body.comment,
                    body.operation ? true : false,
                  )
                  .pipe(
                    catchError(() => {
                      return of({} as any)
                    }),
                  ),
              ),
            ),
        ),
      )
      this.loaderService.changeLoad.next(true)
      saveCall.subscribe(
        () => {
          this.loaderService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: this.getMessage('success'),
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          this.allContents = this.allContents.filter(v => v.identifier !== this.currentId)
          if (this.allContents.length) {
            this.metaContentService.changeActiveCont.next(this.allContents[0].identifier)
          } else {
            this.router.navigateByUrl('/author/home')
          }
        },
        error => {
          if (error.status === 409) {
            const errorMap = new Map<string, NSContent.IContentMeta>()
            errorMap.set(
              this.currentId,
              this.metaContentService.getUpdatedMeta(this.currentId),
            )
            this.dialog.open(ErrorParserComponent, {
              width: '80vw',
              height: '90vh',
              data: {
                errorFromBackendData: error.error,
                dataMapping: errorMap,
              },
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
  }

  getMessage(type: 'success' | 'failure') {
    if (type === 'success') {
      switch (this.metaContentService.originalContent[this.currentId].status) {
        case 'Draft':
        case 'Live':
          return Notify.SEND_FOR_REVIEW_SUCCESS
        case 'InReview':
          return Notify.REVIEW_SUCCESS
        case 'Reviewed':
          return Notify.PUBLISH_SUCCESS
        default:
          return ''
      }
    }
    switch (this.metaContentService.originalContent[this.currentId].status) {
      case 'Draft':
      case 'Live':
        return Notify.SEND_FOR_REVIEW_FAIL
      case 'InReview':
        return Notify.REVIEW_FAIL
      case 'Reviewed':
        return Notify.PUBLISH_FAIL
      default:
        return ''
    }
  }

  getAction(): string {
    switch (this.metaContentService.originalContent[this.currentId].status) {
      case 'Draft':
      case 'Live':
        return 'sendForReview'
      case 'InReview':
      case 'QualityReview':
        return 'review'
      case 'Reviewed':
        return 'publish'
      default:
        return 'sendForReview'
    }
  }

  showNotification(errorType: string) {
    this.snackBar.openFromComponent(NotificationComponent, {
      data: {
        type: errorType,
      },
      duration: NOTIFICATION_TIME * 1000,
    })
  }

  closePreview() {
    this.previewMode = false
  }

  toggleSettingButtons() {
    this.showSettingButtons = !this.showSettingButtons
  }

  canDelete() {
    return this.accessControl.hasRole(['editor', 'admin']) ||
      (['Draft', 'Live'].includes(this.metaContentService.originalContent[this.currentId].status) &&
        this.metaContentService.originalContent[this.currentId].creatorContacts.find(v => v.id === this.accessControl.userId)
      )
  }
  // fullScreenToggle() { }
}
