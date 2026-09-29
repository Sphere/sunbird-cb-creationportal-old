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

/**
 * A person's name the way it should be read — "Prince Gupta", not
 * "prince gupta" or "PRINCE GUPTA".
 *
 * Profiles are typed by hand and arrive in whatever case the person used, and
 * the report shows the value as-is, so the casing has to be settled here.
 *
 * A word is only recased when it is written ENTIRELY in one case, which is what
 * a careless entry looks like. A word that already mixes cases was spelled
 * deliberately — "McDonald", "deSouza" — and is left exactly as typed, because
 * respelling somebody's name is worse than leaving it alone. Hyphenated and
 * apostrophed parts are each treated as words, so "mary-jane o'brien" becomes
 * "Mary-Jane O'Brien".
 */
function toDisplayName(name: string): string {
  return name.replace(/[^\s\-']+/g, word => {
    const uniform = word === word.toLowerCase() || word === word.toUpperCase()
    return uniform ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
  })
}

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
      // creator is the KEY: stable, and never a display name.
      //
      // It is what the usage report groups and filters by, so it has to mean
      // the same person tomorrow as it does today. A display name does not:
      // change it in the profile and every earlier row keeps the old one, so
      // one person becomes two creators and neither shows their full usage.
      // That already happened — the report holds both "Asha Kumari" and
      // "asha.kumari" for the same person.
      //
      // Falls back to email, then to nothing. NOT to userId: a UUID cannot be
      // read or searched for, and returning null lets the service apply its own
      // default instead.
      creator: () => {
        const profile = this.configService.userProfile
        return profile ? profile.userName || profile.email || null : null
      },

      // creatorName is what a person READS in the report. Display only, so it
      // is free to change whenever someone edits their profile.
      creatorName: () => {
        const profile = this.configService.userProfile
        if (!profile) {
          return null
        }

        const full = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim()
        return full ? toDisplayName(full) : null
      },
    })
  }
}
