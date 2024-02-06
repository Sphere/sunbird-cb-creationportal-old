import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core'
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { Router } from '@angular/router'
import { ContentQualityService } from '../../../../../../../author/src/lib/routing/modules/editor/shared/services/content-quality.service'
import { NSIQuality } from '../../../../../../../author/src/lib/routing/modules/editor/interface/content-quality'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { ConfigurationsService } from '@ws-widget/utils'
import {
  ContentProgressService,
} from '@ws-widget/collection'
import moment from 'moment'
@Component({
  selector: 'ws-auth-root-comments-dialog',
  templateUrl: './comments-dialog.component.html',
  styleUrls: ['./comments-dialog.component.scss'],
})
export class CommentsDialogComponent implements OnInit {
  commentsForm!: FormGroup
  contentMeta!: NSContent.IContentMeta
  history = <NSContent.IComments[]>[]
  @Output() action = new EventEmitter<{ action: string }>()
  isSubmitPressed = false
  showNewFlow = false
  showPublishCBPBtn = false
  showPublishResourceBtn = false
  courseEdited: any
  isModule: boolean = false
  role!: any
  qualityResponse!: NSIQuality.IQualityResponse
  constructor(
    private _qualityService: ContentQualityService,
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<CommentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NSContent.IContentMeta,
    private authInitService: AuthInitService,
    private editorService: EditorService,
    private router: Router,
    private accessService: AccessControlService,
    private _configurationsService: ConfigurationsService,
    private progressSvc: ContentProgressService,
  ) {
    this.authInitService.publishMessage.subscribe(
      async (result: any) => {
        // tslint:disable-next-line:no-console
        if (result) {
          await this.updateUI(result)
        }
      })
  }
  updateUI(res: any) {
    if (res) {
      this.contentMeta = res
      let flag = 0
      for (const element of this.contentMeta.children) {
        // console.log('element', element)
        if (element.status === 'Live' && element.contentType !== 'CourseUnit') {
          flag += 1
        } else {
          if (element.contentType !== 'CourseUnit') {
            flag -= 1
          }
        }
        if (element.children) {
          for (const elem of element.children) {
            if (elem.status === 'Live') {
              flag += 1
            }
          }
        }
      }
      let count = 0, isDraftOrReview = 0
      for (const element of this.contentMeta.children) {
        // console.log('element', element)
        if (element.status === 'Live' && element.contentType !== 'CourseUnit') {
          count += 1
        }
        if (element.children) {
          for (const elem of element.children) {
            if (elem.status === 'Live') {
              count += 1
            }
            if (elem.status === 'Draft' || elem.status === 'Review') {
              isDraftOrReview += 1
            }
          }
        }
      }
      // console.log("here is ngOnInit", flag, count, isDraftOrReview)
      // tslint:disable-next-line:no-console
      console.log("here is updateUI", flag, count, isDraftOrReview)
      if ((flag === count && (flag !== 0 || count !== 0)) && isDraftOrReview === 0) {
        this.showPublishCBPBtn = true
        this.showPublishResourceBtn = true
      } else {
        this.refreshCourse()
      }
    }
  }
  ngOnInit() {

    this.showNewFlow = this.authInitService.authAdditionalConfig.allowActionHistory
    console.log(this.showNewFlow)
    this.contentMeta = this.data
    const reqObj = {
      resourceId: this.data.identifier,
      resourceType: 'content',
      // userId: this._configurationsService.userProfile.userId,
      getLatestRecordEnabled: true,
    }
    this.role = this.accessService.hasRole(['content_publisher'])
    if (this.role) {
      this._qualityService.fetchresult(reqObj).subscribe((result: any) => {
        if (result && result.result && result.result.resources) {
          const rse = result.result.resources || []
          if (rse.length === 1) {
            this.qualityResponse = rse[0]
          }
        }
      })
    }

    // console.log("this.contentMeta", this.contentMeta)
    // to check if the course is having topics
    for (const element of this.contentMeta.children) {
      if (element.children) {
        for (const elem of element.children) {
          if (elem) {
            this.isModule = true
          }
        }
      }
    }
    const url = this.router.url
    const id = url.split('/')
    this.editorService.contentRead(id[3])
      .subscribe((res: any) => {
        if (res.params.status === 'successful') {
          this.courseEdited = true
        } else {
          this.courseEdited = false
        }
      }, error => {
        if (error) {
          this.courseEdited = false
        }
      })


    let flag = 0
    for (const element of this.contentMeta.children) {
      // console.log('element', element)
      if (element.status === 'Live' && element.contentType !== 'CourseUnit') {
        flag += 1
      } else {
        if (element.contentType !== 'CourseUnit') {
          // console.log('element else', element)
          flag -= 1
        }
      }
      if (element.children) {
        for (const elem of element.children) {
          if (elem.status === 'Live') {
            flag += 1
          }
        }
      }
    }
    let count = 0, isDraftOrReview = 0
    for (const element of this.contentMeta.children) {
      // console.log('element', element)
      if (element.status === 'Live' && element.contentType !== 'CourseUnit') {
        count += 1
      }
      if (element.children) {
        for (const elem of element.children) {
          if (elem.status === 'Live') {
            count += 1
          }
          if (elem.status === 'Draft' || elem.status === 'Review') {
            // console.log('elem.status', elem)
            isDraftOrReview += 1
          }
        }
      }
    }
    // tslint:disable-next-line:no-console
    console.log("here is ngOnInit", flag, count, isDraftOrReview)
    if ((flag === count && (flag !== 0 || count !== 0)) && isDraftOrReview === 0) {
      // console.log("yes here okay", isDraftOrReview === 0)
      this.showPublishCBPBtn = true
      this.showPublishResourceBtn = true
    }



    const nonWhitespaceRegExp: RegExp = new RegExp("\\S")

    this.commentsForm = this.formBuilder.group({
      comments: ['', [Validators.required, Validators.pattern(nonWhitespaceRegExp)]],
      // action: ['', [Validators.required]],
    })
    this.history = (this.contentMeta.comments || []).reverse()
  }
  get getQualityPercent() {
    if (this.role) {
      const score = this.qualityResponse.finalWeightedScore || 0
      return score.toFixed(1)
    } else {
      return
    }
  }
  showError(formControl: AbstractControl) {
    if (formControl.invalid && !formControl.pristine) {
      if (this.isSubmitPressed) {
        return true
      }
      // if (formControl && formControl.touched) {
      //   return true
      // }
      return false
    }
    return false
  }

