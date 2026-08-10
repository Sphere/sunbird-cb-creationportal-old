import { AppTocDesktopModalComponent } from './app-toc-desktop-modal.component'

/**
 * The competency view is fed two things: the competencies stored on the course,
 * and an entity list fetched separately that supplies codes and level names. The
 * second is optional -- it can fail or still be in flight -- and dereferencing it
 * blindly used to throw out of ngOnInit and leave the dialog blank.
 */
describe('AppTocDesktopModalComponent competency view', () => {
  let dialogRef: any
  let router: any

  // A course in Hindi mapping one competency at two levels.
  const COMPETENCY_NAME = 'योनि परीक्षण और पार्टोग्राफ पर प्लाटिंग करना'
  const savedCompetencies = [
    { competencyName: COMPETENCY_NAME, competencyId: '102', level: '1' },
    { competencyName: COMPETENCY_NAME, competencyId: '102', level: '4' },
  ]

  const entity = {
    entityId: '102',
    code: 'C102',
    name: 'Vaginal examination and partograph plotting',
    levels: [
      { levelNumber: '1', levelName: 'Beginner' },
      { levelNumber: '4', levelName: 'Expert' },
    ],
  }

  const build = (over: any = {}) => {
    dialogRef = { close: jest.fn() }
    router = { navigate: jest.fn() }
    const data = {
      type: 'COMPETENCY',
      lang: 'hi',
      competency: { competencies_v1: JSON.stringify(savedCompetencies), competency: false },
      ...over,
    }
    return new AppTocDesktopModalComponent(dialogRef, router, data)
  }

  describe('without the entity list', () => {
    it('does not throw when proficiencyList is undefined', () => {
      const c = build({ proficiencyList: undefined })

      expect(() => c.ngOnInit()).not.toThrow()
    })

    it('still shows the competency, using the name stored on the course', () => {
      const c = build({ proficiencyList: undefined })
      c.ngOnInit()

      expect(c.addedCompetency).toHaveLength(1)
      expect(c.addedCompetency[0].name).toBe(COMPETENCY_NAME)
    })

    it('still shows the levels, from the numbers stored on the course', () => {
      const c = build({ proficiencyList: undefined })
      c.ngOnInit()

      expect(c.addedCompetency[0].levels).toEqual(['Level 1', 'Level 4'])
    })

    it('tolerates a proficiencyList that is not an array', () => {
      const c = build({ proficiencyList: {} as any })

      expect(() => c.ngOnInit()).not.toThrow()
      expect(c.addedCompetency[0].levels).toEqual(['Level 1', 'Level 4'])
    })
  })

  describe('with the entity list', () => {
    it('prefers the entity name and adds the code', () => {
      const c = build({ proficiencyList: [entity] })
      c.ngOnInit()

      expect(c.addedCompetency[0].name).toBe(entity.name)
      expect(c.addedCompetency[0].code).toBe('C102')
    })

    it('names each level', () => {
      const c = build({ proficiencyList: [entity] })
      c.ngOnInit()

      expect(c.addedCompetency[0].levels).toEqual(['Level 1 - Beginner', 'Level 4 - Expert'])
    })

    it('lists every level of the competency for a self-assessment', () => {
      const c = build({
        proficiencyList: [entity],
        competency: { competencies_v1: JSON.stringify([savedCompetencies[0]]), competency: true },
      })
      c.ngOnInit()

      expect(c.addedCompetency[0].levels).toEqual(['Level 1 - Beginner', 'Level 4 - Expert'])
    })

    it('falls back to the stored level when the entity has no matching one', () => {
      const c = build({
        proficiencyList: [{ ...entity, levels: [{ levelNumber: '9', levelName: 'Other' }] }],
      })
      c.ngOnInit()

      expect(c.addedCompetency[0].levels).toEqual(['Level 1', 'Level 4'])
    })
  })

  describe('merging', () => {
    it('collapses the levels of one competency into a single entry', () => {
      const c = build({ proficiencyList: [entity] })
      c.ngOnInit()

      expect(c.addedCompetency).toHaveLength(1)
      expect(c.addedCompetency[0].competencyId).toBe('102')
    })

    it('does not repeat a level listed twice', () => {
      const c = build({
        proficiencyList: undefined,
        competency: {
          competencies_v1: JSON.stringify([savedCompetencies[0], savedCompetencies[0]]),
          competency: false,
        },
      })
      c.ngOnInit()

      expect(c.addedCompetency[0].levels).toEqual(['Level 1'])
    })
  })

  describe('malformed or missing input', () => {
    it.each([
      ['absent', undefined],
      ['empty', ''],
      ['not JSON', '{ not json'],
    ])('renders nothing rather than throwing when competencies_v1 is %s', (_label, raw) => {
      const c = build({ proficiencyList: [entity], competency: { competencies_v1: raw } })

      expect(() => c.ngOnInit()).not.toThrow()
      expect(c.addedCompetency).toEqual([])
    })

    it('accepts competencies already parsed into an array', () => {
      const c = build({ proficiencyList: [entity], competency: { competencies_v1: savedCompetencies } })
      c.ngOnInit()

      expect(c.addedCompetency).toHaveLength(1)
    })

    it('accepts a single competency object', () => {
      const c = build({
        proficiencyList: [entity],
        competency: { competencies_v1: savedCompetencies[0] },
      })
      c.ngOnInit()

      expect(c.addedCompetency[0].competencyId).toBe('102')
    })

    it('does nothing for a non-competency dialog', () => {
      const c = build({ type: 'DETAILS', competency: undefined })
      c.ngOnInit()

      expect(c.addedCompetency).toBeUndefined()
    })
  })
})
