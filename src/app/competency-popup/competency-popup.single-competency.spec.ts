import { of } from 'rxjs'
import { CompetencyPopupComponent } from './competency-popup.component'

/**
 * A course maps exactly one competency, at any number of proficiency levels.
 * Picking a different competency therefore replaces the saved one outright, and
 * the author is warned in the dialog before that happens.
 */
describe('CompetencyPopupComponent single competency per course', () => {
  let editorService: any
  let loader: any
  let snackBar: any
  let dialogRef: any

  const PREGNANCY = { entityId: 'e1', id: 'e1', name: 'Pregnancy Identification', code: 'C1' }
  const NEWBORN = { entityId: 'e2', id: 'e2', name: 'Newborn Care', code: 'C2' }

  /** Two levels of the same competency -- the shape in the screenshot. */
  const savedPregnancy = [
    { competencyName: 'Pregnancy Identification', competencyId: 'e1', level: '1' },
    { competencyName: 'Pregnancy Identification', competencyId: 'e1', level: '2' },
  ]

  const build = (saved: any, selfAssessment = false) => {
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(
        of({
          identifier: 'do_1',
          versionKey: 'v1',
          lang: 'en',
          competencies_v1: saved,
          competencySearch: ['e1-1', 'e1-2'],
        }),
      ),
      getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [PREGNANCY, NEWBORN] } })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
    }
    loader = { changeLoad: { next: jest.fn() } }
    snackBar = { openFromComponent: jest.fn() }
    dialogRef = { close: jest.fn() }
    const c = new CompetencyPopupComponent(
      loader,
      snackBar,
      dialogRef,
      editorService,
      {
        url: '/author/editor/do_1/meta',
      } as any,
      { selfAssessment },
    )
    c.ngOnInit()
    return c
  }

  /** The content payload the component sends on save. */
  const savedMeta = () => editorService.updateNewContentV3.mock.calls[0][0].request.content

  const pick = (c: CompetencyPopupComponent, option: any, levels: string[] = []) => {
    c.eventSelection(option)
    c.levelList.forEach(l => (l.selected = levels.includes(l.value)))
    c.hasOneChecked = c.levelList.some(l => l.selected)
  }

  describe('warning the author', () => {
    it('says nothing before a competency is picked', () => {
      expect(build(JSON.stringify(savedPregnancy)).willReplaceExisting).toBe(false)
    })

    it('says nothing when the course has no competency yet', () => {
      const c = build(undefined)
      pick(c, NEWBORN, ['1'])

      expect(c.willReplaceExisting).toBe(false)
    })

    it('says nothing when the same competency is picked again to change its levels', () => {
      const c = build(JSON.stringify(savedPregnancy))
      pick(c, PREGNANCY, ['3'])

      expect(c.willReplaceExisting).toBe(false)
    })

    it('warns when a different competency is picked', () => {
      const c = build(JSON.stringify(savedPregnancy))
      pick(c, NEWBORN, ['1'])

      expect(c.willReplaceExisting).toBe(true)
    })

    it('names the competency that is about to be replaced', () => {
      const c = build(JSON.stringify(savedPregnancy))

      expect(c.existingCompetencyName).toBe('Pregnancy Identification')
      expect(c.existingCompetencyId).toBe('e1')
    })

    it('reads the saved competency whether it arrives as JSON or as an array', () => {
      expect(build(savedPregnancy as any).existingCompetencyId).toBe('e1')
    })

    it('survives malformed saved data rather than blocking the dialog', () => {
      const c = build('{ not json')

      expect(c.existingCompetencyId).toBe('')
      expect(c.willReplaceExisting).toBe(false)
    })
  })

  describe('saving', () => {
    it('replaces the previous competency instead of keeping both', () => {
      const c = build(JSON.stringify(savedPregnancy))
      pick(c, NEWBORN, ['3'])
      c.addCompetency(NEWBORN, null, true)

      const meta = savedMeta()
      expect(meta.competencies_v1).toEqual([{ competencyName: 'Newborn Care', competencyId: 'e2', level: '3' }])
      expect(meta.competencies_v1.some((x: any) => x.competencyId === 'e1')).toBe(false)
    })

    it('rebuilds competencySearch so no stale ids survive the replacement', () => {
      const c = build(JSON.stringify(savedPregnancy))
      pick(c, NEWBORN, ['3'])
      c.addCompetency(NEWBORN, null, true)

      expect(savedMeta().competencySearch).toEqual(['e2-3'])
    })

    it('keeps every level chosen for the one competency', () => {
      const c = build(undefined)
      pick(c, PREGNANCY, ['1', '2', '4'])
      c.addCompetency(PREGNANCY, null, true)

      const meta = savedMeta()
      expect(meta.competencies_v1.map((x: any) => x.level)).toEqual(['1', '2', '4'])
      expect(new Set(meta.competencies_v1.map((x: any) => x.competencyId)).size).toBe(1)
      expect(meta.competencySearch).toEqual(['e1-1', 'e1-2', 'e1-4'])
    })

    it('narrows the levels when the same competency is re-saved with fewer', () => {
      const c = build(JSON.stringify(savedPregnancy))
      pick(c, PREGNANCY, ['2'])
      c.addCompetency(PREGNANCY, null, true)

      expect(savedMeta().competencies_v1).toEqual([{ competencyName: 'Pregnancy Identification', competencyId: 'e1', level: '2' }])
    })

    it('replaces on the self-assessment path too, where levels do not apply', () => {
      const c = build(JSON.stringify(savedPregnancy), true)
      c.eventSelection(NEWBORN)
      c.addCompetency(NEWBORN, null, true)

      const meta = savedMeta()
      expect(meta.competencies_v1).toEqual([{ competencyName: 'Newborn Care', competencyId: 'e2' }])
      expect(meta.competencySearch).toEqual([])
      expect(meta.selfAssessment).toBe(true)
    })

    it('saves nothing when the dialog is dismissed', () => {
      const c = build(JSON.stringify(savedPregnancy))
      pick(c, NEWBORN, ['1'])
      c.addCompetency(NEWBORN, null, false)

      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(false)
    })

    it('pre-ticks the levels already saved when the same competency is reopened', () => {
      const c = build(JSON.stringify(savedPregnancy))
      c.eventSelection(PREGNANCY)

      expect(c.levelList.filter(l => l.selected).map(l => l.value)).toEqual(['1', '2'])
      expect(c.levelList.filter(l => l.alreadyAdded).map(l => l.value)).toEqual(['1', '2'])
    })

    it('clears the ticks when switching to a competency with no saved levels', () => {
      const c = build(JSON.stringify(savedPregnancy))
      c.eventSelection(PREGNANCY)
      c.eventSelection(NEWBORN)

      expect(c.levelList.some(l => l.selected)).toBe(false)
      expect(c.hasOneChecked).toBe(false)
    })
  })
})
