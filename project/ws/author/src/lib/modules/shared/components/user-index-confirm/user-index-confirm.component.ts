import { Component, OnInit, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'

@Component({
  selector: 'ws-author-user-index-confirm',
  templateUrl: './user-index-confirm.component.html',
  styleUrls: ['./user-index-confirm.component.scss']
})
export class UserIndexConfirmComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<UserIndexConfirmComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {
    console.log(this.data)
  }
  onCancel(text: string): void {
    this.dialogRef.close(text)
  }
}
