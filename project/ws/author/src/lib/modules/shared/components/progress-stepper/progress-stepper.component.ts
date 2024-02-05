import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'


@Component({
  selector: 'ws-progress-stepper',
  templateUrl: './progress-stepper.component.html',
  styleUrls: ['./progress-stepper.component.scss'],
})
export class ProgressStepperComponent implements OnInit {
  @Input() steps: any = '';
  @Input() header: any = ''
  @Output() sendSteps = new EventEmitter<any>();
  constructor(private initService: AuthInitService,
  ) {
  }

  ngOnInit() {

  }
  navigate(step: any) {
    console.log("AssessmentDetails", step)
    if (step !== 'Introduction' && step !== 'AssessmentDetails') {
      const activeIndex = this.steps.findIndex((step: { activeStep: boolean }) => step.activeStep === true)
      const targetIndex = this.steps.findIndex((item: any) => item.key === step)

      if (activeIndex > 0 && targetIndex < activeIndex) {
        const previousStep = this.steps[activeIndex - 1]
        console.log("Previous Step:", previousStep)
        this.sendSteps.emit(previousStep.key)
        this.initService.isBackButtonClickedAction('backButtonClicked')
      }
    }

  }

}
