import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,

} from '@angular/core'
import { NSIQuality } from '../../../interface/content-quality'
import _ from 'lodash'
import { ContentQualityService } from '../../services/content-quality.service'
import { Router } from '@angular/router'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { LoaderService } from '../../../../../../services/loader.service'
import { AccessControlService } from '@ws/author'
import { MatDialog } from '@angular/material/dialog'
import { CommentsViewComponent } from '../../../../../../modules/shared/components/comments-view/comments-view.component'

@Component({
  selector: 'ws-reviewer-checklist-view',
  templateUrl: './reviewer-checklist.component.html',
  styleUrls: ['./reviewer-checklist.component.scss'],
})
export class ReviewerChecklist implements OnInit, OnDestroy, AfterViewInit {
  links: any = ['First', 'second', 'third']
  qualityResponse!: NSIQuality.IQualityResponse
  currentContent!: string
  content!: any
  loading: boolean = false
  constructor(private _qualityService: ContentQualityService, private router: Router,
    private editorService: EditorService,
    private loader: LoaderService,
    private authAccessService: AccessControlService,
    public dialog: MatDialog,


  ) {
    const url = this.router.url
    const id = url.split('/')
    this.loading = true
    this.loader.changeLoad.next(true)

    this.editorService.readcontentV3(id[3]).subscribe((data: any) => {
      this.content = data
      console.log("data", data)
    })
    const reqObj = {
      resourceId: id[3],
      resourceType: 'content',
      getLatestRecordEnabled: true,
    }
    this._qualityService.fetchresult(reqObj).subscribe((result: any) => {
      this.loading = false
      this.loader.changeLoad.next(false)

      if (result && result.result && result.result.resources) {
        const rse = result.result.resources || []
        if (rse.length === 1) {
          this.qualityResponse = rse[0]
          console.log("rse: ", rse[0])
        }
      }
    })
  }
  ngOnDestroy() {
  }

  ngAfterViewInit() {
  }

  ngOnInit() {

  }
  get getQualityPercent() {
    const score = this.qualityResponse.finalWeightedScore || 0
    return score.toFixed(1)
  }

  redirectBack() {
    if (this.authAccessService.hasRole(['content_reviewer'])) {
      this.router.navigate([`/author/toc/${this.content.identifier}/overview`])
    }

    if (this.authAccessService.hasRole(['content_creator'])) {
      this.router.navigate([`/author/toc/${this.content.identifier}/overview`])
    }
    if (this.authAccessService.hasRole(['content_publisher'])) {
      this.router.navigate([`/author/toc/${this.content.identifier}/overview`])

      // this.router.navigate([`/author/cbp`])
    }
  }
  openComments(question: any) {

    const dialogRef = this.dialog.open(CommentsViewComponent, {
      width: '450px',
      height: '250px',
      data: question,
    })

    dialogRef.afterClosed().subscribe((d: any) => {
      console.log(d)
    })
  }
}
