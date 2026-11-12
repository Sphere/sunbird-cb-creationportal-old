import { AI_REVIEW_FRAC_ENABLED } from '../../utils/features'
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { AiReviewDomainStyle, IAiReviewRoleCheck } from '../../models/ai-review.model'

/** "Levels 1–2" / "Level 3" for a FRAC activity, or '' when it names none. */
/**
 * "ANM has no activity in FRAC that needs A, B and C. The content may be aimed at a different
 * position." as its parts, for a service that sends only the note; null for any other note.
 * The competencies stay one piece: a competency's own name can hold commas.
 */
export function parseNoActivity(note: string): { position: string; competencies: string[] } | null {
  const m = /^(.+?) has no activity in FRAC that needs (.+?)\. The content may be aimed at a different position\.?$/.exec(note.trim())
  if (!m) {
    return null
  }
  return { position: m[1].trim(), competencies: [m[2].trim()] }
}

export function activityLevels(levels: readonly number[]): string {
  if (!levels.length) {
    return ''
  }
  const sorted = [...levels].sort((a, b) => a - b)
  const run = sorted.every((l, i) => i === 0 || l === sorted[i - 1] + 1)
  return sorted.length === 1
    ? `Level ${sorted[0]}`
    : run
      ? `Levels ${sorted[0]}–${sorted[sorted.length - 1]}`
      : `Levels ${sorted.join(', ')}`
}

/**
 * The role check in reading order: one sentence, then the activities grouped under their
 * role. Only the activities FRAC maps to the judged competency are shown: the position's
 * other activities are not this content's job, so they are neither listed nor counted.
 * The competency is named on an activity only when several are judged.
 */
export function summariseRole(check: IAiReviewRoleCheck | null | undefined) {
  const role = check?.role
  if (!role || !role.activities.length) {
    return null
  }
  const competencies = [...new Set(role.activities.map(a => a.competency))]
  const n = role.activities.length
  const need = competencies.length > 1 ? 'these competencies' : 'this competency'
  const lead = `In FRAC, ${n === 1 ? '1 activity' : `${n} activities`} of ${role.positionName} ${n === 1 ? 'needs' : 'need'} ${need}. The content is judged against ${n === 1 ? 'it' : 'them'}:`
  const groups: { role: string; activities: { activity: string; competency: string; levels: number[] }[] }[] = []
  for (const a of role.activities) {
    let g = groups.find(x => x.role === a.role)
    if (!g) {
      g = { role: a.role, activities: [] }
      groups.push(g)
    }
    g.activities.push({ activity: a.activity, competency: a.competency, levels: a.levels })
  }
  return { lead, groups, showCompetency: competencies.length > 1, position: role.positionName, count: n, need }
}

/**
 * What the domain expert checks, shown under the Style choice. Plain: its six checks, in four lines. FRAC:
 * the chosen position's roles and activities that need the competency (read from FRAC), or
 * why there are none. Shared by the course review and the review of uploaded files.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-role-check',
  templateUrl: './air-role-check.component.html',
  styleUrls: ['./air-role-check.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirRoleCheckComponent {
  readonly domainStyle = input.required<AiReviewDomainStyle>()
  /** The FRAC position the audience names, when it is one from the list. */
  readonly positionName = input<string | null>(null)
  readonly checking = input(false)
  readonly check = input<IAiReviewRoleCheck | null>(null)
  /** Who the content is for, as typed: named in the Plain checks. */
  readonly audience = input('')
  /** "each resource" for a course, "each file" for uploaded files. */
  readonly each = input('each resource')
  /**
   * Why the check cannot run yet (a setting still to pick, e.g. the competency or level), or ''.
   * Without it the panel would show its heading with nothing under it.
   */
  readonly waiting = input('')

  readonly summary = computed(() => summariseRole(this.check()))
  /** The service's "no activity" note, split into its position and competencies; null for any other note. */
  readonly noActivity = computed(() => this.check()?.roleGap || parseNoActivity(this.check()?.roleNote || ''))
  readonly activityLevels = activityLevels
  /** Names the style in the heading only when there is a choice of style. */
  readonly fracEnabled = AI_REVIEW_FRAC_ENABLED
}
