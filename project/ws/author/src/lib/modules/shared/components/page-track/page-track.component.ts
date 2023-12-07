import { ISearchContent } from '@ws/author/src/lib/interface/search'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { Component, Input, OnInit } from '@angular/core'



interface IWorkFlowStepper {
  name: string
  isCompleted: boolean
  isActive: boolean
}

@Component({
  selector: 'ws-auth-page-track',
  templateUrl: './page-track.component.html',
  styleUrls: ['./page-track.component.scss'],
})
export class PageTrackComponent implements OnInit {
  @Input() content!: NSContent.IContentMeta | ISearchContent
  @Input() isDialog = true
  workFlow: IWorkFlowStepper[] = []
  currentStage = 0
  constructor(
  ) { }

  ngOnInit() {
    const steps: IWorkFlowStepper[] = [
      {
        name: 'Introduction',
        isCompleted: true,
        isActive: true,
      },
      {
        name: 'Course Details',
        isCompleted: false,
        isActive: true,

      },
      {
        name: 'Course Builder',
        isCompleted: false,
        isActive: false,

      },
      {
        name: 'Course Settings',
        isCompleted: false,
        isActive: false,

      },
    ]

    this.workFlow.push(...steps)
  }

}
