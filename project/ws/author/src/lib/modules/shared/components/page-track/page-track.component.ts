import { ISearchContent } from '@ws/author/src/lib/interface/search'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { Component, Input, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'



interface IWorkFlowStepper {
  name: string
  isCompleted: boolean
  isActive: boolean
}
const steps: IWorkFlowStepper[] = [
  {
    name: 'Introduction',
    isCompleted: true,
    isActive: true,
  },
  {
    name: 'Course Details',
    isCompleted: false,
    isActive: false,

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
  constructor(private router: Router, private initService: AuthInitService,

  ) { }

  ngOnInit() {

    const courseCreate = this.router.url.includes('/author/create')
    if (courseCreate) {
      const introduction = steps.find(step => step.name === 'Introduction')
      if (introduction) {
        introduction.isActive = true
        introduction.isCompleted = false
      }
      let courseDetailsStep = steps.find(step => step.name === 'Course Details')
      if (courseDetailsStep) {
        courseDetailsStep.isActive = false
        courseDetailsStep.isCompleted = false

      }
    }
    const courseDetails = this.router.url.includes('/author/editor')
    if (courseDetails) {
      let introduction = steps.find(step => step.name === 'Introduction')
      if (introduction) {
        introduction.isActive = true
        introduction.isCompleted = true

      }
      let courseDetailsStep = steps.find(step => step.name === 'Course Details')
      if (courseDetailsStep) {
        courseDetailsStep.isActive = true
      }
    }
    this.initService.currentPageStatusMessage.subscribe((message) => {
      console.log("message: ", message)
      if (message == 'courseDetailsPage') {
        let introduction = steps.find(step => step.name === 'Introduction')
        if (introduction) {
          introduction.isActive = true
          introduction.isCompleted = true

        }
        let courseDetailsStep = steps.find(step => step.name === 'Course Details')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = true

        }
        courseDetailsStep = steps.find(step => step.name === 'Course Builder')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = false

        }
        courseDetailsStep = steps.find(step => step.name === 'Course Settings')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = false
          courseDetailsStep.isCompleted = false
        }
      } else if (message == 'courseSettingsPage') {
        let courseDetailsStep = steps.find(step => step.name === 'Course Details')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = true

        }
        courseDetailsStep = steps.find(step => step.name === 'Course Builder')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = true
        }
        courseDetailsStep = steps.find(step => step.name === 'Course Settings')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = true
        }
      } else if (message == 'backFromModulePage') {
        let introduction = steps.find(step => step.name === 'Introduction')
        if (introduction) {
          introduction.isActive = true
          introduction.isCompleted = true

        }
        let courseDetailsStep = steps.find(step => step.name === 'Course Details')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = false
        }
        courseDetailsStep = steps.find(step => step.name === 'Course Builder')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = false
          courseDetailsStep.isCompleted = false
        }
        courseDetailsStep = steps.find(step => step.name === 'Course Settings')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = false
          courseDetailsStep.isCompleted = false
        }
        console.log("backFromModulePage", steps)

      }
      else if (message == 'fromSettings') {
        let introduction = steps.find(step => step.name === 'Introduction')
        if (introduction) {
          introduction.isActive = true
          introduction.isCompleted = true

        }
        let courseDetailsStep = steps.find(step => step.name === 'Course Details')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = true
        }
        courseDetailsStep = steps.find(step => step.name === 'Course Builder')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = true
          courseDetailsStep.isCompleted = false
        }
        courseDetailsStep = steps.find(step => step.name === 'Course Settings')
        if (courseDetailsStep) {
          courseDetailsStep.isActive = false
          courseDetailsStep.isCompleted = false
        }
        console.log("backFromModulePage", steps)

      }
    })
    console.log("steps", steps)

    this.workFlow.push(...steps)
  }

}
