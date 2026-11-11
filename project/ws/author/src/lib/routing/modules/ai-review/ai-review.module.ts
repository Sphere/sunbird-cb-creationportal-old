import { CommonModule } from '@angular/common'
import { NgModule, inject } from '@angular/core'
import { ConfigurationsService } from '@ws-widget/utils'
import { RouterModule, Routes } from '@angular/router'
import { AiReviewNewPageComponent } from './components/ai-review-new-page/ai-review-new-page.component'
import { AiReviewHistoryPageComponent } from './components/ai-review-history-page/ai-review-history-page.component'
import { AiReviewCoursePageComponent } from './components/ai-review-course-page/ai-review-course-page.component'
import { AiReviewReportComponent } from './components/ai-review-report/ai-review-report.component'
import { AirBusyComponent } from './components/air-busy/air-busy.component'
import { AirComboboxComponent } from './components/air-combobox/air-combobox.component'
import { AirEvidenceComponent } from './components/air-evidence/air-evidence.component'
import { AirIconComponent } from './components/air-icon/air-icon.component'
import { AirReviewRunComponent } from './components/air-review-run/air-review-run.component'
import { AirRoleCheckComponent } from './components/air-role-check/air-role-check.component'
import { AirSelectComponent } from './components/air-select/air-select.component'
import { AiReviewService } from './services/ai-review.service'
import { AIR_VIEWER } from './utils/review-run'

/**
 * The AI review's addresses (see utils/routes.ts):
 *   /author/ai-review — Past reviews; /author/ai-review/new — a review of the user's own files;
 *   /author/ai-review/courses/:courseId — a course's review. `?review=<id>` opens one review.
 * The addresses used before redirect here (query parameters are kept), so old links still work.
 */
const routes: Routes = [
  { path: '', pathMatch: 'full', component: AiReviewHistoryPageComponent },
  { path: 'new', component: AiReviewNewPageComponent },
  { path: 'courses/:courseId', component: AiReviewCoursePageComponent },
  // Earlier addresses.
  { path: 'mine', redirectTo: '', pathMatch: 'full' },
  { path: 'files', redirectTo: 'new', pathMatch: 'full' },
  { path: ':courseId', redirectTo: 'courses/:courseId', pathMatch: 'full' },
]

/**
 * AI review of a course, started from the course page, and of the user's own files, from My
 * Workspace. Advisory only: it reports, and changes nothing in a course or its review workflow.
 */
@NgModule({
  declarations: [
    AiReviewNewPageComponent,
    AiReviewHistoryPageComponent,
    AiReviewCoursePageComponent,
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
  providers: [
    AiReviewService,
    {
      // Who is signed in, read when needed (the profile loads after sign-in).
      provide: AIR_VIEWER,
      useFactory: () => {
        const config = inject(ConfigurationsService)
        return () => {
          const p = config.userProfile
          if (!p || !p.userId) {
            return null
          }
          const name = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || (p.userName || '').trim()
          return { id: p.userId, name }
        }
      },
    },
  ],
})
export class AiReviewModule {}
