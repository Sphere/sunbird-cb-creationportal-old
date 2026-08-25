import { COMMA, ENTER } from '@angular/cdk/keycodes'

import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core'

import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'

import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { MatChipInputEvent } from '@angular/material/chips'

import { MatDialog } from '@angular/material/dialog'

import { MatSnackBar } from '@angular/material/snack-bar'

import { VIEWER_ROUTE_FROM_MIME } from '@ws-widget/collection/src/public-api'

import { ConfigurationsService, randomInt } from '@ws-widget/utils'

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

import { EditMetaBaseComponent } from '../edit-meta/edit-meta-base.component'

@Component({
  standalone: false,
  selector: 'ws-auth-course-settings',
  templateUrl: './course-settings.component.html',
  styleUrls: ['./course-settings.component.scss'],
})
export class CourseSettingsComponent extends EditMetaBaseComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Output() data = new EventEmitter<string>()
  @Output() courseEditFormSubmit = new EventEmitter<boolean>()
  // Emits live validity of the course-settings form (Reviewers / Publishers /
  // Source Name / Certificate) so the parent stepper can disable Next until filled.
  @Output() validityChange = new EventEmitter<boolean>()
  @Input() isSubmitPressed = false
  @Input() triggerNext = false
  @Input() nextAction = 'done'
  @Input() stage = 1
  @Input() type = ''
  publisherDetails!: FormControl
  trackContacts!: FormControl
  activateLink!: FormControl
  previewLinkFormControl!: FormControl
  rolesMappedCtrl!: FormControl
  competencySearchCtrl = new FormControl('')
  sourceName: string[] = []
  rolesMappedListData!: any
  rolesMappedListValuesData!: any
  rolesArray!: any
  rolesMappedList: any[] = []
  @Input() parentContent: string | null = null
  // issueCertification!: FormControl
  languageList: any[] = [
    {
      name: 'English',
      value: 'en',
    },
    {
      name: 'Hindi',
      value: 'hi',
    },
  ]
  proficiency: any
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

  courseData: any
  //UI variables
  roles$!: Observable<any[]>
  sourceNames$!: Observable<any[]>
  userId!: any
  givenName!: any
  getAllEntities: any
  proficiencyList: any[] = []
  competencies_v1: any

  constructor(
    protected formBuilder: FormBuilder,
    protected uploadService: UploadService,
    protected snackBar: MatSnackBar,
    public dialog: MatDialog,
    protected editorService: EditorService,
    protected contentService: EditorContentService,
    protected configSvc: ConfigurationsService,
    protected ref: ChangeDetectorRef,
    protected loader: LoaderService,
    protected authInitService: AuthInitService,
    protected accessService: AccessControlService,
    protected http: HttpClient,
    protected router: Router,
    protected storeService: CollectionStoreService,
  ) {
    super(
      formBuilder,
      uploadService,
      snackBar,
      dialog,
      editorService,
      contentService,
      configSvc,
      ref,
      loader,
      authInitService,
      accessService,
      http,
      router,
    )
    if (this.configSvc.userProfile) {
      this.userId = this.configSvc.userProfile.userId
      this.givenName = this.configSvc.userProfile.givenName
    }
    const lang = (this.contentMeta as any)?.lang || 'en'
    this.getAllEntities = this.editorService.getAllEntities(lang).subscribe((res: any) => {
      this.proficiencyList = res.result.entity
      this.searchComp = this.proficiencyList
      if (this.isSelfAssessment) this.initializeForm()
    })
  }

  ngAfterViewInit(): void {
    // Angular does not await lifecycle hooks; run the async work
    // fire-and-forget, exactly as `async ngAfterViewInit()` already did.
    void this.afterViewInitAsync()
  }

  private async afterViewInitAsync(): Promise<void> {
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
  sourceNameSubscription!: Subscription
  searchComp: any = ''

  ngOnChanges(changes: SimpleChanges) {
    if (changes['triggerNext']?.currentValue === true) {
      this.isSubmitPressed = true
      this.data.emit('save')
    }
  }

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
    this.sourceNames$ = this.editorService.sourceNames() // Assign the observable
    this.sourceNameSubscription = this.sourceNames$.subscribe(async (data: any) => {
      if (data.length > 0) {
        this.sourceName = data
      }
    })
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

    this.accessPathsCtrl.valueChanges
      .pipe(
        debounceTime(400),
        filter(v => v),
      )
      .subscribe(() => this.fetchAccessRestrictions())

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

  async eventSelection(event: any, comp: any) {
    // this.contentForm.controls.name.setValue(event.name)
    // this.contentForm.controls.description.setValue(event.description)
    // this.competencies_v1 = event
    const entityLevels: any[] = comp.levels || []
    if (entityLevels.length > 0) {
      let children: any = this.contentMeta.children
      const identifiers = children.map((val: any) => ({
        identifier: val.identifier,
        versionKey: val.versionKey,
      }))
      const mergedArray = entityLevels.map((item: any, index: number) => ({
        ...item,
        identifier: identifiers[index]?.identifier,
        versionKey: identifiers[index]?.versionKey,
      }))
      if (mergedArray.length > 0) {
        this.loader.changeLoad.next(true)
        for (const level of mergedArray) {
          if (level) {
            const levelName = level.levelName || level.name || 'Resource'
            const levelNum = level.levelNumber ?? level.level
            const newData = {
              name: 'Level ' + levelNum + ' : ' + levelName,
              description: level.description || '',
              versionKey: level.versionKey,
            }
            let requestBody = {
              request: {
                content: newData,
              },
            }
            await this.editorService
              .updateNewContentV3(requestBody, level.identifier)
              .toPromise()
              .catch((_error: any) => {})
          }
        }

        let competencies_obj = [
          {
            competencyName: comp.name,
            competencyId: comp.entityId.toString(),
          },
        ]
        let courseData = {
          name: comp.name,
          description: comp.description,
          versionKey: this.contentMeta.identifier,
          competencies_v1: competencies_obj,
          lang: event,
        }
        if (event == 'hi') {
          this.courseData.name = comp['lang-hi-name'] || comp.name
          this.courseData.description = comp['lang-hi-description'] || comp.description
          let competencies_obj = [
            {
              competencyName: comp['lang-hi-name'] || comp.name,
              competencyId: comp.entityId.toString(),
            },
          ]
          courseData = {
            name: comp['lang-hi-name'] || comp.name,
            description: comp['lang-hi-description'] || comp.description,
            versionKey: this.contentMeta.identifier,
            competencies_v1: competencies_obj,
            lang: event,
          }
        }

        let requestBody = {
          request: {
            content: courseData,
          },
        }
        await this.editorService
          .updateNewContentV3(requestBody, this.contentMeta.identifier)
          .toPromise()
          .catch((_error: any) => {})
        await this.editorService.readcontentV3(this.contentService.parentContent).subscribe(async (data: any) => {
          this.courseData = await data
          this.loader.changeLoad.next(false)
          // Reflect the newly selected language by reloading the collection view once.
          // NOTE: do NOT subscribe to router.events to trigger the reload — that handler
          // fired on every subsequent NavigationEnd (e.g. the back button) and was never
          // unsubscribed, causing an endless reload loop on the course settings page.
          this.router.navigate([`/author/editor/${this.contentMeta.identifier}/collection`]).then(() => window.location.reload())
        })
      }
    }

    // this.contentForm.controls.competencies_v1.setValue(competencies_obj)
  }

  // displayWith for mat-autocomplete — shows "CODE - Name" in the input after selection
  displayCompetency = (option: any): string => {
    if (!option) return ''
    if (typeof option === 'string') return ''
    return option.code ? `${option.code} - ${option.name}` : option.name || ''
  }

  // Called when the user picks an option — keeps competencies_v1 in sync and triggers the save
  onCompetencySelected(lang: string, comp: any) {
    this.competencies_v1 = comp
    this.competencySearchCtrl.setValue(comp, { emitEvent: false })
    this.contentForm.controls['competencies_v1'].setValue(comp, { emitEvent: false })
    this.eventSelection(lang, comp)
  }

  onKey(value: string) {
    this.proficiencyList = this.search(value)
  }
  search(value: string) {
    const filter = value.toLowerCase()
    if (!filter) {
      return this.searchComp
    }
    return this.searchComp.filter((option: any) => {
      const nameMatch = option.name?.toLowerCase().includes(filter)
      const codeMatch = option.code?.toLowerCase().includes(filter)
      return nameMatch || codeMatch
    })
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
  // trackBy for the form option/chip lists so *ngFor reuses rows instead of
  // re-rendering the whole list on each change.

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
    const isCreator = this.configSvc.userProfile && this.configSvc.userProfile.userId === contentMeta.createdBy ? true : false

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
    } else if (!this.contentMeta.creatorDetails || this.contentMeta.creatorDetails.length === 0) {
      // Only set default author if no authors exist
      const authorDetails: NSContent.IAuthorDetails = {
        id: this.userId,
        name: this.givenName,
      }
      this.contentMeta.creatorDetails = [authorDetails]
    }

    if (this.contentMeta.publisherDetails && typeof this.contentMeta.publisherDetails === 'string') {
      this.contentMeta.publisherDetails = JSON.parse(this.contentMeta.publisherDetails)
    }

    this.canExpiry = this.contentMeta.expiryDate !== '99991231T235959+0000'
    if (this.canExpiry) {
      this.contentMeta.expiryDate =
        contentMeta.expiryDate && contentMeta.expiryDate.indexOf('+') === 15 ? <any>this.convertToISODate(contentMeta.expiryDate) : ''
    }
    this.contentService.currentContentData = this.contentMeta
    this.contentService.currentContentID = this.contentMeta.identifier

    this.assignFields()
    this.setDuration(contentMeta.duration || '0')

    this.isEditEnabled = isCreator && isEditable

    this.filterOrdinals()
    this.changeResourceType()
  }

  assignFields() {
    this.isSelfAssessment = this.contentMeta.competency
    if (!this.contentForm) {
      this.createForm()
    }
    this.canUpdate = false
    Object.keys(this.contentForm.controls).forEach(v => {
      try {
        if (
          this.contentMeta[v as keyof NSContent.IContentMeta] ||
          (this.authInitService.authConfig[v as keyof IFormMeta].type === 'boolean' &&
            this.contentMeta[v as keyof NSContent.IContentMeta] === false)
        ) {
          this.contentForm.controls[v].setValue(this.contentMeta[v as keyof NSContent.IContentMeta])
        } else {
          if (v === 'expiryDate') {
            this.contentForm.controls[v].setValue(new Date(new Date().setMonth(new Date().getMonth() + 60)))
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
        const baseUrl = window.location.origin.trim()
        const targetUrl = 'https://cbp-staging.aastrika.org'.trim()
        const publisherId = baseUrl === targetUrl ? '8eab395d-46f4-47ff-90af-9d51d5126fc3' : 'b4509d72-87cc-4317-9012-d4b03e307fa5'
        this.contentForm.controls.publisherDetails.setValue([{ id: publisherId, name: 'Publisher Aastrika' }])

        if (this.isSubmitPressed) {
          this.contentForm.controls[v].markAsDirty()
          this.contentForm.controls[v].markAsTouched()
        } else {
          this.contentForm.controls[v].markAsPristine()
          this.contentForm.controls[v].markAsUntouched()
        }
      } catch (ex) {}
    })
    this.canUpdate = true
    this.storeData()

    // Restore saved competency selection. If the proficiency list hasn't loaded
    // yet, initializeForm() in the API callback will handle it once it arrives.
    if (this.isSelfAssessment && this.proficiencyList.length > 0) {
      this.initializeForm()
    }

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
    if (!this.contentMeta.competencies_v1) {
      return
    }
    try {
      const raw = this.contentMeta.competencies_v1
      // Normalise: could be a JSON string, an array, or a single object
      let list: any[]
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw)
        list = Array.isArray(parsed) ? parsed : [parsed]
      } else {
        list = Array.isArray(raw) ? raw : [raw]
      }
      const savedId = list[0]?.competencyId
      if (!savedId) {
        return
      }
      // Match on entityId (numeric string) — never on id (compound "C2_en")
      const match = this.proficiencyList.find((c: any) => String(c.entityId) === String(savedId))
      if (match) {
        this.competencies_v1 = match
        // Sync both the display ctrl (search input) and the form ctrl (validation/state)
        this.competencySearchCtrl.setValue(match, { emitEvent: false })
        if (this.contentForm?.controls['competencies_v1']) {
          this.contentForm.controls['competencies_v1'].setValue(match, { emitEvent: false })
        }
      }
    } catch (e) {
      console.error('Failed to parse competencies_v1', e)
    }
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
        const exemptArray = [
          'application/quiz',
          'application/x-mpegURL',
          'audio/mpeg',
          'video/mp4',
          'application/vnd.ekstep.html-archive',
          'application/json',
        ]
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
              currentMeta.publisherDetailsCtrl =
                parentData.publisherDetailsCtrl !== '' ? parentData.publisherDetailsCtrl : currentMeta.publisherDetailsCtrl
            }
            if (!currentMeta.trackContactsCtrl) {
              currentMeta.trackContactsCtrl =
                parentData.trackContactsCtrl !== '' ? parentData.trackContactsCtrl : currentMeta.trackContactsCtrl
            }
            if (!currentMeta.gatingEnabled) {
              currentMeta.gatingEnabled = parentData.gatingEnabled !== false ? parentData.gatingEnabled : currentMeta.gatingEnabled
            }
            if (!currentMeta.courseVisibility) {
              currentMeta.courseVisibility =
                parentData.courseVisibility !== false ? parentData.courseVisibility : currentMeta.courseVisibility
            }
            if (!currentMeta.cneName) {
              currentMeta.cneName = parentData.cneName !== '' ? parentData.cneName : currentMeta.cneName
            }

            if (!currentMeta.activateLink) {
              currentMeta.activateLink = parentData.activateLink !== '' ? parentData.activateLink : currentMeta.activateLink
            }
            if (!currentMeta.issueCertification) {
              currentMeta.issueCertification =
                parentData.issueCertification !== false ? parentData.issueCertification : currentMeta.issueCertification
            }
            // if (!currentMeta.competencies_v1) {
            //   currentMeta.competencies_v1 = parentData.competencies_v1 !== false ? parentData.competencies_v1 : currentMeta.competencies_v1
            // }
            if (!currentMeta.previewLinkFormControl) {
              currentMeta.previewLinkFormControl =
                parentData.previewLinkFormControl !== '' ? parentData.previewLinkFormControl : currentMeta.previewLinkFormControl
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
          currentMeta.expiryDate = `${expiryDate.toISOString().replace(/-/g, '').replace(/:/g, '').split('.')[0]}+0000`
        }
        // tslint:disable-next-line:no-console
        console.log('currentMeta', currentMeta)
        Object.keys(currentMeta).forEach(v => {
          if (
            (this.isSelfAssessment ? true : v !== 'competencies_v1') &&
            v !== 'versionKey' &&
            v !== 'visibility' &&
            JSON.stringify(currentMeta[v as keyof NSContent.IContentMeta]) !==
              JSON.stringify(originalMeta[v as keyof NSContent.IContentMeta]) &&
            v !== 'jobProfile'
          ) {
            if (
              currentMeta[v as keyof NSContent.IContentMeta] ||
              // (this.authInitService.authConfig[v as keyof IFormMeta].type === 'boolean' &&
              currentMeta[v as keyof NSContent.IContentMeta] === false
            ) {
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
          } else if (v === 'competencies_v1') {
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
        if (this.isSelfAssessment) {
          this.authInitService.isEditMetaPageAction('isSettingsPage')
        }
      }
    } catch (ex) {
      console.log('yes here', ex)
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
        console.log('items', item, keys)
        if (this.rolesArray.hasOwnProperty(item) && this.rolesArray[item] === role) {
          console.log('item has role', item)
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

  addCreatorDetails(event: MatChipInputEvent): void {
    const input = event.input
    if (this.configSvc.userProfile) {
      const name = this.configSvc.userProfile || ''
      console.log('name: ', name)
    }
    const value = (event.value || '').trim()
    if (value) {
      this.contentForm.controls.creatorDetails.value.push({ id: '', name: value })
      this.contentForm.controls.creatorDetails.setValue(this.contentForm.controls.creatorDetails.value)
    }
    // tslint:disable-next-line:no-console
    // console.log(this.contentForm.controls.creatorDetails)

    // Reset the input value
    if (input) {
      input.value = ''
    }
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
    if (!(IMAGE_SUPPORT_TYPES.indexOf(`.${fileName.toLowerCase().split('.').pop()}`) > -1)) {
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
    this.uploadCroppedAsset(dialogRef, fileName, formdata)
  }
  uploadSourceIcon(file: File) {
    const formdata = new FormData()
    const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
    if (!(IMAGE_SUPPORT_TYPES.indexOf(`.${fileName.toLowerCase().split('.').pop()}`) > -1)) {
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

  generateUrl(oldUrl: any) {
    //const chunk = oldUrl.split('/')
    //const newChunk = environment.azureHost.split('/')
    // @ts-ignore: Unreachable code error
    this.bucket = window['env']['azureBucket']
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

    // Falling off the end here returned undefined for any url outside the bucket,
    // and the caller feeds this straight into the appIcon and thumbnail controls,
    // so a valid external image blanked both fields. Return the url unchanged,
    // matching the sibling implementation in edit-meta.
    return oldUrl
  }

  addEmployee(event: MatAutocompleteSelectedEvent, field: string) {
    console.log('event', event, field)
    if (event.option.value && event.option.value.id) {
      this.loader.changeLoad.next(true)
      const observable =
        ['trackContacts', 'publisherDetails'].includes(field) && this.accessService.authoringConfig.doUniqueCheck
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

  private fetchAudience() {
    // console.log("fasdfaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    if ((this.audienceCtrl.value || '').trim()) {
      this.audienceList = this.ordinals.audience.filter((v: any) => v.toLowerCase().indexOf(this.audienceCtrl.value.toLowerCase()) > -1)
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

  createForm() {
    console.log('this.isSelfAssessment', this.isSelfAssessment, this.contentForm)
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
      competencies_v1: new FormControl(''),
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
      versionKey: '', // (new Date()).getTime()
      purpose: '',
      // langName: '',
      trackContactsCtrl: '',
      publisherDetailsCtrl: '',
      activateLink: new FormControl(),
      previewLinkFormControl: new FormControl(),
      cneName: new FormControl(''),
      courseVisibility: new FormControl(''),
    })

    // Filter competency list as user types via the standalone search ctrl.
    // competencies_v1 in the form is never written to by keystrokes — only by selection or explicit reset.
    this.competencySearchCtrl.valueChanges.subscribe((val: any) => {
      if (typeof val === 'string') {
        this.onKey(val)
        if (!val) {
          // User cleared the field — reset the actual form value so validation reflects the empty state
          this.competencies_v1 = null
          this.contentForm.controls['competencies_v1'].setValue(null, { emitEvent: true })
        }
      }
    })

    // Report validity now (initial state) and on every status change so the parent
    // stepper keeps Next disabled until all mandatory settings fields are filled.
    this.validityChange.emit(this.contentForm.valid)
    this.contentForm.statusChanges.pipe(distinctUntilChanged()).subscribe(() => this.validityChange.emit(this.contentForm.valid))

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
        this.contentForm.controls.publisherDetails.setValue(this.contentForm.controls.creatorContacts.value || [])
      })
    }
    const baseUrl = window.location.origin.trim()
    const targetUrl = 'https://cbp-staging.aastrika.org'.trim()
    const publisherId = baseUrl === targetUrl ? '8eab395d-46f4-47ff-90af-9d51d5126fc3' : 'b4509d72-87cc-4317-9012-d4b03e307fa5'
    this.contentForm.controls.publisherDetails.setValue({ id: publisherId, name: 'Publisher Aastrika' })
    console.log('publisher', this.contentForm.controls.publisherDetailsCtrl)
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
      this.contentForm.controls.customClassifiers.setValue(this.contentForm.controls.resourceCategory.value)
    })
  }

  setPurposeValue(sub: any) {
    this.contentForm.controls.purpose.setValue(sub)
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

  async onSubmit() {
    this.storeService.parentData = await this.courseData
    this.courseEditFormSubmit.emit(true)
  }
}
