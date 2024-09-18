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
import { ImageCropComponent } from '@ws-widget/utils/src/public-api'
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
import { IFormMeta } from '../../../../../../interface/form'
import { AccessControlService } from '../../../../../../modules/shared/services/access-control.service'
import { AuthInitService } from '../../../../../../services/init.service'
import { LoaderService } from '../../../../../../services/loader.service'
import { CollectionStoreService } from './../../../routing/modules/collection/services/store.service'
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
@Component({
  selector: 'ws-auth-course-settings',
  templateUrl: './course-settings.component.html',
  styleUrls: ['./course-settings.component.scss'],
})
export class CourseSettingsComponent implements OnInit, OnDestroy, AfterViewInit {
  contentMeta!: NSContent.IContentMeta
  @Output() data = new EventEmitter<string>()
  @Output() courseEditFormSubmit = new EventEmitter<boolean>()
  @Input() isSubmitPressed = false
  @Input() nextAction = 'done'
  @Input() stage = 1
  @Input() type = ''
  location = CONTENT_BASE_STATIC
  selectable = true
  removable = true
  addOnBlur = true
  addConcepts = false
  isFileUploaded = false
  fileUploadForm!: FormGroup
  creatorContactsCtrl!: FormControl
  trackContactsCtrl!: FormControl
  publisherDetails!: FormControl
  trackContacts!: FormControl
  activateLink!: FormControl
  previewLinkFormControl!: FormControl
  publisherDetailsCtrl!: FormControl
  editorsCtrl!: FormControl
  creatorDetailsCtrl!: FormControl
  audienceCtrl!: FormControl
  rolesMappedCtrl!: FormControl
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
  rolesMappedListData!: any
  rolesMappedListValuesData!: any
  rolesArray!: any
  rolesMappedList: any[] = []
  jobProfileList: any[] = []
  regionList: any[] = []
  accessPathList: any[] = []
  infoType = ''
  isSiemens = false
  fetchTagsStatus: 'done' | 'fetching' | null = null
  readonly separatorKeysCodes: number[] = [ENTER, COMMA]
  selectedIndex = 0
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
  // issueCertification!: FormControl
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
    }
  ]
  proficiency: any
  isAddCerticate: boolean = false;
  isEnableTitle: boolean = true
  mainCourseDuration: string = ''
  isSelfAssessment: boolean = false
  @ViewChild('creatorContactsView', { static: false }) creatorContactsView!: ElementRef
  @ViewChild('trackContactsView', { static: false }) trackContactsView!: ElementRef
  @ViewChild('publisherDetailsView', { static: false }) publisherDetailsView!: ElementRef
  @ViewChild('editorsView', { static: false }) editorsView!: ElementRef
  @ViewChild('creatorDetailsView', { static: false }) creatorDetailsView!: ElementRef
  @ViewChild('audienceView', { static: false }) audienceView!: ElementRef
  @ViewChild('rolesMappedView', { static: false }) rolesMappedView!: ElementRef
  @ViewChild('jobProfileView', { static: false }) jobProfileView!: ElementRef
  @ViewChild('regionView', { static: false }) regionView!: ElementRef
  @ViewChild('accessPathsView', { static: false }) accessPathsView!: ElementRef
  @ViewChild('keywordsSearch', { static: true }) keywordsSearch!: ElementRef<any>

  timer: any

  filteredOptions$: Observable<string[]> = of([])
  saveParent: any
  courseData: any
  //UI variables
  moduleName: string = 'undefined title';
  isSaveModuleFormEnable: boolean = false;
  moduleButtonName: string = 'Create';
  roles$!: Observable<any[]>
  userId!: any
  givenName!: any
  getAllEntities: any
  proficiencyList: any[] = [];
  competencies_v1: any

  constructor(
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
    private storeService: CollectionStoreService,

  ) {
    if (this.configSvc.userProfile) {
      this.userId = this.configSvc.userProfile.userId
      this.givenName = this.configSvc.userProfile.givenName

    }
    this.getAllEntities = this.editorService.getAllEntities().subscribe(async (res: any) => {
      this.proficiencyList = await res.result.response
      this.searchComp = this.proficiencyList
      console.log("yes shree", this.proficiencyList)
      if (this.isSelfAssessment)
        this.initializeForm()

    })
  }

  async ngAfterViewInit() {
    this.editorService.readcontentV3(this.contentService.parentUpdatedMeta().identifier).subscribe(async (data: any) => {
      this.courseData = await data

      if (data.duration) {
        const minutes = data.duration > 59 ? Math.floor(data.duration / 60) : 0
        const second = data.duration % 60
        const hour = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
        const minute = minutes ? minutes % 60 : 0
        const seconds = second || 0
        this.mainCourseDuration = hour + ':' + minute + ':' + seconds
      }
    })

    this.ref.detach()
    this.timer = setInterval(() => {
      this.ref.detectChanges()
      // tslint:disable-next-line: align
    }, 100)
  }
  rolesSubscription!: Subscription
  searchComp: any = ''

  contentForm!: FormGroup
  ngOnInit() {

    // this.getAllEntities = this.editorService.getAllEntities().subscribe(async (res: any) => {
    //   this.proficiencyList = await res.result.response
    //   this.proficiencyList = this.proficiencyList.map((item: any) => ({
    //     competencyId: item.id,
    //     competencyName: item.name,
    //     code: item.additionalProperties.Code
    //   }))
    // })
    this.searchComp = this.proficiencyList
    this.ordinals = this.authInitService.ordinals
    this.audienceList = this.ordinals.audience
    this.jobProfileList = this.ordinals.jobProfile
    this.complexityLevelList = this.ordinals.audience
    this.authInitService.currentPageAction('courseSettingsPage')

    const url = this.router.url
    const id = url.split('/')
    this.contentService.currentContentID = id[3]
    this.contentService.changeActiveCont.next(id[3])
    // this.roles$ = this.editorService.rolesMappingAPI().subscribe(async (data: any) => {
    //   if (data) {
    //     this.rolesArray = await Object.entries(data).map(([key, value]) => ({ [key]: value }))
    //     this.rolesMappedListData = await Object.keys(data)
    //     console.log("yes here", Object.keys(data), this.rolesMappedListData)

    //   }
    // })

    this.roles$ = this.editorService.rolesMapped() // Assign the observable
    this.rolesSubscription = this.roles$.subscribe(async (data: any) => {
      console.log(data)
      if (data) {
        // this.rolesArray = await Object.entries(data).map(([key, value]) => ({ [key]: value }))
        // this.rolesMappedListData = await Object.keys(data)
        // this.rolesMappedList = await Object.keys(data)
        this.rolesArray = data
        this.rolesMappedListData = data
        this.rolesMappedList = data
        // console.log("yes here", data, this.rolesArray, this.rolesMappedListData)
        // this.getFilterData(this.rolesMappedList, this.contentForm.controls.rolesMapped.value)
      }
    })
    this.isSiemens = this.accessService.rootOrg.toLowerCase() === 'siemens'
    this.ordinals = this.authInitService.ordinals
    this.audienceList = this.ordinals.audience
    this.rolesMappedList = this.rolesMappedListData

    this.jobProfileList = this.ordinals.jobProfile
    this.complexityLevelList = this.ordinals.audience

    this.creatorContactsCtrl = new FormControl()
    this.trackContactsCtrl = new FormControl()
    this.activateLink = new FormControl()
    this.previewLinkFormControl = new FormControl()
    this.publisherDetailsCtrl = new FormControl()
    this.editorsCtrl = new FormControl()
    this.creatorDetailsCtrl = new FormControl()
    this.keywordsCtrl = new FormControl('')
    this.audienceCtrl = new FormControl()
    this.rolesMappedCtrl = new FormControl()
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
          // tslint:disable-next-line:no-console
          console.log(users)

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
          // tslint:disable-next-line:no-console
          console.log(value)

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
    this.rolesMappedCtrl.valueChanges.subscribe(() => this.fetchRolesMapped())

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

    this.contentService.changeActiveCont.subscribe(data => {
      if (this.contentMeta && this.canUpdate) {
        this.storeData()
      }
      this.content = this.contentService.getUpdatedMeta(data)
    })

    // this.filteredOptions$ = this.keywordsCtrl.valueChanges.pipe(
    //   startWith(this.keywordsCtrl.value),
    //   debounceTime(500),
    //   distinctUntilChanged(),
    //   switchMap(value => this.interestSvc.fetchAutocompleteInterestsV2(value)),
    // )
  }

  async eventSelection(event: any) {

    this.contentForm.controls.name.setValue(event.name)
    this.contentForm.controls.description.setValue(event.description)
    this.competencies_v1 = event
    if (event.additionalProperties.competencyLevelDescription) {
      let children: any = this.contentMeta.children
      let competencyLevelDescription = JSON.parse(event.additionalProperties.competencyLevelDescription)
      const identifiers = children.map((val: any) => {
        const matchedItem = {
          "identifier": val.identifier,
          "versionKey": val.versionKey
        }
        return matchedItem
      })

      const mergedArray = competencyLevelDescription.map((item: any, index: string | number) => {
        return {
          ...item,
          identifier: identifiers[index].identifier,
          versionKey: identifiers[index].versionKey
        }
      })
      if (mergedArray.length > 0) {
        this.loader.changeLoad.next(true)
        for (const level of mergedArray) {
          if (level) {
            const newData = {
              name: '( Level ' + level.level + ') ' + level.name ? level.name : 'Resource',
              description: level.description ? level.description : '',
              versionKey: level.versionKey
            }
            let requestBody = {
              request: {
                content: newData
              },
            }
            await this.editorService.updateNewContentV3(requestBody, level.identifier).toPromise().catch((_error: any) => { })
          }
        }
        let competencies_obj = [{
          competencyName: event.name,
          competencyId: event.id.toString(),
        }]
        let courseData = {
          name: event.name,
          versionKey: this.contentMeta.identifier,
          competencies_v1: competencies_obj
        }

        let requestBody = {
          request: {
            content: courseData
          },
        }
        await this.editorService.updateNewContentV3(requestBody, this.contentMeta.identifier).toPromise().catch((_error: any) => { })

      }
      this.loader.changeLoad.next(false)

    }

    // this.contentForm.controls.competencies_v1.setValue(competencies_obj)
  }

  onKey(value: string) {
    this.proficiencyList = this.search(value)
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
  getFilterData(firstArray: any, secondArray: any) {
    const valuesNotInSecondArray = firstArray.filter((key: any) => {
      const keyFoundInSecondArray = secondArray.some((item: any) => {
        const [itemKey] = item.split(':')
        return key === itemKey
      })

      return !keyFoundInSecondArray
    })

    console.log(valuesNotInSecondArray)
    this.rolesMappedListData = valuesNotInSecondArray

    this.rolesMappedList = valuesNotInSecondArray
  }
  enableClick(): void {
    this.isEnableTitle = false
  }

  clickedNext() {
    this.authInitService.saveData('saved')
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
  getKeys(index: number): string[] {
    return Object.keys(this.rolesMappedListData[index])
  }

  ngOnDestroy() {
    if (this.rolesSubscription) {
      this.rolesSubscription.unsubscribe()
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe()
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


    if (typeof this.contentMeta.creatorDetails === 'string') {
      const parsedDetails: NSContent.IAuthorDetails = JSON.parse(this.contentMeta.creatorDetails)
      this.contentMeta.creatorDetails = [parsedDetails]
    }

    const authorDetails: NSContent.IAuthorDetails = {
      id: this.userId,
      name: this.givenName,
    }

    this.contentMeta.creatorDetails = [authorDetails]

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
    this.setDuration(contentMeta.duration || '0')

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
    this.isSelfAssessment = this.contentMeta.competency
    if (!this.contentForm) {
      this.createForm()
    }
    this.canUpdate = false
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

        this.contentForm.controls.sourceName.setValue(this.contentMeta.sourceName)

        this.contentForm.controls.trackContactsCtrl.setValue(this.contentMeta.trackContactsCtrl)
        this.contentForm.controls.publisherDetailsCtrl.setValue(this.contentMeta.publisherDetailsCtrl)
        this.contentForm.controls.gatingEnabled.setValue(this.contentMeta.gatingEnabled)
        this.contentForm.controls.activateLink.setValue(this.contentMeta.activateLink)
        this.contentForm.controls.previewLinkFormControl.setValue(this.contentMeta.previewLinkFormControl)
        this.contentForm.controls.courseVisibility.setValue(this.contentMeta.courseVisibility)
        this.contentForm.controls.issueCertification.setValue(this.contentMeta.issueCertification)
        this.contentForm.controls.cneName.setValue(this.contentMeta.cneName)
        // hardcoded aastrika publisher id
        this.contentForm.controls.publisherDetails.setValue([{ id: 'b4509d72-87cc-4317-9012-d4b03e307fa5', name: 'Publisher Aastrika' }])

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
    // tslint:disable-next-line:no-console
    console.log('saved', this.contentForm.controls, this.proficiencyList)
    this.storeData()

    if (this.isSubmitPressed) {
      this.contentForm.markAsDirty()
      this.contentForm.markAsTouched()
    } else {
      this.contentForm.markAsPristine()
      this.contentForm.markAsUntouched()
    }
  }
  isJsonString(str: any) {
    try {
      JSON.parse(str)
      return true // It's valid JSON!
    } catch (e) {
      return false // Not valid JSON.
    }
  }
  initializeForm() {
    if (this.contentMeta.competencies_v1) {
      try {
        console.log("yes valid", this.contentMeta.competencies_v1)
        let jsonVerify = this.isJsonString(this.contentMeta.competencies_v1)
        if (jsonVerify) {
          const parsedCompetencies = JSON.parse(this.contentMeta.competencies_v1)
          console.log("parsedCompetencies", parsedCompetencies, this.proficiencyList)
          if (Array.isArray(parsedCompetencies)) {
            const selectedCompetency = this.proficiencyList.find(
              (competency: { id: number }) => competency.id == parsedCompetencies[0].competencyId
            )
            console.log("yes here selected: ", selectedCompetency)
            if (selectedCompetency) {
              this.competencies_v1 = selectedCompetency
            }
          }
        } else {
          let comp = this.contentMeta.competencies_v1
          console.log("comp", this.contentMeta.competencies_v1, this.proficiencyList)
          if (comp) {
            const selectedCompetency = this.proficiencyList.find(
              (competency: { id: number }) => competency.id === comp.id
            )
            console.log("yes here selected: ", selectedCompetency)
            if (selectedCompetency) {
              this.competencies_v1 = selectedCompetency
            }
          }
        }

      } catch (e) {
        console.error('Failed to parse competencies_v1', e)
      }
    }
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
      // tslint:disable-next-line:no-console
      // console.log("cameherer")
      const originalMeta = this.contentService.getOriginalMeta(this.contentMeta.identifier)
      // console.log("originalMeta", originalMeta, this.contentMeta.identifier)
      if (originalMeta && this.isEditEnabled) {
        const expiryDate = this.contentForm.value.expiryDate
        if (this.contentForm.value.rolesMapped == null) {
          this.contentForm.value.rolesMapped = []
        }
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

            if (!currentMeta.categoryType) {
              currentMeta.categoryType = parentData.categoryType !== '' ? parentData.categoryType : currentMeta.categoryType
            }
            if (!currentMeta.resourceType) {
              currentMeta.resourceType = parentData.resourceType !== '' ? parentData.resourceType : currentMeta.resourceType
            }

            if (!currentMeta.sourceName) {
              currentMeta.sourceName = parentData.sourceName !== '' ? parentData.sourceName : currentMeta.sourceName
            }
            if (!currentMeta.publisherDetailsCtrl) {
              currentMeta.publisherDetailsCtrl = parentData.publisherDetailsCtrl !== '' ? parentData.publisherDetailsCtrl : currentMeta.publisherDetailsCtrl
            }
            if (!currentMeta.trackContactsCtrl) {
              currentMeta.trackContactsCtrl = parentData.trackContactsCtrl !== '' ? parentData.trackContactsCtrl : currentMeta.trackContactsCtrl
            }
            if (!currentMeta.gatingEnabled) {
              currentMeta.gatingEnabled = parentData.gatingEnabled !== false ? parentData.gatingEnabled : currentMeta.gatingEnabled
            }
            if (!currentMeta.courseVisibility) {
              currentMeta.courseVisibility = parentData.courseVisibility !== false ? parentData.courseVisibility : currentMeta.courseVisibility
            }
            if (!currentMeta.cneName) {
              currentMeta.cneName = parentData.cneName !== '' ? parentData.cneName : currentMeta.cneName
            }

            if (!currentMeta.activateLink) {
              currentMeta.activateLink = parentData.activateLink !== '' ? parentData.activateLink : currentMeta.activateLink
            }
            if (!currentMeta.issueCertification) {
              currentMeta.issueCertification = parentData.issueCertification !== false ? parentData.issueCertification : currentMeta.issueCertification
            }
            // if (!currentMeta.competencies_v1) {
            //   currentMeta.competencies_v1 = parentData.competencies_v1 !== false ? parentData.competencies_v1 : currentMeta.competencies_v1
            // }
            if (!currentMeta.previewLinkFormControl) {
              currentMeta.previewLinkFormControl = parentData.previewLinkFormControl !== '' ? parentData.previewLinkFormControl : currentMeta.previewLinkFormControl
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
        // tslint:disable-next-line:no-console
        console.log("currentMeta", currentMeta)
        Object.keys(currentMeta).map(v => {
          if ((this.isSelfAssessment ? true : v !== 'competencies_v1') &&
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
              meta[v as keyof NSContent.IContentMeta] = JSON.parse(
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
          } else if (v === 'visibility') {
            // if (currentMeta['contentType'] === 'CourseUnit' && currentMeta[v] !== 'Parent') {
            //   // console.log('%c COURSE UNIT ', 'color: #f5ec3d', meta[v],  currentMeta[v])
            //   meta[v as keyof NSContent.IContentMeta] = 'Default'
            // }
          }
          else if (v === 'competencies_v1') {
            // meta[v as keyof NSContent.IContentMeta] = originalMeta[v as keyof NSContent.IContentMeta]
          }
        })

        if (this.stage >= 1 && !this.type) {
          delete meta.artifactUrl
        }
        // tslint:disable-next-line:no-console
        // console.log("originalMeta", meta)
        // if (meta['rolesMapped']) {
        //   const keysToFind = meta['rolesMapped']
        //   const rolesId = this.getValuesForKeys(keysToFind)
        //   // console.log("rolesId", rolesId)
        //   meta['rolesMapped'] = rolesId
        //   // console.log("roles", rolesId)
        // }

        console.log('meta', meta, this.contentMeta.identifier)
        this.contentService.setUpdatedMeta(meta, this.contentMeta.identifier)
        // this.initializeForm()

      }
    } catch (ex) {
      console.log("yes here", ex)
      this.snackBar.open('Please Save Parent first and refresh page.')
      if (ex) {
        // this.saveParent = true
        // this.emitSaveData(true)
      }
      // this.contentService.parentContent
    }
  }
  getKeyByValue(role: any) {
    for (const key in this.rolesArray) {
      if (isNumber(role)) {
        if (this.rolesArray.hasOwnProperty(key) && this.rolesArray[key] === role) {
          // console.log("fasdf", key)
        }
      }
    }
    return null // Return null if the value is not found
  }
  getRole(role: any) {
    // console.log("this.rolesArray", role)
    for (const item of this.rolesArray) {
      if (isNumber(role)) {
        const keys = Object.values(item)
        console.log("items", item, keys)
        if (this.rolesArray.hasOwnProperty(item) && this.rolesArray[item] === role) {
          console.log("item has role", item)
          // return item
        }
        // if (keys.length === 1 && item[keys[0]] === role) {
        //   return keys[0]
        // }
      }

    }
    return null // Return null if value is not found
  }
  getValuesForKeys(keysToFind: any) {
    keysToFind
    const values: any = []
    keysToFind.forEach((key: any) => {
      key = key.split(':')[0]
      const item = this.rolesArray.find((item: any) => Object.keys(item)[0] === key)
      // console.log("keysToFind: ", this.rolesArray, item, Object.values(item))

      if (item) {
        values.push(Object.keys(item) + ':' + Object.values(item))
      }
    })
    let mergedArray: any = []
    if (values.length > 0) {
      mergedArray = [].concat(...values)

    }
    return mergedArray
  }
  getValueByKey(keyToFind: any) {
    for (const item of this.rolesArray) {
      if (item.hasOwnProperty(keyToFind)) {
        return item[keyToFind]
      }
    }
    return null // Return null if key is not found
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
    // tslint:disable-next-line:no-console
    // console.log("updateContentService")
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
    if (this.configSvc.userProfile) {
      const name = this.configSvc.userProfile || ''
      console.log("name: ", name)
    }
    const value = (event.value || '').trim()
    if (value) {
      this.contentForm.controls.creatorDetails.value.push({ id: '', name: value })
      this.contentForm.controls.creatorDetails.setValue(
        this.contentForm.controls.creatorDetails.value,
      )
    }
    // tslint:disable-next-line:no-console
    // console.log(this.contentForm.controls.creatorDetails)

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
    // if (this.contentForm.controls['rolesMapped'] == null) {
    //   this.contentForm.controls['rolesMapped'].value = []
    // }
    // console.log("addToFormControl", this.contentForm.controls['rolesMapped'], this.contentForm.controls[fieldName], this.contentForm.controls[fieldName].value)

    if (value) {
      this.contentForm.controls[fieldName].value.push(value)
      this.contentForm.controls[fieldName].setValue(this.contentForm.controls[fieldName].value)
    }
    // console.log("addToFormControl2", this.contentForm.controls[fieldName].value)

    this[`${fieldName}View` as keyof CourseSettingsComponent].nativeElement.value = ''
    this[`${fieldName}Ctrl` as keyof CourseSettingsComponent].setValue(null)
    this[`${fieldName}View` as keyof CourseSettingsComponent].nativeElement.blur()
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

  //   const dialogRef = this.dialog.open(ImageCropComponent, {
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

  //   const dialogRef = this.dialog.open(ImageCropComponent, {
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

    const dialogRef = this.dialog.open(ImageCropComponent, {
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
    console.log("event", event, field)
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
            if (field === 'creatorDetails') {
              this.contentForm.controls[field].value.push({
                id: this.userId,
                name: this.givenName,
              })

              this.contentForm.controls[field].setValue(this.contentForm.controls[field].value)
            }

          } else {
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.NO_ROLE,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
          }
          this[`${field}View` as keyof CourseSettingsComponent].nativeElement.value = ''
          this[`${field}Ctrl` as keyof CourseSettingsComponent].setValue(null)
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
          this[`${field}View` as keyof CourseSettingsComponent].nativeElement.value = ''
          this[`${field}Ctrl` as keyof CourseSettingsComponent].setValue(null)
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
    // console.log("fasdfaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    if ((this.audienceCtrl.value || '').trim()) {
      this.audienceList = this.ordinals.audience.filter(
        (v: any) => v.toLowerCase().indexOf(this.audienceCtrl.value.toLowerCase()) > -1,
      )
    } else {
      this.audienceList = this.ordinals.audience.slice()
    }
  }
  private fetchRolesMapped() {
    //this.data.emit('save')
    //this.storeData()
    // console.log("this.rolesMappedCtrl", this.rolesMappedListData)
    // if ((this.rolesMappedCtrl.value || '').trim()) {
    //   this.rolesMappedList = this.rolesMappedListData.filter(
    //     (v: any) => v.toLowerCase().indexOf(this.rolesMappedCtrl.value.toLowerCase()) > -1,
    //   )
    // } else {
    //   this.rolesMappedList = this.rolesMappedListData.slice()
    // }
    // console.log("this.rolesMappedList", this.rolesMappedList)
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
    console.log("this.isSelfAssessment", this.isSelfAssessment, this.contentForm)
    this.contentForm = this.formBuilder.group({
      accessPaths: [],
      accessibility: [],
      appIcon: [],
      artifactUrl: [],
      audience: [],
      rolesMapped: [[]],
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
      duration: [],
      editors: [],
      equivalentCertifications: [],
      expiryDate: [],
      exclusiveContent: [],
      idealScreenSize: [],
      identifier: [],
      introductoryVideo: [],
      introductoryVideoIcon: [],
      isExternal: [],
      isIframeSupported: [],
      isRejected: [],
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
      issueCertification: !this.isSelfAssessment ? new FormControl('', [Validators.required]) : new FormControl(''),
      // competencies_v1: this.isSelfAssessment ? new FormControl('', [Validators.required]) : new FormControl(''),
      competencies_v1: this.isSelfAssessment ? new FormControl('') : new FormControl(''),
      lang: '',
      // proficiency: new FormControl('', [Validators.required]),
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
      publisherDetails: new FormControl('', [Validators.required]),
      references: [],
      region: [],
      registrationInstructions: [],
      resourceCategory: [],
      resourceType: [],
      sampleCertificates: [],
      skills: [],
      softwareRequirements: [],
      sourceName: new FormControl('', [Validators.required]),
      creatorLogo: [],
      creatorPosterImage: [],
      creatorThumbnail: [],
      status: [],
      // studyDuration: [],
      studyMaterials: [],
      subTitle: [],
      subTitles: [],
      systemRequirements: [],
      thumbnail: [],
      trackContacts: new FormControl('', [Validators.required]),
      transcoding: [],
      unit: [],
      verifiers: [],
      visibility: [],
      instructions: [],
      versionKey: '',  // (new Date()).getTime()
      purpose: '',
      // langName: '',
      trackContactsCtrl: '',
      publisherDetailsCtrl: '',
      activateLink: new FormControl(),
      previewLinkFormControl: new FormControl(),
      cneName: new FormControl(''),
      courseVisibility: new FormControl('')
    })

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
    this.contentForm.controls.publisherDetails.setValue({ id: 'b4509d72-87cc-4317-9012-d4b03e307fa5', name: 'Publisher Aastrika' })
    console.log("publisher", this.contentForm.controls.publisherDetailsCtrl)
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
    this.contentForm.controls.purpose.setValue(sub)
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

  async onSubmit() {
    this.storeService.parentData = await this.courseData
    this.courseEditFormSubmit.emit(true)
  }

  moduleCreate(name: string) {
    this.moduleName = name
    this.isSaveModuleFormEnable = true
    this.moduleButtonName = 'Save'
  }

}
