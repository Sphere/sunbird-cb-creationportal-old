import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AiReviewPageComponent } from './components/ai-review-page/ai-review-page.component'
import { AiReviewReportComponent } from './components/ai-review-report/ai-review-report.component'
import { AirBusyComponent } from './components/air-busy/air-busy.component'
import { AirComboboxComponent } from './components/air-combobox/air-combobox.component'
import { AirEvidenceComponent } from './components/air-evidence/air-evidence.component'
import { AirIconComponent } from './components/air-icon/air-icon.component'
import { AirSelectComponent } from './components/air-select/air-select.component'
import { AiReviewService } from './services/ai-review.service'

/** /author/ai-review/:courseId — `?review=<id>` opens a particular review. */
const routes: Routes = [{ path: ':courseId', component: AiReviewPageComponent }]

/**
 * AI review of a course, started from the course page. Advisory only: it reads the course
 * and reports on it, and changes nothing in the course or its review workflow.
 */
@NgModule({
  declarations: [AiReviewPageComponent, AiReviewReportComponent, AirBusyComponent, AirComboboxComponent, AirEvidenceComponent, AirIconComponent, AirSelectComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  providers: [AiReviewService],
})
export class AiReviewModule {}
