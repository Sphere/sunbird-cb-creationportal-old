import { COMMA, ENTER } from '@angular/cdk/keycodes'
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { MatAutocompleteSelectedEvent } from '@angular/material'
import { MatChipInputEvent } from '@angular/material/chips'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { VIEWER_ROUTE_FROM_MIME } from '@ws-widget/collection/src/public-api'
import { ConfigurationsService } from '@ws-widget/utils'
import { NewImageCropComponent } from '@ws-widget/utils/src/public-api'
import { AUTHORING_BASE, CONTENT_BASE_STATIC } from '@ws/author/src/lib/constants/apiEndpoints'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '@ws/author/src/lib/constants/upload'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { EditorContentService } from '@ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { Observable, of, Subscription } from 'rxjs'
// import { InterestService } from '../../../../../../../../../app/src/lib/routes/profile/routes/interest/services/interest.service'
import { UploadService } from '../../services/upload.service'
import { CatalogSelectComponent } from '../catalog-select/catalog-select.component'
import { IFormMeta } from './../../../../../../interface/form'
import { AccessControlService } from './../../../../../../modules/shared/services/access-control.service'
import { AuthInitService } from './../../../../../../services/init.service'
import { LoaderService } from './../../../../../../services/loader.service'
// import { CollectionStoreService } from './../../../routing/modules/collection/services/store.service'
import { CompetencyPopupComponent } from 'src/app/competency-popup/competency-popup.component'
import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'

import {
  debounceTime,
  distinctUntilChanged,
  filter,
  // startWith,
  switchMap,
  map,
} from 'rxjs/operators'
import { Router } from '@angular/router'
import { NSApiRequest } from '../../../../../../interface/apiRequest'

// import { ApiService } from '@ws/author/src/lib/modules/shared/services/api.service'
// import { NSApiResponse } from '../../../../../../interface/apiResponse'
//import { environment } from '../../../../../../../../../../../src/environments/environment'
import { HttpClient } from '@angular/common/http'
import { isNumber } from 'lodash'
import _ from 'lodash'
@Component({
  selector: 'ws-auth-edit-meta',
  templateUrl: './edit-meta.component.html',
  styleUrls: ['./edit-meta.component.scss'],
})
export class EditMetaComponent implements OnInit, OnDestroy, AfterViewInit {
  contentMeta!: NSContent.IContentMeta
  @Output() data = new EventEmitter<string>()
  @Output() courseEditFormSubmit = new EventEmitter<boolean>()
  @Input() isSubmitPressed = false
  @Input() nextAction = 'done'
  @Input() stage = 1
  @Input() type = ''
  clickedBtnNext: boolean = false
  saveTriggerSub?: Subscription
  location = CONTENT_BASE_STATIC
  editMeta = 'true'
  selectable = true
  removable = true
  addOnBlur = true
  addConcepts = false
  isFileUploaded = false
  fileUploadForm!: FormGroup
  creatorContactsCtrl!: FormControl
  trackContactsCtrl!: FormControl
  publisherDetailsCtrl!: FormControl
  editorsCtrl!: FormControl
  creatorDetailsCtrl!: FormControl
  audienceCtrl!: FormControl
  jobProfileCtrl!: FormControl
  regionCtrl!: FormControl
  accessPathsCtrl!: FormControl
  keywordsCtrl!: FormControl
  selectedSkills: string[] = []
  canUpdate = true
  ordinals!: any
  resourceTypes: string[] = []
  employeeList: any[] = []
  audienceList: any[] = []
  jobProfileList: any[] = []
  regionList: any[] = []
  accessPathList: any[] = []
  infoType = ''
  isSiemens = false
  fetchTagsStatus: 'done' | 'fetching' | null = null
  readonly separatorKeysCodes: number[] = [ENTER, COMMA]
  selectedIndex = 0
  selfAssessmentSelected!: boolean
  hours = 0
  minutes = 1
  seconds = 0
  @Input() parentContent: string | null = null
  routerSubscription!: Subscription
  imageTypes = IMAGE_SUPPORT_TYPES
  canExpiry = true
  showMoreGlance = false
  complexityLevelList: string[] = []
  isEditEnabled = false
  public sideNavBarOpened = false
  gatingEnabled!: FormControl
  courseVisibility!: FormControl
  selfAssessment!: FormControl
  //issueCertification!: FormControl
  bucket: string = ''
  certificateList: any[] = [
    'Yes', 'No'
  ]
  languageList: any[] = [
    {
      "name": 'English',
      "value": 'en'
    },
    {
      "name": 'Hindi',
      "value": 'hi'
    },
    {
      "name": 'Kannada',
      "value": 'kn'
    }
  ]
  isAddCerticate: boolean = false;
  resourceDurat: any = []
  sumDuration: any
  proficiencyList: any
  addedCompetency: any
  selectedSelfCompetency: boolean = false
  @ViewChild('creatorContactsView', { static: false }) creatorContactsView!: ElementRef
  @ViewChild('trackContactsView', { static: false }) trackContactsView!: ElementRef
  @ViewChild('publisherDetailsView', { static: false }) publisherDetailsView!: ElementRef
  @ViewChild('editorsView', { static: false }) editorsView!: ElementRef
  @ViewChild('creatorDetailsView', { static: false }) creatorDetailsView!: ElementRef
  @ViewChild('audienceView', { static: false }) audienceView!: ElementRef
  @ViewChild('jobProfileView', { static: false }) jobProfileView!: ElementRef
  @ViewChild('regionView', { static: false }) regionView!: ElementRef
  @ViewChild('accessPathsView', { static: false }) accessPathsView!: ElementRef
  @ViewChild('keywordsSearch', { static: true }) keywordsSearch!: ElementRef<any>

  timer: any

  filteredOptions$: Observable<string[]> = of([])
  saveParent: any

  //UI variables
  moduleName: string = 'undefined title';
  isSaveModuleFormEnable: boolean = false;
  moduleButtonName: string = 'Create';
  fieldActive!: boolean
  isFormValid!: boolean
  competencies: any
  constructor(
    // private storeService: CollectionStoreService,
    private formBuilder: FormBuilder,
    private uploadService: UploadService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private editorService: EditorService,
    private contentService: EditorContentService,
    private configSvc: ConfigurationsService,
    private ref: ChangeDetectorRef,
    // private interestSvc: InterestService,
    private loader: LoaderService,
    private authInitService: AuthInitService,
    private accessService: AccessControlService,
    // private apiService: ApiService,
    private http: HttpClient,
    private router: Router,
  ) {


    // this.authInitService.publishMessage.subscribe(
    //   (data: any) => {
    //     console.log("edit-meta", data)
    //   })
    // this.authInitService.isBackButtonFromAssessmentClickedMessage.subscribe(
    //   (data: any) => {
    //     if ((data === 'backFromAssessmentDetails')) {
    //       console.log("edit-meta", data)
    //       this.clickedBtnNext = false
    //     }
    //   })
  }

