import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { IAiReviewRoleCheck } from '../../models/ai-review.model'
import { AirRoleCheckComponent, activityLevels, summariseRole } from './air-role-check.component'

const act = (role: string, activity: string, competency = 'Pregnancy identification', levels: number[] = []) => ({
  role,
  activity,
  description: '',
  competency,
  levels,
})
const check = (activities: ReturnType<typeof act>[], positionName = 'ANM_UP'): IAiReviewRoleCheck => ({
  role: { positionCode: positionName, positionName, totalActivities: 6, activities },
  roleNote: null,
})

describe('role check', () => {
  describe('summariseRole', () => {
    it('groups activities under their role, and names the competency only when several are judged', () => {
      const one = summariseRole(
        check([act('Antenatal', 'Detect pregnancy'), act('Antenatal', 'Ensure early registration'), act('Referral', 'Link HRP')]),
      )!
      expect(one.lead).toBe('In FRAC, 3 activities of ANM_UP need this competency. The content is judged against them:')
      expect(one.groups.map(g => [g.role, g.activities.length])).toEqual([
        ['Antenatal', 2],
        ['Referral', 1],
      ])
      expect(one.showCompetency).toBe(false)

      const two = summariseRole(check([act('R', 'A1'), act('R', 'A2', 'Antenatal care')], 'ASHA'))!
      expect(two.lead).toBe('In FRAC, 2 activities of ASHA need these competencies. The content is judged against them:')
      expect(two.showCompetency).toBe(true)
    })

    it('words a single activity in the singular', () => {
      expect(
        summariseRole(check([act('Antenatal care provider', 'Identify pregnancy at first visit', 'Eclampsia', [1, 2])], 'ANM')),
      ).toEqual({
        lead: 'In FRAC, 1 activity of ANM needs this competency. The content is judged against it:',
        groups: [
          {
            role: 'Antenatal care provider',
            activities: [{ activity: 'Identify pregnancy at first visit', competency: 'Eclampsia', levels: [1, 2] }],
          },
        ],
        showCompetency: false,
        position: 'ANM',
        count: 1,
        need: 'this competency',
      })
    })

    it('has nothing to summarise without activities', () => {
      expect(summariseRole(null)).toBeNull()
      expect(summariseRole({ role: null, roleNote: 'No position' })).toBeNull()
      expect(summariseRole(check([]))).toBeNull()
    })
  })

  it('words the levels an activity needs', () => {
    expect(activityLevels([2, 1])).toBe('Levels 1–2')
    expect(activityLevels([1, 3])).toBe('Levels 1, 3')
    expect(activityLevels([3])).toBe('Level 3')
    expect(activityLevels([])).toBe('')
  })

  describe('rendered', () => {
    let fixture: ComponentFixture<AirRoleCheckComponent>
    const text = () => (fixture.nativeElement as HTMLElement).textContent || ''
    const set = (inputs: Record<string, unknown>) => {
      Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v))
      fixture.detectChanges()
    }

    beforeEach(() => {
      TestBed.configureTestingModule({ declarations: [AirRoleCheckComponent], schemas: [NO_ERRORS_SCHEMA] })
      fixture = TestBed.createComponent(AirRoleCheckComponent)
    })

    it('shows the Plain checks for the audience typed', () => {
      set({ domainStyle: 'plain', audience: 'ANM' })
      // With FRAC hidden there is no choice of style, so the heading names none, and nothing says to pick FRAC.
      expect(text()).toContain('What the expert checks')
      expect(text()).not.toContain('(Plain)')
      expect(text()).not.toContain('choose FRAC')
      expect(text()).toContain('Right for ANM')
    })

    it('asks for a position, then shows the roles and activities, saying what each file is judged on', () => {
      set({ domainStyle: 'frac' })
      expect(text()).toContain('Pick a position in Audience above')
      // Without a position FRAC still judges level fit and coverage, and role fit against the audience.
      expect(text()).toContain('FRAC still judges the level fit and coverage, and judges role fit against your audience.')
      expect(text()).not.toContain('competency level only')
      set({
        positionName: 'ANM_UP',
        check: check([act('Antenatal', 'Detect pregnancy', 'Pregnancy identification', [1, 2])]),
        each: 'each file',
      })
      expect(text()).toContain('Detect pregnancy')
      expect(text()).toContain('needs it at Levels 1–2')
      expect(text()).toContain('does each file prepare ANM_UP')
      expect(text()).toContain('Accurate practice: are protocols, thresholds, doses and steps correct for Indian public health?')
    })

    it('shows why there are no activities', () => {
      set({ domainStyle: 'frac', positionName: 'ANM', check: { role: null, roleNote: 'The FRAC role data could not be read just now.' } })
      expect(text()).toContain('The FRAC role data could not be read just now.')
      expect(text()).toContain(
        'You can still start: FRAC then judges the level fit and coverage, and judges role fit against your audience instead of the activities.',
      )
    })

    it('says what to pick when the check cannot run yet, instead of an empty panel', () => {
      set({
        domainStyle: 'frac',
        positionName: 'ANM_UP',
        waiting: 'Pick a competency to judge the files against, or untick Domain review.',
      })
      expect(text()).toContain('Pick a competency to judge the files against')
      expect(text()).toContain('Then the activities of ANM_UP that need it are shown here.')
    })
  })
})
