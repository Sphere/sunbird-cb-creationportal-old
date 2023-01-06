import { Component, OnInit, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { ISearchContent } from '@ws/author/src/lib/interface/search'
import { Router } from '@angular/router'
import { MatDialog } from '@angular/material'

@Component({
  selector: 'ws-auth-success-dialog',
  templateUrl: './success-dialog.component.html',
  styleUrls: ['./success-dialog.component.scss'],
})
export class SuccessDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<SuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ISearchContent,
    private router: Router,
    private dialog: MatDialog,
  ) {
    dialogRef.disableClose = true
  }

  ngOnInit() {
  }
  routeToDashboard() {
    this.dialog.closeAll()
    this.router.navigate(['author', 'cbp'])
  }
}
