import { COMMA, ENTER } from '@angular/cdk/keycodes'

import {
  Directive,
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'

import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'

import {
  MAX_INSTRUCTIONS_BYTES,
  maxByteLengthValidator,
  utf8ByteLength,
} from '@ws/author/src/lib/modules/shared/validators/byte-length.validator'

import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { MatChipInputEvent } from '@angular/material/chips'

import { MatDialog } from '@angular/material/dialog'

import { MatSnackBar } from '@angular/material/snack-bar'

import { VIEWER_ROUTE_FROM_MIME } from '@ws-widget/collection/src/public-api'

import { ConfigurationsService, isActivationKey, randomInt } from '@ws-widget/utils'

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

/**
 * The state and helpers that the edit-meta and course-settings forms hold in common.
 *
 * Only members that were byte-identical in both components live here. Everything that
 * differed -- ngOnInit, createForm, assignFields, storeData and the rest of the form
 * logic -- stays on each component, so this removes copies without merging behaviour.
 *
 * Carries @Directive() with no selector because subclasses inherit these constructor
 * dependencies; without it Angular cannot resolve them (NG2006/NG2007).
 */
@Directive()
export abstract class EditMetaBaseComponent {
  /**
   * Declared here so the shared members below can read it. Both components
   * redeclare it as an @Input, which overrides this default.
   */
  isSubmitPressed = false

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
  ) {}

  accessPathList: any[] = []

  accessPathsCtrl!: FormControl

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

  addConcepts = false

  addKeyword(event: MatChipInputEvent): void {
    const input = event.input
    event.value
      .split(/[,]+/)
      .map((val: string) => val.trim())
      .forEach((value: string) => this.optionSelected(value))
    input.value = ''
  }

  addOnBlur = true

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

  assignExpiryDate() {
    this.canExpiry = !this.canExpiry
    this.contentForm.controls.expiryDate.setValue(
      this.canExpiry ? new Date(new Date().setMonth(new Date().getMonth() + 6)) : '99991231T235959+0000',
    )
  }

  audienceCtrl!: FormControl

  audienceList: any[] = []

  bucket: string = ''

  canExpiry = true

  canUpdate = true

  certificateList: any[] = ['Yes', 'No']

  changeCertificate(event: any): void {
    if (event == 'Yes') {
      this.isAddCerticate = true
    } else {
      this.isAddCerticate = false
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
        this.configSvc.instanceConfig.authoring.urlPatternMatching.forEach(v => {
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

  changeToDefaultImg($event: any) {
    $event.target.src = this.configSvc.instanceConfig ? this.configSvc.instanceConfig.logos.defaultContent : ''
  }

  checkCondition(meta: string, type: 'show' | 'required' | 'disabled'): boolean {
    if (type === 'disabled' && !this.isEditEnabled) {
      return true
    }
    return this.contentService.checkCondition(this.contentMeta.identifier, meta, type)
  }

  compareSkillFn(value1: { identifier: string }, value2: { identifier: string }) {
    return value1 && value2 ? value1.identifier === value2.identifier : value1 === value2
  }

  complexityLevelList: string[] = []

  conceptToggle() {
    this.addConcepts = !this.addConcepts
  }

  contentForm!: FormGroup

  contentMeta!: NSContent.IContentMeta

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

  creatorContactsCtrl!: FormControl

  creatorDetailsCtrl!: FormControl

  editorsCtrl!: FormControl

  employeeList: any[] = []

  protected fetchAccessRestrictions() {
    if (this.accessPathsCtrl.value.trim()) {
      this.accessPathList = this.ordinals.accessPaths.filter(
        (v: any) => v.toLowerCase().indexOf(this.accessPathsCtrl.value.toLowerCase()) === 0,
      )
    } else {
      this.accessPathList = this.ordinals.accessPaths.slice()
    }
  }

  protected fetchJobProfile() {
    if ((this.jobProfileCtrl.value || '').trim()) {
      this.jobProfileList = this.ordinals.jobProfile.filter(
        (v: any) => v.toLowerCase().indexOf(this.jobProfileCtrl.value.toLowerCase()) > -1,
      )
    } else {
      this.jobProfileList = this.ordinals.jobProfile.slice()
    }
  }

  protected fetchRegion() {
    if ((this.regionCtrl.value || '').trim()) {
      this.regionList = this.ordinals.region.filter((v: any) => v.toLowerCase().indexOf(this.regionCtrl.value.toLowerCase()) > -1)
    } else {
      this.regionList = []
    }
  }

  fetchTagsStatus: 'done' | 'fetching' | null = null

  fileUploadForm!: FormGroup

  filterOrdinals() {
    this.complexityLevelList = []
    this.ordinals.complexityLevel.map((v: any) => {
      if (v.condition) {
        let canAdd = false
        // tslint:disable-next-line: whitespace
        ;(v.condition.showFor || []).map((con: any) => {
          let innerCondition = false
          Object.keys(con).forEach(meta => {
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
          ;(v.condition.nowShowFor || []).map((con: any) => {
            let innerCondition = false
            Object.keys(con).forEach(meta => {
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

  filteredOptions$: Observable<string[]> = of([])

  formNext(index: number) {
    this.selectedIndex = index
  }

  hours = 0

  imageTypes = IMAGE_SUPPORT_TYPES

  infoType = ''

  isAddCerticate: boolean = false

  isEditEnabled = false

  isFileUploaded = false

  isSaveModuleFormEnable: boolean = false

  isSiemens = false

  jobProfileCtrl!: FormControl

  jobProfileList: any[] = []

  keywordsCtrl!: FormControl

  location = CONTENT_BASE_STATIC

  minutes = 1

  moduleButtonName: string = 'Create'

  moduleCreate(name: string) {
    this.moduleName = name
    this.isSaveModuleFormEnable = true
    this.moduleButtonName = 'Save'
  }

  moduleName: string = 'undefined title'

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

  ordinals!: any

  public parseJsonData(s: string) {
    try {
      const parsedString = JSON.parse(s)
      return parsedString
    } catch {
      return []
    }
  }

  publisherDetailsCtrl!: FormControl

  regionCtrl!: FormControl

  regionList: any[] = []

  removable = true

  removeCreatorDetails(keyword: any): void {
    const index = this.contentForm.controls.creatorDetails.value.indexOf(keyword)
    this.contentForm.controls.creatorDetails.value.splice(index, 1)
    this.contentForm.controls.creatorDetails.setValue(this.contentForm.controls.creatorDetails.value)
  }

  removeEmployee(employee: NSContent.IAuthorDetails, field: string): void {
    const index = this.contentForm.controls[field].value.indexOf(employee)
    this.contentForm.controls[field].value.splice(index, 1)
    this.contentForm.controls[field].setValue(this.contentForm.controls[field].value)
  }

  removeField(event: MatChipInputEvent) {
    // Reset the input value
    if (event.input) {
      event.input.value = ''
    }
  }

  removeFromFormControl(keyword: any, fieldName: string): void {
    const index = this.contentForm.controls[fieldName].value.indexOf(keyword)
    this.contentForm.controls[fieldName].value.splice(index, 1)
    this.contentForm.controls[fieldName].setValue(this.contentForm.controls[fieldName].value)
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

  removeSkill(skill: string) {
    const index = this.selectedSkills.indexOf(skill)
    this.selectedSkills.splice(index, 1)
  }

  resourceTypes: string[] = []

  routerSubscription!: Subscription

  saveParent: any

  seconds = 0

  selectable = true

  selectedIndex = 0

  selectedSkills: string[] = []

  readonly separatorKeysCodes: number[] = [ENTER, COMMA]

  protected setDuration(seconds: any) {
    const minutes = seconds > 59 ? Math.floor(seconds / 60) : 0
    const second = seconds % 60
    this.hours = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
    this.minutes = minutes ? minutes % 60 : 0
    this.seconds = second || 0
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

  showInfo(type: string) {
    this.infoType = this.infoType === type ? '' : type
  }

  showMoreGlance = false

  public sideNavBarOpened = false

  timeToSeconds() {
    let total = 0
    total += this.seconds ? (this.seconds < 60 ? this.seconds : 59) : 0
    total += this.minutes ? (this.minutes < 60 ? this.minutes : 59) * 60 : 0
    total += this.hours ? this.hours * 60 * 60 : 0
    this.contentForm.controls.duration.setValue(total)
  }

  timer: any

  trackByIndex(index: number): number {
    return index
  }

  trackContactsCtrl!: FormControl

  updateReviewer() {
    // this.contentForm.controls.trackContacts.setValue([{ id: '7983c8e5-6365-48cf-8a3c-fd1060fb0bbe', name: 'AnkitVerma' }])
    // this.contentForm.controls.publisherDetails.setValue([{ id: '7983c8e5-6365-48cf-8a3c-fd1060fb0bbe', name: 'AnkitVerma' }])
  }
}