  ngAfterViewInit() {
    this.ref.detach()
    this.timer = setInterval(() => {
      this.ref.detectChanges()
      // tslint:disable-next-line: align
    }, 100)
  }
  contentForm!: FormGroup
  ngOnInit() {
    this.isSiemens = this.accessService.rootOrg.toLowerCase() === 'siemens'
    this.ordinals = this.authInitService.ordinals
    this.audienceList = this.ordinals.audience
    this.jobProfileList = this.ordinals.jobProfile
    this.complexityLevelList = this.ordinals.audience

    this.creatorContactsCtrl = new FormControl()
    this.trackContactsCtrl = new FormControl()
    this.publisherDetailsCtrl = new FormControl()
    this.editorsCtrl = new FormControl()
    this.creatorDetailsCtrl = new FormControl()
    this.keywordsCtrl = new FormControl('')

    this.audienceCtrl = new FormControl()
    this.jobProfileCtrl = new FormControl()
    this.regionCtrl = new FormControl()
    this.accessPathsCtrl = new FormControl()
    this.accessPathsCtrl.disable()
    this.creatorContactsCtrl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(val => typeof val === 'string'),
        switchMap((value: string) => {
          if (typeof value === 'string' && value) {
            this.employeeList = <any[]>[]
            this.fetchTagsStatus = 'fetching'
            return this.editorService.fetchEmployeeList(value)
          }
          return of([])
        }),
      )
      .subscribe(
        users => {
          this.employeeList = users || <string[]>[]
          this.fetchTagsStatus = 'done'
        },
        () => {
          this.fetchTagsStatus = 'done'
        },
      )

