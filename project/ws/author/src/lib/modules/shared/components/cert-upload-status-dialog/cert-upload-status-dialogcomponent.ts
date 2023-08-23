import { Component, OnInit, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { ISearchContent } from '@ws/author/src/lib/interface/search'
import { Router } from '@angular/router'
import { MatDialog } from '@angular/material'
@Component({
  selector: 'ws-auth-success-dialog',
  templateUrl: './cert-upload-status-dialog.component.html',
  styleUrls: ['./cert-upload-status-dialog.component.scss'],
})
export class CertificateStatusDialogComponentDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<CertificateStatusDialogComponentDialogComponent>,
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
    this.router.navigate(['author/my-content'], { queryParams: { status: 'courseWithCertificate' } })
    // this.router.navigate(['/app/setup/home/done'])
    // this.router.navigate(['author', 'cbp'])
  }
}
