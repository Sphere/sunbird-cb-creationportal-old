import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core'
import { FormGroup, FormBuilder, Validators, AbstractControl } from '@angular/forms'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { Router } from '@angular/router'

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
  courseEdited: any
  isModule: boolean = false
  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<CommentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NSContent.IContentMeta,
    private authInitService: AuthInitService,
    private editorService: EditorService,
    private router: Router
  ) {
    this.authInitService.publishMessage.subscribe(
      async (result: any) => {
        /* tslint:disable-next-line */
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

      // console.log("here is updateUI", flag, this.contentMeta.children.length)
      if ((flag === count && flag !== 0 || count !== 0) && isDraftOrReview === 0) {
        this.showPublishCBPBtn = true
      } else {
        this.refreshCourse()
      }
    }
  }
  ngOnInit() {

    this.showNewFlow = this.authInitService.authAdditionalConfig.allowActionHistory
    this.contentMeta = this.data
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
    // console.log("here is ngOnInit", flag, count, isDraftOrReview)
    if ((flag === count && flag !== 0 || count !== 0) && isDraftOrReview === 0) {
      // console.log("yes here okay", isDraftOrReview === 0)
      this.showPublishCBPBtn = true
    }



    const nonWhitespaceRegExp: RegExp = new RegExp("\\S")

    this.commentsForm = this.formBuilder.group({
      comments: ['', [Validators.required, Validators.pattern(nonWhitespaceRegExp)]],
      // action: ['', [Validators.required]],
    })
    this.history = (this.contentMeta.comments || []).reverse()
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
    // console.log("here is ngOnInit", flag, count, isDraftOrReview)

    setTimeout(() => {
      if ((flag === count && flag !== 0 || count !== 0) && isDraftOrReview === 0) {
        this.showPublishCBPBtn = true
      }
    }, 500)
    // if (flag === count && flag !== 0 || count !== 0) {
    //   this.showPublishCBPBtn = true
    // }
  }

  publishCourse() {
    this.authInitService.changeMessage('PublishCBP')
  }
  moveCourseToDraft() {
    this.authInitService.changeMessage('MoveCourseToDraft')
  }

  click(action: string) {
    this.authInitService.changeMessage(action)
  }
}
