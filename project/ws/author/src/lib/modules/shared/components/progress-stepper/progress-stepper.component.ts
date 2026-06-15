import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core'

import { AuthInitService } from '@ws/author/src/lib/services/init.service'

@Component({
  standalone: false,
  selector: 'ws-progress-stepper',
  templateUrl: './progress-stepper.component.html',
  styleUrls: ['./progress-stepper.component.scss'],
})
export class ProgressStepperComponent implements OnInit, OnChanges {
  @Input() steps: any = [
    { label: '1. Introduction', key: 'Introduction', activeStep: true, completed: false },
    { label: '2. Course Details', key: 'CourseDetails', activeStep: false, completed: false },
    { label: '3. Course Builder', key: 'CourseBuilder', activeStep: false, completed: false },
    { label: '4. Course Settings', key: 'CourseSettings', activeStep: false, completed: false },
  ]
  @Input() header: any = ''
  // When true, the Next button is disabled (current step's required inputs are incomplete).
  @Input() nextDisabled = false
  // When true, the Next button is hidden entirely (e.g. the assessment quiz builder
  // navigates from the course builder page itself, not via the stepper).
  @Input() hideNext = false
  @Output() sendSteps = new EventEmitter<any>()
  @Output() onNext = new EventEmitter<void>()

  isNavigating = false
  navigatingStep = ''
  private navResetTimer: any

  constructor(private initService: AuthInitService) {}

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    // When the parent pushes back updated steps after processing navigation, clear the loading state
    if (changes['steps'] && !changes['steps'].firstChange && this.isNavigating) {
      this.stopNavigating()
    }
  }

  navigate(step: any) {
    if (this.isNavigating) {
      return
    }
    if (Array.isArray(this.steps) && this.steps.length > 0) {
      if (step !== 'Introduction' && step !== 'AssessmentDetails') {
        const activeIndex = this.steps.findIndex((s: { activeStep: boolean }) => s.activeStep === true)
        const targetIndex = this.steps.findIndex((item: any) => item.key === step)

        if (activeIndex > 0 && targetIndex < activeIndex) {
          this.isNavigating = true
          this.navigatingStep = step
          this.sendSteps.emit(step)
          this.initService.currentNavigations(step)

          // Fallback: auto-clear after 8s so the UI never stays permanently frozen
          clearTimeout(this.navResetTimer)
          this.navResetTimer = setTimeout(() => {
            this.stopNavigating()
          }, 8000)
        }
      }
    }
  }

  stopNavigating() {
    this.isNavigating = false
    this.navigatingStep = ''
    clearTimeout(this.navResetTimer)
  }
}