    this.trackContactsCtrl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(val => typeof val === 'string'),
        switchMap((value: string) => {
          if (typeof value === 'string' && value) {
            this.employeeList = <any[]>[]
            this.fetchTagsStatus = 'fetching'

            return this.editorService.fetchEmployeeList(value, 'CONTENT_REVIEWER')
          }
          return of([])
        }),
      )
      .subscribe(
        users => {
          this.employeeList = users || <string[]>[]
          this.fetchTagsStatus = 'done'
        },
        () => {
          this.fetchTagsStatus = 'done'
        },
      )

    this.publisherDetailsCtrl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(val => typeof val === 'string'),
        switchMap((value: string) => {
          if (typeof value === 'string' && value) {
            this.employeeList = <any[]>[]
            this.fetchTagsStatus = 'fetching'
            return this.editorService.fetchEmployeeList(value, 'CONTENT_PUBLISHER')
          }
          return of([])
        }),
      )
      .subscribe(
        users => {
          this.employeeList = users || <string[]>[]
          this.fetchTagsStatus = 'done'
        },
        () => {
          this.fetchTagsStatus = 'done'
        },
      )

    this.editorsCtrl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(val => typeof val === 'string'),
        switchMap((value: string) => {
          if (typeof value === 'string' && value) {
            this.employeeList = <any[]>[]
            this.fetchTagsStatus = 'fetching'
            return this.editorService.fetchEmployeeList(value)
          }
          return of([])
        }),
      )
      .subscribe(
        users => {
          this.employeeList = users || <string[]>[]
          this.fetchTagsStatus = 'done'
        },
        () => {
          this.fetchTagsStatus = 'done'
        },
      )

    this.creatorDetailsCtrl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter(val => typeof val === 'string'),
        switchMap((value: string) => {
          if (typeof value === 'string' && value) {
            this.employeeList = <any[]>[]
            this.fetchTagsStatus = 'fetching'
            return this.editorService.fetchEmployeeList(value, 'ANY_ROLE')
          }
          return of([])
        }),
      )
      .subscribe(
        users => {
          this.employeeList = users || <string[]>[]
          this.fetchTagsStatus = 'done'
        },
        () => {
          this.fetchTagsStatus = 'done'
        },
      )

    this.audienceCtrl.valueChanges.subscribe(() => this.fetchAudience())

    this.jobProfileCtrl.valueChanges.subscribe(() => this.fetchJobProfile())

    this.regionCtrl.valueChanges
      .pipe(
        debounceTime(400),
        filter(v => v),
      )
      .subscribe(() => this.fetchRegion())

    this.accessPathsCtrl.valueChanges.pipe(
      debounceTime(400),
      filter(v => v),
    ).subscribe(() => this.fetchAccessRestrictions())

    this.saveTriggerSub = this.contentService.changeActiveCont.subscribe(data => {
      // tslint:disable-next-line:no-console
      console.log("data", data)
      if (this.contentMeta && this.canUpdate) {
        this.storeData()
      }
      const url = this.router.url
      const id = url.split('/')
      this.editorService.readcontentV3(id[3]).subscribe((res: any) => {
        if (res.selfAssessment && res.selfAssessment.value) {
          this.selectedSelfCompetency = true
        }
        this.contentMeta = res
      })
      this.content = this.contentService.getUpdatedMeta(id[3])
    })

    // this.filteredOptions$ = this.keywordsCtrl.valueChanges.pipe(
    //   startWith(this.keywordsCtrl.value),
    //   debounceTime(500),
    //   distinctUntilChanged(),
    //   switchMap(value => this.interestSvc.fetchAutocompleteInterestsV2(value)),
    // )
  }
  addSelfCompetency(checked: boolean) {
    if (checked == true) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SELF_ASSESSMENT_COMPETENCY,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      this.selectedSelfCompetency = true
    } else {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.REMOVE_SELF_ASSESSMENT_COMPETENCY,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      this.selectedSelfCompetency = false
    }
  }
  addCompetency() {
    const dialogRef = this.dialog.open(CompetencyPopupComponent, {
      width: '40%',
      maxHeight: '90vh',
      data: this.selectedSelfCompetency
    })
    dialogRef.afterClosed().subscribe((response: boolean) => {
      this.loader.changeLoad.next(true)
      // tslint:disable-next-line:no-console
      console.log(response, this.parentContent)
      let id = this.parentContent || ''
      //if (response === true) {
      this.editorService.readcontentV3(id).subscribe(async (data: any) => {
        if (data.competencies_v1) {
          this.getAllEntity()
          this.competencies = JSON.parse(data.competencies_v1)
        }
        this.loader.changeLoad.next(false)
      })
    })
  }

  deleteCompetancy(competency: any) {
    let id = this.parentContent || ''
    let data: any

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '600px',
      height: '200px',
      data: 'delete',
    })

    dialogRef.afterClosed().subscribe((confirm: any) => {
      if (confirm) {
        this.loader.changeLoad.next(true)
        this.editorService.checkReadAPI(id)
          .subscribe(async (res: any) => {
            data = await res.result.content
            let competencyID: string
            let arr1: string[] = []
            let arr2: { competencyName: any; competencyId: any; level: any }[] = []
            let requestBody: any
            let meta
            if (data.competencySearch === undefined) {
              meta = {
                versionKey: data.versionKey,
                competencySearch: [],
                competency: false,
                competencies_v1: []
              }
            } else {

              arr2 = JSON.parse(data.competencies_v1)
              if (data.competencySearch) {
                arr1 = data.competencySearch
              }
              if (competency.level) {
                competencyID = competency.competencyId + '-' + competency.level.toString()
              } else {
                competencyID = competency.competencyId
              }
              arr1 = arr1.filter(e => e !== competencyID)
              for (var n = 0; n < arr2.length; n++) {
                if (arr2[n].competencyName === competency.competencyName && arr2[n].competencyId === competency.competencyId && arr2[n].level === competency.level) {
                  arr2.splice(n, 1)
                  break
                }
              }

              meta = {
                versionKey: data.versionKey,
                competencySearch: arr1,
                competency: false,
                competencies_v1: arr2
              }
            }

            requestBody = {
              request: {
                content: meta
              }
            }
            this.editorService.updateNewContentV3(requestBody, id)
              .subscribe(
                (response: any) => {
                  if (response) {
                    this.loadCompetancy()
                  }
                })
          })
      }
    })

  }

  checkMandatoryFields() {
    //let totalDuration = 0, subTitles, sourceName, instructions, appIcon, lang
    let subTitles, instructions, appIcon, lang, competency, selfAssessment
    //totalDuration += this.seconds ? (this.seconds < 60 ? this.seconds : 59) : 0
    //totalDuration += this.minutes ? (this.minutes < 60 ? this.minutes : 59) * 60 : 0
    //totalDuration += this.hours ? this.hours * 60 * 60 : 0
    subTitles = this.contentForm.controls.subTitle.value
    // sourceName = this.contentForm.controls.sourceName.value
    instructions = this.contentForm.controls.instructions.value
    appIcon = this.contentForm.controls.appIcon.value
    lang = this.contentForm.controls.lang.value
    competency = this.competencies
    selfAssessment = this.selectedSelfCompetency

    // console.log("total: ", totalDuration, subTitles, sourceName, instructions, appIcon)
    //if (totalDuration && subTitles && sourceName && instructions && appIcon && lang) {
    if (subTitles && instructions && appIcon && lang) {
      if (selfAssessment) {
        if (competency && competency.length > 0) {
          return false
        } else {
          return true
        }
      } else {
        return false
      }
    } else {
      return true
    }
  }
  loadCompetancy() {
    let id = this.parentContent || ''
    this.editorService.readcontentV3(id).subscribe(async (data: any) => {
      if (data.competencies_v1 !== undefined) {
        this.getAllEntity()
        this.competencies = await JSON.parse(data.competencies_v1)
      } else {
        this.getAllEntity()
        this.competencies = []
      }
      this.loader.changeLoad.next(false)
    })
  }

  enableClick(): void {
    this.fieldActive = true
  }

  onFocusOutName() {
    this.fieldActive = false
  }
  // clickedNext() {
  //   if (this.contentForm.status == 'VALID') {
  //     this.isFormValid = true
  //     this.authInitService.saveData('saved')
  //     this.clickedBtnNext = true
  //   } else {
  //     this.isFormValid = false
  //   }
  // }
  clickedNext() {
    this.authInitService.currentPageAction('courseDetailsPage')
    let competency, selfAssessment
    competency = this.competencies
    if (this.contentForm.controls.subTitle.value) {
      this.contentForm.controls.subTitle.setValue(this.contentForm.controls.subTitle.value.trim())
    }

    if (this.contentForm.controls.instructions.value) {
      this.contentForm.controls.instructions.setValue(this.contentForm.controls.instructions.value.trim())
    }
    selfAssessment = this.selectedSelfCompetency
    if (this.contentForm.status == 'VALID') {
      if (selfAssessment) {
        if (competency && competency.length > 0) {
          this.isFormValid = true
          this.authInitService.saveData('saved')
          this.clickedBtnNext = true
        } else {
          this.isFormValid = false
        }
      } else {
        this.isFormValid = true
        this.authInitService.saveData('saved')
        this.clickedBtnNext = true
      }
    } else {
      this.isFormValid = false
    }
  }

  changeCertificate(event: any): void {
    if (event == 'Yes') {
      this.isAddCerticate = true
    }
    else {
      this.isAddCerticate = false
    }
  }

  optionSelected(keyword: string) {
    this.keywordsCtrl.setValue(' ')
    // this.keywordsSearch.nativeElement.blur()
    if (keyword && keyword.length) {
      const value = this.contentForm.controls.keywords.value || []
      if (value.indexOf(keyword) === -1) {
        value.push(keyword)
        this.contentForm.controls.keywords.setValue(value)
      }
    }
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe()
    }
    if (this.saveTriggerSub) {
      this.saveTriggerSub.unsubscribe()
    }
    this.loader.changeLoad.next(false)
    this.ref.detach()
    clearInterval(this.timer)
  }

  private set content(contentMeta: NSContent.IContentMeta) {
    const isCreator = (this.configSvc.userProfile && this.configSvc.userProfile.userId === contentMeta.createdBy)
      ? true : false

    this.contentMeta = contentMeta

    const isEditable = this.contentService.hasAccess(
      contentMeta,
      false,
      this.parentContent ? this.contentService.getUpdatedMeta(this.parentContent) : undefined,
    )

    this.isEditEnabled = isEditable

    this.contentMeta.name = contentMeta.name === 'Untitled Content' ? '' : contentMeta.name

    if (this.contentMeta.creatorContacts && typeof this.contentMeta.creatorContacts === 'string') {
      this.contentMeta.creatorContacts = JSON.parse(this.contentMeta.creatorContacts)
    }
    if (this.contentMeta.reviewer && typeof this.contentMeta.reviewer === 'string') {
      this.contentMeta.trackContacts = JSON.parse(this.contentMeta.reviewer)
    }
    if (this.contentMeta.creatorDetails && typeof this.contentMeta.creatorDetails === 'string') {
      this.contentMeta.creatorDetails = JSON.parse(this.contentMeta.creatorDetails)
    }
    if (this.contentMeta.publisherDetails && typeof this.contentMeta.publisherDetails === 'string') {
      this.contentMeta.publisherDetails = JSON.parse(this.contentMeta.publisherDetails)
    }

    this.canExpiry = this.contentMeta.expiryDate !== '99991231T235959+0000'
    if (this.canExpiry) {
      this.contentMeta.expiryDate =
        contentMeta.expiryDate && contentMeta.expiryDate.indexOf('+') === 15
          ? <any>this.convertToISODate(contentMeta.expiryDate)
          : ''
    }
    this.contentService.currentContentData = this.contentMeta
    this.contentService.currentContentID = this.contentMeta.identifier

    this.assignFields()
    // tslint:disable-next-line:no-console
    console.log(contentMeta.duration)
    //this.setDuration(contentMeta.duration || '0')

    this.isEditEnabled = isCreator && isEditable

    this.filterOrdinals()
    this.changeResourceType()
  }

  filterOrdinals() {
    this.complexityLevelList = []
    this.ordinals.complexityLevel.map((v: any) => {
      if (v.condition) {
        let canAdd = false
          // tslint:disable-next-line: whitespace
          ; (v.condition.showFor || []).map((con: any) => {
            let innerCondition = false
            Object.keys(con).map(meta => {
              if (
                con[meta].indexOf(
                  (this.contentForm.controls[meta] && this.contentForm.controls[meta].value) ||
                  this.contentMeta[meta as keyof NSContent.IContentMeta],
                ) > -1
              ) {
                innerCondition = true
              }
            })
            if (innerCondition) {
              canAdd = true
            }
          })
        if (canAdd) {
          // tslint:disable-next-line: semicolon // tslint:disable-next-line: whitespace
          ; (v.condition.nowShowFor || []).map((con: any) => {
            let innerCondition = false
            Object.keys(con).map(meta => {
              if (
                con[meta].indexOf(
                  (this.contentForm.controls[meta] && this.contentForm.controls[meta].value) ||
                  this.contentMeta[meta as keyof NSContent.IContentMeta],
                ) < 0
              ) {
                innerCondition = true
              }
            })
            if (innerCondition) {
              canAdd = false
            }
          })
        }
        if (canAdd) {
          this.complexityLevelList.push(v.value)
        }
      } else {
        if (typeof v === 'string') {
          this.complexityLevelList.push(v)
        } else {
          this.complexityLevelList.push(v.value)
        }
      }
    })
  }

  assignExpiryDate() {
    this.canExpiry = !this.canExpiry
    this.contentForm.controls.expiryDate.setValue(
      this.canExpiry
        ? new Date(new Date().setMonth(new Date().getMonth() + 6))
        : '99991231T235959+0000',
    )
  }
  assignFields() {
    if (!this.contentForm) {
      this.createForm()
    }
    this.canUpdate = false
    const url = this.router.url
    const id = url.split('/')
    this.editorService.readcontentV3(id[3]).subscribe((res: any) => {
      // tslint:disable-next-line:no-console
      console.log(res)
      this.contentMeta = res
      this.contentMeta = res
      this.contentForm.controls.name.setValue(res.name)
      this.contentForm.controls.appIcon.setValue(res.appIcon)
      this.contentForm.controls.thumbnail.setValue(res.appIcon)
      this.contentForm.controls.instructions.setValue(res.instructions)
      this.contentForm.controls.lang.setValue(res.lang)
      this.contentForm.controls.subTitle.setValue(res.subTitle)
      this.contentForm.controls.sourceName.setValue(res.sourceName)
      this.contentForm.controls.gatingEnabled.setValue(res.gatingEnabled)
      this.contentForm.controls.courseVisibility.setValue(res.courseVisibility)
      this.contentForm.controls.selfAssessment.setValue(res.selfAssessment)
      if (this.contentForm.controls.selfAssessment.value) {
        this.selectedSelfCompetency = true
      }
      if (res.competencies_v1) {
        this.getAllEntity()
        this.competencies = JSON.parse(res.competencies_v1)
        console.log("this.competencies", res)
      } else {
        this.competencies = []
      }
      if (res.children.length > 0) {
        this.loader.changeLoad.next(true)
        res.children.forEach((element: any) => {
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
          console.log(this.sumDuration.toString(), this.contentMeta.duration)
          if (this.sumDuration.toString() !== this.contentMeta.duration) {
            let requestBody: any
            requestBody = {
              request: {
                content: {
                  duration: isNumber(this.sumDuration) ?
                    this.sumDuration.toString() : this.sumDuration,
                  versionKey: res.versionKey
                },
              }
            }
            this.editorService.updateNewContentV3(_.omit(requestBody, ['resourceType']), this.contentMeta.identifier).subscribe((response: any) => {
              // tslint:disable-next-line:no-console
              console.log(response)
            })
          }
          this.loader.changeLoad.next(false)
          this.setDuration(this.sumDuration)
        }
        this.loader.changeLoad.next(false)
      } else {

      }

    })
    Object.keys(this.contentForm.controls).map(v => {
      try {
        if (
          this.contentMeta[v as keyof NSContent.IContentMeta] ||
          (this.authInitService.authConfig[v as keyof IFormMeta].type === 'boolean' &&
            this.contentMeta[v as keyof NSContent.IContentMeta] === false)
        ) {
          this.contentForm.controls[v].setValue(this.contentMeta[v as keyof NSContent.IContentMeta])
        } else {
          if (v === 'expiryDate') {
            this.contentForm.controls[v].setValue(
              new Date(new Date().setMonth(new Date().getMonth() + 60)),
            )
          } else {
            this.contentForm.controls[v].setValue(
              JSON.parse(
                JSON.stringify(
                  this.authInitService.authConfig[v as keyof IFormMeta].defaultValue[
                    this.contentMeta.contentType
                    // tslint:disable-next-line: ter-computed-property-spacing
                  ][0].value,
                ),
              ),
            )
          }
        }
        //this.contentForm.controls.isIframeSupported.setValue(this.contentMeta.isIframeSupported)
        this.contentForm.controls.sourceName.setValue(this.contentMeta.sourceName)
        this.contentForm.controls.lang.setValue(this.contentMeta.lang)
        this.contentForm.controls.gatingEnabled.setValue(this.contentMeta.gatingEnabled)
        this.contentForm.controls.issueCertification.setValue(this.contentMeta.issueCertification === undefined ? false : this.contentMeta.issueCertification)

        if (this.contentMeta.competencies_v1) {
          // this.getAllEntity()
          this.competencies = JSON.parse(this.contentMeta.competencies_v1)
        }
        if (this.isSubmitPressed) {
          this.contentForm.controls[v].markAsDirty()
          this.contentForm.controls[v].markAsTouched()
        } else {
          this.contentForm.controls[v].markAsPristine()
          this.contentForm.controls[v].markAsUntouched()
        }
      } catch (ex) { }
    })
    this.canUpdate = true
    this.storeData()
    if (this.isSubmitPressed) {
      this.contentForm.markAsDirty()
      this.contentForm.markAsTouched()
    } else {
      this.contentForm.markAsPristine()
      this.contentForm.markAsUntouched()
    }
  }
  getAllEntity() {
    this.editorService.getAllEntities().subscribe(async (res: any) => {
      this.proficiencyList = await res.result.response
      let combinedArray = ''
      if (this.competencies && this.competencies.length > 0) {
        combinedArray = this.competencies.map((element: any) => {
          const matchingValue = this.proficiencyList.find((value: any) => value.id == element.competencyId)

          const finalComp = {
            ...element,
            ...matchingValue.additionalProperties
          }
          return finalComp
        })
      }

      this.addedCompetency = combinedArray
      // this.code = this.competencies.map((entity: any) => this.proficiencyList.find((e: any) => e.id = entity.competencyId))
      // console.log("this.proficiencyList", combinedArray)
    })
  }
  convertToISODate(date = ''): Date {
    try {
      return new Date(
        `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}${date.substring(
          8,
          11,
        )}:${date.substring(11, 13)}:${date.substring(13, 15)}.000Z`,
      )
    } catch (ex) {
      return new Date(new Date().setMonth(new Date().getMonth() + 6))
    }
  }

  changeMimeType() {
    const artifactUrl = this.contentForm.controls.artifactUrl ? this.contentForm.controls.artifactUrl.value : ''
    if (this.contentForm.controls.contentType.value === 'Course') {
      this.contentForm.controls.mimeType.setValue('application/vnd.ekstep.content-collection')
    } else {
      this.contentForm.controls.mimeType.setValue('application/html')
      if (
        this.configSvc.instanceConfig &&
        this.configSvc.instanceConfig.authoring &&
        this.configSvc.instanceConfig.authoring.urlPatternMatching
      ) {
        this.configSvc.instanceConfig.authoring.urlPatternMatching.map(v => {
          if (artifactUrl.match(v.pattern) && v.allowIframe && v.source === 'youtube') {
            this.contentForm.controls.mimeType.setValue('video/x-youtube')
          }
        })
      }
    }
  }

  changeResourceType() {
    if (this.contentForm.controls.contentType.value === 'Resource') {
      this.resourceTypes = this.ordinals.resourceType || this.ordinals.categoryType || []
    } else {
      this.resourceTypes = this.ordinals['Offering Mode'] || this.ordinals.categoryType || []
    }

    if (this.resourceTypes.indexOf(this.contentForm.controls.categoryType.value) < 0) {
      this.contentForm.controls.resourceType.setValue('')
    }
  }

  private setDuration(seconds: any) {
    const minutes = seconds > 59 ? Math.floor(seconds / 60) : 0
    const second = seconds % 60
    this.hours = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
    this.minutes = minutes ? minutes % 60 : 0
    this.seconds = second || 0
  }

  timeToSeconds() {
    let total = 0
    total += this.seconds ? (this.seconds < 60 ? this.seconds : 59) : 0
    total += this.minutes ? (this.minutes < 60 ? this.minutes : 59) * 60 : 0
    total += this.hours ? this.hours * 60 * 60 : 0
    this.contentForm.controls.duration.setValue(total)
  }

  showInfo(type: string) {
    this.infoType = this.infoType === type ? '' : type
  }

  storeData() {
    try {
      const originalMeta = this.contentService.getOriginalMeta(this.contentMeta.identifier)
      if (originalMeta && this.isEditEnabled) {
        const expiryDate = this.contentForm.value.expiryDate
        const currentMeta: NSContent.IContentMeta = JSON.parse(JSON.stringify(this.contentForm.value))
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
              currentMeta.subTitle = parentData.subTitle !== '' ? parentData.subTitle.trim() : currentMeta.subTitle.trim()
              currentMeta.purpose = parentData.subTitle !== '' ? parentData.subTitle.trim() : currentMeta.subTitle.trim()
            }
            if (!currentMeta.body) {
              currentMeta.body = parentData.body !== '' ? parentData.body : currentMeta.body
            }

            if (!currentMeta.instructions) {
              currentMeta.instructions = parentData.instructions !== '' ? parentData.instructions.trim() : currentMeta.instructions.trim()
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
        if (this.canExpiry) {
          currentMeta.expiryDate = `${expiryDate
            .toISOString()
            .replace(/-/g, '')
            .replace(/:/g, '')
            .split('.')[0]
            }+0000`
        }
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
              meta[v as keyof NSContent.IContentMeta] = currentMeta[v as keyof NSContent.IContentMeta]
            } else {
              if (this.authInitService.authConfig[v as keyof IFormMeta] && this.authInitService.authConfig[v as keyof IFormMeta].defaultValue) {
                if (v !== 'isIframeSupported') {
                  meta[v as keyof NSContent.IContentMeta] = JSON.parse(
                    JSON.stringify(
                      this.authInitService.authConfig[v as keyof IFormMeta].defaultValue[
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

          // else if(v === 'visibility') {
          //   console.log('VISIBILITY ', currentMeta['contentType'])
          //   if(currentMeta['contentType'] === 'Resource' && originalMeta['depth'] === 2 && currentMeta[v] !== 'Parent') {
          //     console.log('%c RESOURCE DEPTH 2 ', 'color: #d9388b', meta[v], currentMeta[v])
          //       meta[v as keyof NSContent.IContentMeta] = 'Parent'
          //   } else if(currentMeta['contentType'] === 'Resource' && originalMeta['depth'] === 1) {
          //     console.log('%c RESOURCE DEPTH 1 ', 'color: #38d9c9')
          //   } else if(currentMeta['contentType'] === 'CourseUnit' && currentMeta[v] !== 'Parent') {
          //     console.log('%c COURSE UNIT ', 'color: #f5ec3d', meta[v],  currentMeta[v])
          //       meta[v as keyof NSContent.IContentMeta] = 'Parent'
          //   }
          // }
        })

        if (this.stage >= 1 && !this.type) {
          delete meta.artifactUrl
        }
        this.contentService.setUpdatedMeta(meta, this.contentMeta.identifier)

      }
    } catch (ex) {
      // tslint:disable-next-line:no-console
      console.log(ex)
      this.snackBar.open('Please Save Parent first and refresh page.')
      if (ex) {
        // this.saveParent = true
        // this.emitSaveData(true)
      }
      // this.contentService.parentContent
    }
  }
  // emitSaveData(flag: boolean) {
  //   if (flag) {
  //     //this.saveParent = 1
  //     //if (this.saveParent === 1) {
  //       this.data.emit('save')
  //     //}
  //     //this.saveParent = 2
  //   }
  // }

  updateContentService(meta: string, value: any, event = false) {
    this.contentForm.controls[meta].setValue(value, { events: event })
    this.contentService.setUpdatedMeta({ [meta]: value } as any, this.contentMeta.identifier)
  }

  formNext(index: number) {
    this.selectedIndex = index
  }

  addKeyword(event: MatChipInputEvent): void {
    const input = event.input
    event.value
      .split(/[,]+/)
      .map((val: string) => val.trim())
      .forEach((value: string) => this.optionSelected(value))
    input.value = ''
  }

  addReferences(event: MatChipInputEvent): void {
    const input = event.input
    const value = event.value

    // Add our fruit
    if ((value || '').trim().length) {
      const oldArray = this.contentForm.controls.references.value || []
      oldArray.push({ title: '', url: value })
      this.contentForm.controls.references.setValue(oldArray)
    }

    // Reset the input value
    if (input) {
      input.value = ''
    }
  }

  removeKeyword(keyword: any): void {
    const index = this.contentForm.controls.keywords.value.indexOf(keyword)
    this.contentForm.controls.keywords.value.splice(index, 1)
    this.contentForm.controls.keywords.setValue(this.contentForm.controls.keywords.value)
  }

  removeReferences(index: number): void {
    this.contentForm.controls.references.value.splice(index, 1)
    this.contentForm.controls.references.setValue(this.contentForm.controls.references.value)
  }

  compareSkillFn(value1: { identifier: string }, value2: { identifier: string }) {
    return value1 && value2 ? value1.identifier === value2.identifier : value1 === value2
  }

  addCreatorDetails(event: MatChipInputEvent): void {
    const input = event.input
    const value = (event.value || '').trim()
    if (value) {
      this.contentForm.controls.creatorDetails.value.push({ id: '', name: value })
      this.contentForm.controls.creatorDetails.setValue(
        this.contentForm.controls.creatorDetails.value,
      )
    }
    // Reset the input value
    if (input) {
      input.value = ''
    }
  }

  removeCreatorDetails(keyword: any): void {
    const index = this.contentForm.controls.creatorDetails.value.indexOf(keyword)
    this.contentForm.controls.creatorDetails.value.splice(index, 1)
    this.contentForm.controls.creatorDetails.setValue(
      this.contentForm.controls.creatorDetails.value,
    )
  }

  addToFormControl(event: MatAutocompleteSelectedEvent, fieldName: string): void {
    const value = (event.option.value || '').trim()
    if (value && this.contentForm.controls[fieldName].value.indexOf(value) === -1) {
      this.contentForm.controls[fieldName].value.push(value)
      this.contentForm.controls[fieldName].setValue(this.contentForm.controls[fieldName].value)
    }

    this[`${fieldName}View` as keyof EditMetaComponent].nativeElement.value = ''
    this[`${fieldName}Ctrl` as keyof EditMetaComponent].setValue(null)
  }

  removeFromFormControl(keyword: any, fieldName: string): void {
    const index = this.contentForm.controls[fieldName].value.indexOf(keyword)
    this.contentForm.controls[fieldName].value.splice(index, 1)
    this.contentForm.controls[fieldName].setValue(this.contentForm.controls[fieldName].value)
  }

  conceptToggle() {
    this.addConcepts = !this.addConcepts
  }

  // uploadAppIcon(file: File) {
  //   const formdata = new FormData()
  //   const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
  //   if (
  //     !(
  //       IMAGE_SUPPORT_TYPES.indexOf(
  //         `.${fileName
  //           .toLowerCase()
  //           .split('.')
  //           .pop()}`,
  //       ) > -1
  //     )
  //   ) {
  //     this.snackBar.openFromComponent(NotificationComponent, {
  //       data: {
  //         type: Notify.INVALID_FORMAT,
  //       },
  //       duration: NOTIFICATION_TIME * 1000,
  //     })
  //     return
  //   }

  //   if (file.size > IMAGE_MAX_SIZE) {
  //     this.snackBar.openFromComponent(NotificationComponent, {
  //       data: {
  //         type: Notify.SIZE_ERROR,
  //       },
  //       duration: NOTIFICATION_TIME * 1000,
  //     })
  //     return
  //   }

  //   const dialogRef = this.dialog.open(NewImageCropComponent, {
  //     width: '70%',
  //     data: {
  //       isRoundCrop: false,
  //       imageFile: file,
  //       width: 265,
  //       height: 150,
  //       isThumbnail: true,
  //       imageFileName: fileName,
  //     },
  //   })

  //   dialogRef.afterClosed().subscribe({
  //     next: (result: File) => {
  //       if (result) {
  //         formdata.append('content', result, fileName)
  //         this.loader.changeLoad.next(true)
  //         this.uploadService
  //           .upload(formdata, {
  //             contentId: this.contentMeta.identifier,
  //             contentType: CONTENT_BASE_STATIC,
  //           })
  //           .subscribe(
  //             data => {
  //               if (data.code) {
  //                 this.loader.changeLoad.next(false)
  //                 this.canUpdate = false
  //                 this.contentForm.controls.appIcon.setValue(data.artifactURL)
  //                 this.contentForm.controls.thumbnail.setValue(data.artifactURL)
  //                 this.contentForm.controls.posterImage.setValue(data.artifactURL)
  //                 this.canUpdate = true
  //                 this.storeData()
  //                 this.snackBar.openFromComponent(NotificationComponent, {
  //                   data: {
  //                     type: Notify.UPLOAD_SUCCESS,
  //                   },
  //                   duration: NOTIFICATION_TIME * 1000,
  //                 })
  //               }
  //             },
  //             () => {
  //               this.loader.changeLoad.next(false)
  //               this.snackBar.openFromComponent(NotificationComponent, {
  //                 data: {
  //                   type: Notify.UPLOAD_FAIL,
  //                 },
  //                 duration: NOTIFICATION_TIME * 1000,
  //               })
  //             },
  //           )
  //       }
  //     },
  //   })
  // }
  // uploadSourceIcon(file: File) {
  //   const formdata = new FormData()
  //   const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
  //   if (
  //     !(
  //       IMAGE_SUPPORT_TYPES.indexOf(
  //         `.${fileName
  //           .toLowerCase()
  //           .split('.')
  //           .pop()}`,
  //       ) > -1
  //     )
  //   ) {
  //     this.snackBar.openFromComponent(NotificationComponent, {
  //       data: {
  //         type: Notify.INVALID_FORMAT,
  //       },
  //       duration: NOTIFICATION_TIME * 1000,
  //     })
  //     return
  //   }

  //   if (file.size > IMAGE_MAX_SIZE) {
  //     this.snackBar.openFromComponent(NotificationComponent, {
  //       data: {
  //         type: Notify.SIZE_ERROR,
  //       },
  //       duration: NOTIFICATION_TIME * 1000,
  //     })
  //     return
  //   }

  //   const dialogRef = this.dialog.open(NewImageCropComponent, {
  //     width: '70%',
  //     data: {
  //       isRoundCrop: false,
  //       imageFile: file,
  //       width: 72,
  //       height: 72,
  //       isThumbnail: true,
  //       imageFileName: fileName,
  //     },
  //   })

  //   dialogRef.afterClosed().subscribe({
  //     next: (result: File) => {
  //       if (result) {
  //         formdata.append('content', result, fileName)
  //         this.loader.changeLoad.next(true)
  //         this.uploadService
  //           .upload(formdata, {
  //             contentId: this.contentMeta.identifier,
  //             contentType: CONTENT_BASE_STATIC,
  //           })
  //           .subscribe(
  //             data => {
  //               if (data.code) {
  //                 this.loader.changeLoad.next(false)
  //                 this.canUpdate = false
  //                 this.contentForm.controls.creatorLogo.setValue(data.artifactURL)
  //                 this.contentForm.controls.creatorThumbnail.setValue(data.artifactURL)
  //                 this.contentForm.controls.creatorPosterImage.setValue(data.artifactURL)
  //                 this.canUpdate = true
  //                 this.storeData()
  //                 this.snackBar.openFromComponent(NotificationComponent, {
  //                   data: {
  //                     type: Notify.UPLOAD_SUCCESS,
  //                   },
  //                   duration: NOTIFICATION_TIME * 1000,
  //                 })
  //               }
  //             },
  //             () => {
  //               this.loader.changeLoad.next(false)
  //               this.snackBar.openFromComponent(NotificationComponent, {
  //                 data: {
  //                   type: Notify.UPLOAD_FAIL,
  //                 },
  //                 duration: NOTIFICATION_TIME * 1000,
  //               })
  //             },
  //           )
  //       }
  //     },
  //   })
  // }

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

    const dialogRef = this.dialog.open(NewImageCropComponent, {
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
                        this.contentForm.controls.appIcon.setValue(this.generateUrl(data.artifactUrl))
                        this.contentForm.controls.thumbnail.setValue(this.generateUrl(data.artifactUrl))
                        this.canUpdate = true
                        // this.data.emit('save')
                        this.storeData()
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
  uploadSourceIcon(file: File) {
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

    const dialogRef = this.dialog.open(NewImageCropComponent, {
      width: '70%',
      data: {
        isRoundCrop: false,
        imageFile: file,
        width: 72,
        height: 72,
        isThumbnail: true,
        imageFileName: fileName,
      },
    })

    dialogRef.afterClosed().subscribe({
      next: (result: File) => {
        if (result) {
          formdata.append('content', result, fileName)
          this.loader.changeLoad.next(true)
          this.uploadService
            .upload(formdata, {
              contentId: this.contentMeta.identifier,
              contentType: CONTENT_BASE_STATIC,
            })
            .subscribe(
              data => {
                if (data.result) {
                  this.loader.changeLoad.next(false)
                  this.canUpdate = false
                  this.contentForm.controls.creatorLogo.setValue(data.result.artifactUrl)
                  this.contentForm.controls.creatorThumbnail.setValue(data.result.artifactUrl)
                  this.contentForm.controls.creatorPosterImage.setValue(data.result.artifactUrl)
                  this.canUpdate = true
                  this.storeData()
                  this.snackBar.openFromComponent(NotificationComponent, {
                    data: {
                      type: Notify.UPLOAD_SUCCESS,
                    },
                    duration: NOTIFICATION_TIME * 1000,
                  })
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
        }
      },
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

  showError(meta: string) {
    if (
      this.contentService.checkCondition(this.contentMeta.identifier, meta, 'required') &&
      !this.contentService.isPresent(meta, this.contentMeta.identifier)
    ) {
      if (this.isSubmitPressed) {
        return true
      }
      if (this.contentForm.controls[meta] && this.contentForm.controls[meta].touched) {
        return true
      }
      return false
    }
    return false
  }

  removeEmployee(employee: NSContent.IAuthorDetails, field: string): void {
    const index = this.contentForm.controls[field].value.indexOf(employee)
    this.contentForm.controls[field].value.splice(index, 1)
    this.contentForm.controls[field].setValue(this.contentForm.controls[field].value)
  }

  addEmployee(event: MatAutocompleteSelectedEvent, field: string) {
    if (event.option.value && event.option.value.id) {
      this.loader.changeLoad.next(true)
      const observable = ['trackContacts', 'publisherDetails'].includes(field) &&
        this.accessService.authoringConfig.doUniqueCheck
        ? this.editorService
          .checkRole(event.option.value.id)
          .pipe(
            map(
              (v: string[]) =>
                v.includes('admin') ||
                v.includes('editor') ||
                (field === 'trackContacts' && v.includes('reviewer')) ||
                (field === 'publisherDetails' && v.includes('publisher')) ||
                (field === 'publisherDetails' && event.option.value.id === this.accessService.userId),
            ),
          )
        : of(true)
      observable.subscribe(
        (data: boolean) => {
          if (data) {
            this.contentForm.controls[field].value.push({
              id: event.option.value.id,
              name: event.option.value.displayName,
            })
            this.contentForm.controls[field].setValue(this.contentForm.controls[field].value)
          } else {
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.NO_ROLE,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          }
          this[`${field}View` as keyof EditMetaComponent].nativeElement.value = ''
          this[`${field}Ctrl` as keyof EditMetaComponent].setValue(null)
        },
        () => {
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
        () => {
          this.loader.changeLoad.next(false)
          this[`${field}View` as keyof EditMetaComponent].nativeElement.value = ''
          this[`${field}Ctrl` as keyof EditMetaComponent].setValue(null)
        },
      )
    }
  }

  removeField(event: MatChipInputEvent) {
    // Reset the input value
    if (event.input) {
      event.input.value = ''
    }
  }

  private fetchAudience() {
    if ((this.audienceCtrl.value || '').trim()) {
      this.audienceList = this.ordinals.audience.filter(
        (v: any) => v.toLowerCase().indexOf(this.audienceCtrl.value.toLowerCase()) > -1,
      )
    } else {
      this.audienceList = this.ordinals.audience.slice()
    }
  }

  private fetchJobProfile() {
    if ((this.jobProfileCtrl.value || '').trim()) {
      this.jobProfileList = this.ordinals.jobProfile.filter(
        (v: any) => v.toLowerCase().indexOf(this.jobProfileCtrl.value.toLowerCase()) > -1,
      )
    } else {
      this.jobProfileList = this.ordinals.jobProfile.slice()
    }
  }

  private fetchRegion() {
    if ((this.regionCtrl.value || '').trim()) {
      this.regionList = this.ordinals.region.filter(
        (v: any) => v.toLowerCase().indexOf(this.regionCtrl.value.toLowerCase()) > -1,
      )
    } else {
      this.regionList = []
    }
  }

  private fetchAccessRestrictions() {
    if (this.accessPathsCtrl.value.trim()) {
      this.accessPathList = this.ordinals.accessPaths.filter((v: any) => v.toLowerCase().
        indexOf(this.accessPathsCtrl.value.toLowerCase()) === 0)
    } else {
      this.accessPathList = this.ordinals.accessPaths.slice()
    }
  }

  checkCondition(meta: string, type: 'show' | 'required' | 'disabled'): boolean {
    if (type === 'disabled' && !this.isEditEnabled) {
      return true
    }
    return this.contentService.checkCondition(this.contentMeta.identifier, meta, type)
  }

  createForm() {
    this.contentForm = this.formBuilder.group({
      accessPaths: [],
      accessibility: [],
      appIcon: new FormControl('', [Validators.required]),
      artifactUrl: [],
      audience: [],
      body: [],
      catalogPaths: [],
      category: [],
      categoryType: [],
      certificationList: [],
      certificationUrl: [],
      clients: [],
      complexityLevel: [],
      concepts: [],
      contentIdAtSource: [],
      contentType: [],
      creatorContacts: [],
      customClassifiers: [],
      description: [],
      dimension: [],
      duration: new FormControl('', [Validators.required]),
      editors: [],
      equivalentCertifications: [],
      expiryDate: [],
      exclusiveContent: [],
      idealScreenSize: [],
      identifier: [],
      introductoryVideo: [],
      introductoryVideoIcon: [],
      isExternal: [],
      // isIframeSupported: [],
      // isRejected: [],
      fileType: [],
      jobProfile: [],
      kArtifacts: [],
      keywords: [],
      learningMode: [],
      learningObjective: [],
      learningTrack: [],
      locale: [],
      mimeType: [],
      name: [],
      nodeType: [],
      org: [],
      gatingEnabled: new FormControl(''),
      courseVisibility: new FormControl(''),
      selfAssessment: new FormControl(''),
      issueCertification: false,
      creatorDetails: [],
      // passPercentage: [],
      plagScan: [],
      playgroundInstructions: [],
      playgroundResources: [],
      postContents: [],
      posterImage: [],
      preContents: [],
      preRequisites: [],
      projectCode: [],
      publicationId: [],
      publisherDetails: [],
      references: [],
      region: [],
      registrationInstructions: [],
      resourceCategory: [],
      resourceType: [],
      sampleCertificates: [],
      skills: [],
      softwareRequirements: [],
      sourceName: new FormControl(''),
      creatorLogo: [],
      creatorPosterImage: [],
      creatorThumbnail: [],
      status: [],
      // studyDuration: [],
      studyMaterials: [],
      subTitle: new FormControl('', [Validators.required]),
      subTitles: [],
      systemRequirements: [],
      thumbnail: new FormControl('', [Validators.required]),
      trackContacts: [],
      transcoding: [],
      unit: [],
      verifiers: [],
      visibility: [],
      instructions: new FormControl('', [Validators.required]),
      versionKey: '',  // (new Date()).getTime()
      purpose: '',
      lang: new FormControl(''),
      cneName: new FormControl('')
    })
    // tslint:disable-next-line:no-console
    console.log("form validation", this.contentForm)

    this.contentForm.valueChanges.pipe(debounceTime(500)).subscribe(() => {
      if (this.canUpdate) {
        this.storeData()
        // this.contentForm.controls.publisherDetails.setValue(
        //   this.contentForm.controls.publisherDetails.value
        // )

        // this.contentForm.controls.trackContacts.setValue(
        //   this.contentForm.controls.trackContacts.value
        // )
      }
    })

    this.contentForm.controls.contentType.valueChanges.subscribe(() => {
      this.changeResourceType()
      this.filterOrdinals()
      this.changeMimeType()
      this.contentForm.controls.category.setValue(this.contentForm.controls.contentType.value)
    })

    if (this.stage === 1) {
      this.contentForm.controls.creatorContacts.valueChanges.subscribe(() => {
        this.contentForm.controls.publisherDetails.setValue(
          this.contentForm.controls.creatorContacts.value || [],
        )
      })
    }

    //     this.contentForm.controls.publisherDetails.valueChanges.subscribe(() => {
    //   this.contentForm.controls.publisherDetails.setValue(
    //     this.contentForm.controls.publisherDetails.value || [],
    //   )
    // })

    // resourceType
    this.contentForm.controls.resourceType.valueChanges.subscribe(() => {
      this.contentForm.controls.categoryType.setValue(this.contentForm.controls.resourceType.value)
      // this.contentForm.controls.resourceType.setValue(this.contentForm.controls.resourceType.value)
    })

    this.contentForm.controls.resourceCategory.valueChanges.subscribe(() => {
      this.contentForm.controls.customClassifiers.setValue(
        this.contentForm.controls.resourceCategory.value,
      )
    })
  }

  setPurposeValue(sub: any) {
    this.contentForm.controls.purpose.setValue(sub.trim())
  }
  openCatalogSelector() {
    const oldCatalogs = this.addCommonToCatalog(this.contentForm.controls.catalogPaths.value)
    const dialogRef = this.dialog.open(CatalogSelectComponent, {
      width: '70%',
      maxHeight: '90vh',

      data: JSON.parse(JSON.stringify(oldCatalogs)),
    })
    dialogRef.afterClosed().subscribe((response: string[]) => {
      // const catalogs = this.removeCommonFromCatalog(response)
      this.contentForm.controls.catalogPaths.setValue(response)
    })
  }

  removeSkill(skill: string) {
    const index = this.selectedSkills.indexOf(skill)
    this.selectedSkills.splice(index, 1)
  }

  // removeCatalog(index: number) {
  //   const catalogs = this.contentForm.controls.catalogPaths.value
  //   catalogs.splice(index, 1)
  //   this.contentForm.controls.catalogPaths.setValue(catalogs)
  // }

  // removeCommonFromCatalog(catalogs: string[]): string[] {
  //   const newCatalog: any[] = []
  //   catalogs.forEach(catalog => {
  //     let start = 0
  //     let end = 0
  //     start = catalog.indexOf('>')
  //     end = catalog.length
  //     newCatalog.push(catalog.slice(start + 1, end))
  //   })
  //   return newCatalog
  // }

  copyData(type: 'keyword' | 'previewUrl') {
    const parentId = this.contentService.parentUpdatedMeta().identifier
    const selBox = document.createElement('textarea')
    selBox.style.position = 'fixed'
    selBox.style.left = '0'
    selBox.style.top = '0'
    selBox.style.opacity = '0'
    if (type === 'keyword') {
      selBox.value = this.contentForm.controls.keywords.value
    } else if (type === 'previewUrl') {
      // selBox.value =
      //   // tslint:disable-next-line: max-line-length
      //   `${window.location.origin}/viewer/${VIEWER_ROUTE_FROM_MIME(
      //     this.contentForm.controls.mimeType.value,
      //   )}/${this.contentMeta.identifier}?preview=true`

      selBox.value =
        // tslint:disable-next-line: max-line-length
        `${window.location.origin}/author/viewer/${VIEWER_ROUTE_FROM_MIME(
          this.contentForm.controls.mimeType.value,
        )}/${this.contentMeta.identifier}?collectionId=${parentId}&collectionType=Course`
    }
    document.body.appendChild(selBox)
    selBox.focus()
    selBox.select()
    document.execCommand('copy')
    document.body.removeChild(selBox)
    this.snackBar.openFromComponent(NotificationComponent, {
      data: {
        type: Notify.COPY,
      },
      duration: NOTIFICATION_TIME * 1000,
    })
  }

  addCommonToCatalog(catalogs: string[]): string[] {
    const newCatalog: any[] = []
    catalogs.forEach(catalog => {
      const prefix = 'Common>'
      if (catalog.indexOf(prefix) > -1) {
        newCatalog.push(catalog)
      } else {
        newCatalog.push(prefix.concat(catalog))
      }
    })
    return newCatalog
  }

  updateReviewer() {
    // this.contentForm.controls.trackContacts.setValue([{ id: '7983c8e5-6365-48cf-8a3c-fd1060fb0bbe', name: 'AnkitVerma' }])
    // this.contentForm.controls.publisherDetails.setValue([{ id: '7983c8e5-6365-48cf-8a3c-fd1060fb0bbe', name: 'AnkitVerma' }])
  }

  public parseJsonData(s: string) {
    try {
      const parsedString = JSON.parse(s)
      return parsedString
    } catch {
      return []
    }
  }

  onSubmit() {
    this.courseEditFormSubmit.emit(true)
  }

  moduleCreate(name: string) {
    this.moduleName = name
    this.isSaveModuleFormEnable = true
    this.moduleButtonName = 'Save'
  }

}
