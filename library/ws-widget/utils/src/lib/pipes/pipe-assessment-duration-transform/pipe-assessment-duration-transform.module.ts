import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PipeAssessmentDurationTransformPipe } from './pipe-assessment-duration-transform.pipe'

@NgModule({
  declarations: [PipeAssessmentDurationTransformPipe],
  imports: [
    CommonModule,
  ],
  exports: [PipeAssessmentDurationTransformPipe],
})
export class PipeAssessmentDurationTransformModule { }
