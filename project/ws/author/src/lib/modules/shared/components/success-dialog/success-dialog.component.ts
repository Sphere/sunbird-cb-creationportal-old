import { Component, OnInit, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { ISearchContent } from '@ws/author/src/lib/interface/search'
import { Router } from '@angular/router'
import { MatDialog } from '@angular/material'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { ConfigurationsService } from 'library/ws-widget/utils/src/lib/services/configurations.service'
import moment from 'moment'
import {
  ContentProgressService,
} from '@ws-widget/collection'
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
    private editorService: EditorService,
    private _configurationsService: ConfigurationsService,
    private progressSvc: ContentProgressService,
  ) {
    dialogRef.disableClose = true
  }

  ngOnInit() {
    // tslint:disable-next-line:no-console
    console.log(this.data)
    setTimeout(() => {
      this.editorService.readcontentV3(this.data.id).subscribe(async (data: any) => {
        // tslint:disable-next-line:no-console
        console.log(data)
      })
    }, 500)
  }
  routeToDashboard() {
    if (!this.data.cert_upload && this.data.cert_upload != 'Yes') {
      this.editorService.readcontentV3(this.data.id).subscribe(async (data: any) => {
        // tslint:disable-next-line:no-console
        console.log(data)
        if (data.status === 'Live' || data.status === 'Processing' && data.batches == undefined) {
          let obj = {
            "request": {
              "courseId": this.data.id,
              "name": "Open Batch",
              "description": "Open Batch",
              "enrollmentType": "open",
              "startDate": moment(new Date()).format("YYYY-MM-DD"),
              "endDate": "2031-01-01",
              "enrollmentEndDate": "2030-12-01",
              "createdBy": this._configurationsService.userProfile!.userId
            }
          }
          let dat = {
            "userId": this._configurationsService!.userProfile!.userId,
            "courseId": this.data.id,
            "role": "publisher",
            "comments": " ",
            "currentStatus": "Sent for Publish",
            "nextStatus": "Course Published",
            "readComments": false,
            "createdDate": moment(new Date()).toISOString(),
            "updatedDate": moment(new Date()).toISOString()
          }
          console.log(dat)
          this.progressSvc.addComment(dat).subscribe((res: any) => {
            console.log(res)
            //this.commentsList = res
          }, (err: any) => {
            console.log(err)
          })
          // tslint:disable-next-line:no-console
          console.log(obj)
          let data = await this.editorService.createBatch(obj).toPromise().catch(_error => { })
          // tslint:disable-next-line:no-console
          console.log(data)
        }
      })
    }

    this.dialog.closeAll()
    this.router.navigate(['author', 'cbp'])
  }
}
