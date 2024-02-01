import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'


@Component({
  selector: 'ws-progress-stepper',
  templateUrl: './progress-stepper.component.html',
  styleUrls: ['./progress-stepper.component.scss'],
})
export class ProgressStepperComponent implements OnInit {
  @Input() steps: any = '';
  @Input() header: any = ''
  @Output() sendSteps = new EventEmitter<any>();
  constructor(
  ) {
  }

  ngOnInit() {

  }
  navigate(step: any) {
    console.log("step", step)
    this.sendSteps.emit(step)
  }

}