  submitData() {
    if (
      this.commentsForm.controls.comments.value &&
      ((!['Draft', 'Live'].includes(this.contentMeta.status)) ||
        ['Draft', 'Live'].includes(this.contentMeta.status))
    ) {
      this.dialogRef.close(this.commentsForm)
    } else {
      this.commentsForm.controls['comments'].markAsTouched()
      // this.commentsForm.controls['action'].markAsTouched()
    }
  }
  viewDetails() {
    this.dialogRef.close(this.commentsForm)
    this.router.navigate(['/author/reviewerChecklist/' + this.contentMeta.identifier])
  }
  refreshCourse() {
    const url = this.router.url
    const id = url.split('/')
    this.editorService.readcontentV3(id[3]).subscribe((res: any) => {
      this.contentMeta = res
      // let flag = 0
      // for (const element of this.contentMeta.children) {
      //   if (element.status === 'Live') {
      //     flag += 1
      //   }
      //   if (element.children) {
      //     flag += 1
      //   }
      // }
      // console.log("here is refreshCourse", flag, this.contentMeta.children.length)

      // setTimeout(() => {
      //   if (flag === this.contentMeta.children.length) {
      //     this.showPublishCBPBtn = true
      //   }
      // }, 500)

    })

    // else {
    //   //this.refreshCourse()
    // }
    let flag = 0, isDraftOrReview = 0
    for (const element of this.contentMeta.children) {
      // console.log('element', element)
      if (element.status === 'Live' && element.contentType !== 'CourseUnit') {
        flag += 1
      } else {
        if (element.contentType !== 'CourseUnit') {
          // console.log("element in else", element)
          flag -= 1
        }
      }
      if (element.children) {
        for (const elem of element.children) {
          if (elem.status === 'Live') {
            flag += 1
          }
        }
      }
    }
    let count = 0
    for (const element of this.contentMeta.children) {
      // console.log('element', element)
      if (element.status === 'Live' && element.contentType !== 'CourseUnit') {
        count += 1
      }
      if (element.children) {
        for (const elem of element.children) {
          if (elem.status === 'Live') {
            count += 1
          }
          if (elem.status === 'Draft' || elem.status === 'Review') {
            isDraftOrReview += 1
          }
        }
      }
    }
    // console.log("here is refreshCourse", flag, count)
    // tslint:disable-next-line:no-console
    console.log("here is refreshCourse", flag, count, isDraftOrReview)

    setTimeout(() => {
      if ((flag === count && (flag !== 0 || count !== 0)) && isDraftOrReview === 0) {
        this.showPublishCBPBtn = true
        this.showPublishResourceBtn = true
      }
    }, 1000)
    // if (flag === count && flag !== 0 || count !== 0) {
    //   this.showPublishCBPBtn = true
    // }
  }

  publishCourse() {
    this.authInitService.changeMessage('PublishCBP')
  }
  moveCourseToDraft() {
    console.log(this.contentMeta)
    let role = ''
    const url = this.router.url
    const id = url.split('/')
    let currentStatus = ''
    let nextStatus = ''
    if (this.contentMeta) {
      if (this.accessService.hasRole(['content_publisher'])) {
        role = 'publisher'
        currentStatus = this.contentMeta.status
        nextStatus = 'Draft'
      } else if (this.accessService.hasRole(['content_reviewer'])) {
        role = 'reviewer'
        currentStatus = "Review"
        nextStatus = 'Draft'
      } else {
        role = 'creator'
      }
      let dat = {
        "userId": this._configurationsService!.userProfile!.userId,
        "courseId": id[3],
        "role": role,
        "comments": this.commentsForm.value.comments === '' ? `Comment from ${role}` : this.commentsForm.value.comments,
        "currentStatus": currentStatus,
        "nextStatus": nextStatus,
        "readComments": false,
        "createdDate": moment().format('YYYY-MM-DD HH:mm:ss'),
        "updatedDate": moment().format('YYYY-MM-DD HH:mm:ss')
      }
      console.log(dat)
      this.progressSvc.addComment(dat).subscribe(res => {
        console.log(res)
        if (res) {
          this.authInitService.changeMessage('MoveCourseToDraft')
        }
      }, (err: any) => {
        console.log(err)
        this.authInitService.changeMessage('MoveCourseToDraft')
      })
    }

    //this.authInitService.changeMessage('MoveCourseToDraft')
  }

  click(action: string) {
    this.authInitService.changeMessage(action)
  }
}
