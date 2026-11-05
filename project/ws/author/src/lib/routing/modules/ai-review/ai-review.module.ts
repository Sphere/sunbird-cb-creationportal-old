import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { AiReviewFilesPageComponent } from './components/ai-review-files-page/ai-review-files-page.component'
import { AiReviewPageComponent } from './components/ai-review-page/ai-review-page.component'
import { AiReviewReportComponent } from './components/ai-review-report/ai-review-report.component'
import { AirBusyComponent } from './components/air-busy/air-busy.component'
import { AirComboboxComponent } from './components/air-combobox/air-combobox.component'
import { AirEvidenceComponent } from './components/air-evidence/air-evidence.component'
import { AirIconComponent } from './components/air-icon/air-icon.component'
import { AirReviewRunComponent } from './components/air-review-run/air-review-run.component'
import { AirRoleCheckComponent } from './components/air-role-check/air-role-check.component'
import { AirSelectComponent } from './components/air-select/air-select.component'
import { AiReviewService } from './services/ai-review.service'

/**
 * /author/ai-review/files — the user's own files; /author/ai-review/:courseId — a course.
 * `?review=<id>` opens a particular review. `files` comes first so it is not read as a course id.
 */
const routes: Routes = [
  { path: 'files', component: AiReviewFilesPageComponent },
  { path: ':courseId', component: AiReviewPageComponent },
]

/**
 * AI review of a course, started from the course page, and of the user's own files, from My
 * Workspace. Advisory only: it reports, and changes nothing in a course or its review workflow.
 */
@NgModule({
  declarations: [
    AiReviewFilesPageComponent,
    AiReviewPageComponent,
    AiReviewReportComponent,
    AirBusyComponent,
    AirComboboxComponent,
    AirEvidenceComponent,
    AirIconComponent,
    AirReviewRunComponent,
    AirRoleCheckComponent,
    AirSelectComponent,
  ],
  imports: [CommonModule, RouterModule.forChild(routes)],
  providers: [AiReviewService],
})
export class AiReviewModule {}
