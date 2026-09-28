import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { AIStudioDashboardComponent } from './components/ai-studio-dashboard/ai-studio-dashboard.component'

import { AIStudioRoutingModule } from './ai-studio-routing.module'

import { MatTabsModule } from '@angular/material/tabs'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatOptionModule } from '@angular/material/core'
import { MatSelectModule } from '@angular/material/select'
import { AIStudioService } from './services/ai-studio.service'

import { configure } from '@aastrika/ai-elements'

import { ConfigurationsService } from '@ws-widget/utils'

import { ContentStudioComponent } from './components/content-studio/content-studio.component'
import { AssessmentComponent } from './components/assessment/assessment.component'
import { ReportsComponent } from './components/reports/reports.component'

/**
 * Where the Aastrika AI service lives, in the portal's own terms.
 *
 * A path rather than a URL, so the browser treats it as same-origin and sends
 * the session cookie by itself. The proxy behind it turns that cookie into a
 * token and a username, which is why nothing here handles either. Matches the
 * PROTECTED_SLAG_V8 convention AIStudioService already uses.
 */
const AI_STUDIO_API_BASE = '/apis/protected/v8/aiStudio'

@NgModule({
  declarations: [AIStudioDashboardComponent, ContentStudioComponent, AssessmentComponent, ReportsComponent],
  imports: [
    CommonModule,
    MatTabsModule,
    AIStudioRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  exports: [AIStudioDashboardComponent],
  providers: [AIStudioService],
  // The three Aastrika features are custom elements, not Angular components, so
  // the template compiler has to be told their tags are legitimate. It applies
  // to this module only; every other module still catches an unknown tag.
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AIStudioModule {
  /**
   * Points the Aastrika elements at the portal's own API path.
   *
   * Once, when this module loads, which is before any of its tabs can render —
   * an element that rendered first would have nowhere to send its requests.
   * There is no token to supply: the proxy holds the session.
   */
  constructor(private configService: ConfigurationsService) {
    configure({
      apiBase: AI_STUDIO_API_BASE,

      // Read on every request, not captured once: this module is constructed
      // before the profile has necessarily loaded, and a value taken now would
      // record every creation against whoever was signed in at startup.
      //
      // A name reads better than an id in the usage report, so the more
      // human field wins where the profile carries one. Returning null lets
      // the service fall back to its own default rather than inventing a name.
      // A person's name, not their login handle. The name is shown as-is in the
      // usage report and is how one author's work is told from another's, so it
      // has to read like a person: the existing rows say "Asha Kumari", while
      // userName gives "creatoruser_if0d", which names nobody and matches none
      // of the content already recorded.
      //
      // Falls back to email, and then to nothing. NOT to userId: that is a UUID,
      // and a UUID in the creator column is worse than no name at all — it
      // cannot be read, cannot be searched for, and would sit in the report
      // beside real names as if it were one. Returning null lets the service
      // apply its own default instead.
      creator: () => {
        const profile = this.configService.userProfile
        if (!profile) {
          return null
        }

        const full = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim()
        return full || profile.email || null
      },
    })
  }
}
