import { Component, OnInit, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'

@Component({
  selector: 'ws-auth-root-comments-view',
  templateUrl: './comments-view.component.html',
  styleUrls: ['./comments-view.component.scss'],
})
export class CommentsViewComponent implements OnInit {
  constructor(

    public dialogRef: MatDialogRef<CommentsViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,

  ) {

  }

  ngOnInit() {
    console.log("public constructor", this.data)
  }

}
