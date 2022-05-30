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
        console.log(result)
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
        if (element.status === 'Live') {
          flag += 1
        } else {
          flag -= 1
        }
      }
      if (flag === this.contentMeta.children.length) {
        this.showPublishCBPBtn = true
      } else {
        this.refreshCourse()
      }
    }
  }
  ngOnInit() {
    
    this.showNewFlow = this.authInitService.authAdditionalConfig.allowActionHistory
    this.contentMeta = this.data
    // let flag = 0
    // let count = 0
    // for (const element of this.contentMeta.children) {
    //   if (element.status === 'Live') {
    //     flag += 1
    //   }
    //   if (element.children) {
    //     for (const elem of element.children) {
    //       if (elem.status === 'Live') {
    //         count += 1
    //       }
    //     }
    //   }
    // }
    const url = this.router.url
    const id = url.split('/')
    this.editorService.contentRead(id[3])
      .subscribe((res: any) => {
        if (res.params.status === 'successful') {
          this.courseEdited = true
        } else {
          this.courseEdited = false
        }
      },         error => {
        if (error) {
          this.courseEdited = false
        }
      })
    let flag = 0
    for (const element of this.contentMeta.children) {
      if (element.status === 'Live') {
        flag += 1
      } else {
         flag -= 1
      }
      // if (element.children) {
      //   flag += 1
      // }
    }

    if (flag === this.contentMeta.children.length) {
      this.showPublishCBPBtn = true
    }

    this.commentsForm = this.formBuilder.group({
      comments: ['', [Validators.required]],
      action: ['', [Validators.required]],
    })
    this.history = (this.contentMeta.comments || []).reverse()
  }

  showError(formControl: AbstractControl) {
    if (formControl.invalid) {
      if (this.isSubmitPressed) {
        return true
      }
      if (formControl && formControl.touched) {
        return true
      }
      return false
    }
    return false
  }

  submitData() {
    if (
      this.commentsForm.controls.comments.value &&
      ((!['Draft', 'Live'].includes(this.contentMeta.status) &&
        this.commentsForm.controls.action.value) ||
        ['Draft', 'Live'].includes(this.contentMeta.status))
    ) {
      this.dialogRef.close(this.commentsForm)
    } else {
      this.commentsForm.controls['comments'].markAsTouched()
      this.commentsForm.controls['action'].markAsTouched()
    }
  }
  refreshCourse() {
    const url = this.router.url
    const id = url.split('/')
    this.editorService.readcontentV3(id[3]).subscribe((res: any) => {
      this.contentMeta = res
    })
    let flag = 0
    for (const element of this.contentMeta.children) {
      if (element.status === 'Live') {
        flag += 1
      }
      if (element.children) {
        flag += 1
      }
    }

    if (flag === this.contentMeta.children.length) {
      this.showPublishCBPBtn = true
    }
    // else {
    //   //this.refreshCourse()
    // }
    // let flag = 0
    // for (const element of this.contentMeta.children) {
    //   if (element.status === 'Live') {
    //     flag += 1
    //   } else {
    //     flag -= 1
    //   }
    // if (element.children) {
    //   for (const elem of element.children) {
    //     if (elem.status === 'Live') {
    //       flag += 1
    //     }
    //   }
    // }
    // }
    // let count = 0
    // for (const element of this.contentMeta.children) {
    //   if (element.status === 'Live') {
    //     count += 1
    //   }
    //   if (element.children) {
    //     for (const elem of element.children) {
    //       if (elem.status === 'Live') {
    //         count += 1
    //       }
    //     }
    //   }
    // }
    /* tslint:disable-next-line */
    //console.log(143)
    /* tslint:disable-next-line */
    //console.log(flag, 145)
    // if (flag === count) {
    // this.showPublishCBPBtn = true
    // }
  }

  publishCourse() {
    this.authInitService.changeMessage('PublishCBP')
  }

  click(action: string) {
    this.authInitService.changeMessage(action)
  }
}
