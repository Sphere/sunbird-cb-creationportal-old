import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { ActivatedRoute, Router } from '@angular/router'
import { MatDialog } from '@angular/material'

@Component({
  selector: 'ws-auth-root-review-dialog',
  templateUrl: './review-dialog.component.html',
  styleUrls: ['./review-dialog.component.scss'],
})
export class ReviewDialogComponent implements OnInit {

  @Output() action = new EventEmitter<{ action: string }>()

  constructor(
    public dialogRef: MatDialogRef<ReviewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: NSContent.IContentMeta,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private dialog: MatDialog,
  ) {

  }

  ngOnInit() {
  }
  submit(message: string) {
    console.log("message", message)
    if (message == 'review') {
      this.dialog.closeAll()
      sessionStorage.setItem('isReviewChecklist', 'true')
      this.router.navigateByUrl(`/author/editor/${this.activatedRoute.snapshot.queryParams.collectionId}`)
      console.log(this.activatedRoute.snapshot.queryParams.collectionId)
    } else {
      this.dialog.closeAll()
    }
  }
}
