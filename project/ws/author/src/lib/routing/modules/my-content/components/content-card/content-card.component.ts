import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { Router } from '@angular/router'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { MatDialog } from '@angular/material/dialog'
import { CertificateDialogComponent } from '@ws/author/src/lib/modules/shared/components/certificate-upload-dialog/certificate-upload-dialog.component'
import { LoaderService } from 'project/ws/author/src/lib/services/loader.service'
import { CertificateStatusDialogComponentDialogComponent } from '../../../../../modules/shared/components/cert-upload-status-dialog/cert-upload-status-dialogcomponent'

@Component({
  selector: 'ws-auth-root-content-card',
  templateUrl: './content-card.component.html',
  styleUrls: ['./content-card.component.scss'],
})
export class ContentCardComponent implements OnInit {
  @Input() data: any
  @Input() competencyData: any
  @Input() ordinals: any
  @Input() forExpiry = false
  @Input() forDelete = false
  @Input() changeView = false
  addedCompetency: any
  filteredSubTitles: any[] = []
  translationArray: any = []
  userId!: string
  pageName = false
  CourseStatusName: string = ''
  @Output() action = new EventEmitter<any>()
  isBaseContent: Boolean = true
  isReviewerOrPublisher: Boolean = false
  constructor(private accessService: AccessControlService,
    private authInitService: AuthInitService,
    private router: Router,
    private editorService: EditorService,
    public dialog: MatDialog,
    private loader: LoaderService,
  ) { }

  ngOnInit() {
    this.data.appIcon = this.data.appIcon || 'cbp-assets/icons/default.png'
    if (this.accessService.hasRole(['content_reviewer']) || this.accessService.hasRole(['content_publisher'])) {
      this.isReviewerOrPublisher = true
    } else {
      this.isReviewerOrPublisher = false
    }
    if ((this.router.url).includes('published')) {
      this.pageName = true
    }
    if (this.data.hasTranslations && this.data.hasTranslations.length) {
      this.translationArray = this.translationArray.concat(this.data.hasTranslations)
    }
    if (this.data.isTranslationOf && this.data.isTranslationOf.length) {
      this.isBaseContent = false
      this.translationArray = this.translationArray.concat(this.data.isTranslationOf)
    }
    this.filteredSubTitles = this.translationArray.length
      ? this.ordinals.subTitles.filter(
        (elem: any) => !this.translationArray.find((item: any) => elem.srclang === item.locale),
      )
      : this.ordinals.subTitles
    this.userId = this.accessService.userId
    this.getCourseStatusName()
  }

  getCourseStatusName(): void {
    if (this.data.status == 'Draft') {
      this.CourseStatusName = 'Draft'
    }
    else if (this.data.status == 'Review') {
      this.CourseStatusName = 'Sent for review'
    }
    else if (this.data.status == 'Live') {
      this.CourseStatusName = 'Published'
    }
    else if (this.data.status == 'Retired') {
      this.CourseStatusName = 'Retired'
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['competencyData'] && this.competencyData && this.data) {
      this.getCourseCompetency()
    }
  }
  getCourseCompetency() {
    let combinedArray = ''
    console.log("this.data", this.competencyData)
    if (this.data.competencies_v1 && this.data.competencies_v1.length > 0) {
      debugger
      const competencies = JSON.parse(this.data.competencies_v1)
      let finalComp = ""
      combinedArray = competencies.map((element: any) => {
        if (element.competencyId) {
          const matchingValue = this.competencyData.find((value: any) => value.id == element.competencyId)
          finalComp = {
            ...element,
            ...(matchingValue?.additionalProperties || {})
          }
          return finalComp
        }
        return finalComp


      })
    }

    this.addedCompetency = combinedArray
    console.log("addedCompetency", this.addedCompetency)
  }

  getName(lang: string): string {
    const language = this.ordinals.subTitles.find((v: any) => v.srclang === lang)
    return language ? language.label : lang
  }

