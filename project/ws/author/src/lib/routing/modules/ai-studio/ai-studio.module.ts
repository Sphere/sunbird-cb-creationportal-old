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
 * /apis/protected/v8 convention every other authoring call uses.
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

/** A profile shape that may carry a name under any of the portal's field names. */
interface NameSource {
  firstName?: string
  lastName?: string
  firstname?: string
  surname?: string
  surName?: string
  givenName?: string
  userName?: string
}

/**
 * A person's full name from one profile shape, or '' if it carries none.
 *
 * Structured first+last wins, then a single givenName. userName is the LAST
 * resort on purpose: in the portal's PID mode it is a login handle, but in
 * disablePidCheck mode userProfile carries no name fields at all and userName
 * holds the token's `name` claim — the person's real full name. Ordering it
 * last means the handle is only ever used when nothing better exists, and only
 * for the display name — never for the id (see resolveCreatorId).
 */
function fullNameOf(src: NameSource | null | undefined): string {
  if (!src) {
    return ''
  }
  const first = src.firstName ?? src.firstname
  const last = src.lastName ?? src.surName ?? src.surname
  const full = [first, last].filter(Boolean).join(' ').trim()
  return full || (src.givenName ?? '').trim() || (src.userName ?? '').trim()
}

/**
 * The stable id to record content against — a userId, never a name.
 *
 * userId first, then the V2 profile's userId, then email: each a stable
 * identifier. userName is deliberately excluded — it is a login handle, and a
 * name or handle in this column is what split one person across many rows.
 */
function resolveCreatorId(cfg: ConfigurationsService): string | null {
  return cfg.userProfile?.userId || cfg.userProfileV2?.userId || cfg.userProfile?.email || cfg.userProfileV2?.email || null
}

/**
 * The person's display name, from wherever the portal stored it.
 *
 * Auth modes populate different shapes: PID mode fills userProfile/userProfileV2
 * with firstName/surName (and the raw profile lives in unMappedUser, top level
 * or under profileDetails.profileReq.personalDetails); disablePidCheck mode fills
 * only userProfile.userName with the token's name claim. Tried in order so the id
 * is never recorded without a name when one exists anywhere. Unlike the id, a
 * handle here is harmless — this column is shown, never grouped on.
 */
function resolveCreatorName(cfg: ConfigurationsService): string | null {
  const raw = (cfg.unMappedUser as { result?: { response?: unknown } } | null)?.result?.response ?? cfg.unMappedUser
  const rawAny = raw as { profileDetails?: { profileReq?: { personalDetails?: NameSource }; personalDetails?: NameSource } } | null
  const personal = rawAny?.profileDetails?.profileReq?.personalDetails ?? rawAny?.profileDetails?.personalDetails
  const full =
    fullNameOf(cfg.userProfile as NameSource | null) ||
    fullNameOf(cfg.userProfileV2 as NameSource | null) ||
    fullNameOf(personal) ||
    fullNameOf(raw as NameSource | null)
  return full ? toDisplayName(full) : null
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
      // creator is the KEY: stable, opaque, and never a display name.
      //
      // userId, the same identifier the rest of the portal uses everywhere
      // else. It is what the report groups and filters by, so it has to mean
      // the same person for as long as the rows live — and a UUID is issued
      // once and never reissued, where a name or even a handle can be edited.
      //
      // A UUID used to be the wrong choice here, and the reason it no longer is
      // matters: `creator` was once the only field, so it was both the key and
      // what a person read in the report, and an unreadable key made the report
      // unreadable. creatorName below now carries the name, so nobody ever has
      // to look at this value.
      //
      // Only ever an id, never a name. userId first; if a V1 profile somehow
      // carries none, the V2 profile's userId, then email — each a stable
      // identifier. userName is deliberately NOT in this chain: it is a login
      // handle, not the key, and putting it here is exactly how a value like
      // "aistudioadmin_wctg" (or a hand-set "AI-STUDIO ADMIN") ended up in a
      // column that is meant to hold the UUID the report groups by. null lets
      // the service apply its own default rather than record a name.
      creator: () => resolveCreatorId(this.configService),

      // The human-readable name for the report, resolved from whichever profile
      // shape this auth mode populated (see resolveCreatorName). null lets the
      // service fall back to showing the id.
      creatorName: () => resolveCreatorName(this.configService),
    })
  }
}