  showMenuItem(menuType: string) {
    let returnValue = false
    switch (menuType) {
      case 'edit':
      case 'delete':
        if (this.data.status === 'Draft' || this.data.status === 'Live') {
          returnValue = this.accessService.hasAccess(this.data)
        }
        if (this.data.authoringDisabled && menuType === 'edit') {
          returnValue = false
        }
        break
      case 'moveToDraft':
        if (
          this.data.status === 'InReview' ||
          this.data.status === 'Unpublished' ||
          this.data.status === 'Reviewed' ||
          this.data.status === 'QualityReview' ||
          this.data.status === 'Draft'
        ) {
          returnValue = this.accessService.hasAccess({ ...this.data, status: 'Draft' })
        }
        break
      case 'moveToInReview':
        if (this.data.status === 'Reviewed' || this.data.status === 'QualityReview') {
          returnValue = this.accessService.hasAccess({ ...this.data, status: 'InReview' })
        }
        break
      case 'publish':
        // if (this.data.status === 'Reviewed') {
        if (this.data.reviewStatus === 'Reviewed' && this.data.status === 'Review') {
          returnValue = this.accessService.hasAccess(this.data)
        }
        break
      case 'unpublish':
        if (this.data.status === 'Live') {
          returnValue = this.accessService.hasAccess(this.data)
        }
        break
      case 'review':
        // if (this.data.status === 'Review' || this.data.status === 'QualityReview') {
        if (this.data.reviewStatus === 'InReview' && this.data.status === 'Review') {
          returnValue = this.accessService.hasAccess(this.data)
        }
        break
      case 'preview':
        // if (this.data.status === 'Review' || this.data.status === 'QualityReview') {
        if ((this.data.reviewStatus === 'InReview' && this.data.status === 'Review') || (this.data.reviewStatus === 'Reviewed' && this.data.status === 'Review')) {
          returnValue = this.accessService.hasAccess(this.data)
        }
        break
      case 'lang':
        returnValue = this.accessService.hasAccess({ ...this.data, status: 'Draft' })
        break
    }
    return returnValue
  }

  create(language: string) {
    this.action.emit({
      type: 'create',
      data: { ...this.data, locale: language },
    })
  }

  viewComments() {
    this.action.emit({
      type: 'comments',
    })
  }

  takeAction(actionType: string) {
    this.action.emit({
      type: actionType,
      data: this.data,
    })
  }

  editCourse(actionType: string, data: any) {
    if (data.status === 'Live') {
      let requestBody: any
      this.editorService.readContentV2(data.identifier).subscribe(resData => {
        let meta: any = {
          versionKey: resData.versionKey,
        }
        requestBody = {
          request: {
            content: meta
          }
        }
        this.editorService.updateNewContentV3(requestBody, data.identifier).subscribe(
          (response: any) => {
            if (response.params.status === "successful") {
              this.router.navigateByUrl(`/author/editor/${data.identifier}`)
            }
          })

      })
    } else {
      this.router.navigateByUrl(`/author/editor/${data.identifier}`)
    }
    this.authInitService.editCourse(actionType)
  }
  uploadCertificate(data: any) {
    console.log(data)
    this.loader.changeLoad.next(true)
    const req = {
      request: {
        filters: {
          courseId: data.identifier,
          status: ['0', '1', '2'],
        },
        sort_by: { createdDate: 'desc' },
      },
    }
    this.editorService.getBatchforCert(req).subscribe((res: any) => {
      console.log(res)
      let cert = res
      if (cert && cert[0] && cert[0].cert_templates != null) {
        this.loader.changeLoad.next(false)
        console.log(Object.keys(cert[0]['cert_templates']).length)
        if (Object.keys(cert[0]['cert_templates']).length) {
          this.dialog.open(CertificateStatusDialogComponentDialogComponent, {
            width: '450px',
            height: '300x',
            data: {
              'message': 'There is already a certificate assigned to this course. To modify it please contact Aastrika support at support@aastrika.org from  your registered email id.', 'icon': 'info', 'color': '#f44336', 'backgroundColor': '#FFFFF', 'padding': '6px 11px 10px 6px !important', 'id': '', 'cert_upload': 'Yes'
            },
          })
        }
      } else {
        this.loader.changeLoad.next(false)
        const dialogRef = this.dialog.open(CertificateDialogComponent, {
          width: '1085px',
          height: '645px',
          data,
        })
        // You can subscribe to the afterClosed() observable to do something when the dialog is closed.
        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog was closed', result)
          // You can perform any actions you need here after the dialog is closed.
        })
      }
    })


  }

  changeToDefaultImg($event: any) {
    $event.target.src = this.accessService.defaultLogo || 'cbp-assets/icons/default.png'
  }
}
