import { of, throwError } from 'rxjs'
import { CompetencyPopupComponent } from './competency-popup.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('CompetencyPopupComponent', () => {
  let component: CompetencyPopupComponent
  let loader: any
  let snackBar: any
  let dialogRef: any
  let editorService: any
  let router: any

  const entities = [
    { entityId: 10, id: 'e10', name: 'Communication', code: 'COMM' },
    { entityId: 20, id: 'e20', name: 'Leadership' },
  ]

  const parent = (over: any = {}) => ({
    identifier: 'do_course1',
    versionKey: 'v1',
    lang: 'en',
    competencySearch: [],
    ...over,
  })

  const build = (selfAssessment: any = false) =>
    new CompetencyPopupComponent(loader, snackBar, dialogRef, editorService, router, selfAssessment)

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const sentMeta = () => editorService.updateNewContentV3.mock.calls[0][0].request.content

  beforeEach(() => {
    loader = { changeLoad: { next: jest.fn() } }
    snackBar = { openFromComponent: jest.fn() }
    dialogRef = { close: jest.fn() }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of(parent())),
      getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: entities } })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
    }
    router = { url: '/author/editor/do_course1/meta' }

    component = build()
  })

  it('should be created with five proficiency levels', () => {
    expect(component).toBeTruthy()
    expect(component.levelList.map(l => l.value)).toEqual(['1', '2', '3', '4', '5'])
    expect(component.levelList.every(l => !l.selected && !l.alreadyAdded)).toBe(true)
    expect(component.hasOneChecked).toBe(false)
    expect(component.disableLevel).toBe(false)
  })

  describe('displayCompetency', () => {
    it('shows the code alongside the name', () => {
      expect(component.displayCompetency(entities[0])).toBe('COMM - Communication')
    })

    it('shows just the name when there is no code', () => {
      expect(component.displayCompetency(entities[1])).toBe('Leadership')
    })

    it('passes a plain string through', () => {
      expect(component.displayCompetency('typed text')).toBe('typed text')
    })

    it('renders nothing for an empty option', () => {
      expect(component.displayCompetency(null)).toBe('')
      expect(component.displayCompetency({})).toBe('')
    })
  })

  describe('ngOnInit', () => {
    it('loads the parent content and its competency framework', () => {
      component.ngOnInit()

      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course1')
      expect(editorService.getAllEntities).toHaveBeenCalledWith('en')
      expect(component.proficiencyList).toEqual(entities)
      expect(component.searchComp).toEqual(entities)
    })

    it('falls back to English when the content has no language', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ lang: undefined })))

      component.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('en')
    })

    it('hides the level picker for a self-assessment', () => {
      const c = build(true)

      c.ngOnInit()

      expect(c.disableLevel).toBe(true)
    })

    it('filters the list as the user types', () => {
      component.ngOnInit()

      component.competencyCtrl.setValue('lead')

      expect(component.proficiencyList).toEqual([entities[1]])
    })

    it('ignores a selection object written into the control', () => {
      component.ngOnInit()

      component.competencyCtrl.setValue(entities[0] as any)

      expect(component.proficiencyList).toEqual(entities)
    })
  })

  describe('search', () => {
    beforeEach(() => component.ngOnInit())

    it('matches on the competency name', () => {
      expect(component.search('COMMUNI')).toEqual([entities[0]])
    })

    it('matches on the competency code', () => {
      expect(component.search('comm')).toEqual([entities[0]])
    })

    it('returns the whole list for an empty query', () => {
      expect(component.search('')).toEqual(entities)
    })

    it('returns nothing when there is no match', () => {
      expect(component.search('zzz')).toEqual([])
    })
  })

  describe('eventSelection', () => {
    it('records the picked competency and clears the levels', () => {
      component.ngOnInit()
      component.levelList[0].selected = true
      component.hasOneChecked = true

      component.eventSelection(entities[0])

      expect(component.proficiency).toBe(entities[0])
      expect(component.levelList.every(l => !l.selected)).toBe(true)
      expect(component.hasOneChecked).toBe(false)
    })

    it('ticks the levels already saved against the competency', () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          parent({
            competencies_v1: JSON.stringify([
              { competencyId: '10', level: '2' },
              { competencyId: '10', level: '4' },
              { competencyId: '20', level: '1' },
            ]),
          }),
        ),
      )
      component.ngOnInit()

      component.eventSelection(entities[0])

      expect(component.levelList.filter(l => l.selected).map(l => l.value)).toEqual(['2', '4'])
      expect(component.levelList.filter(l => l.alreadyAdded).map(l => l.value)).toEqual(['2', '4'])
      expect(component.hasOneChecked).toBe(true)
    })

    it('accepts competencies that were already parsed into an array', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ competencies_v1: [{ competencyId: 10, level: 3 }] })))
      component.ngOnInit()

      component.eventSelection(entities[0])

      expect(component.levelList.find(l => l.value === '3')!.selected).toBe(true)
    })

    it('survives malformed stored competencies', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ competencies_v1: '{not json' })))
      component.ngOnInit()

      component.eventSelection(entities[0])

      expect(component.hasOneChecked).toBe(false)
    })

    it('ignores a stored entry with no level', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ competencies_v1: [{ competencyId: 10 }] })))
      component.ngOnInit()

      component.eventSelection(entities[0])

      expect(component.hasOneChecked).toBe(false)
    })

    it('ignores a stored level outside the offered range', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ competencies_v1: [{ competencyId: 10, level: '9' }] })))
      component.ngOnInit()

      component.eventSelection(entities[0])

      expect(component.hasOneChecked).toBe(false)
    })

    it('does not pre-tick levels for a self-assessment', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ competencies_v1: [{ competencyId: 10, level: '2' }] })))
      const c = build(true)
      c.ngOnInit()

      c.eventSelection(entities[0])

      expect(c.hasOneChecked).toBe(false)
    })

    it('handles a selection with no id', () => {
      component.ngOnInit()

      component.eventSelection({ name: 'Nameless' })

      expect(component.hasOneChecked).toBe(false)
    })
  })

  describe('listSelection', () => {
    it('applies a tick and remembers that something is selected', () => {
      component.listSelection(component.levelList, 2, { checked: true })

      expect(component.levelList[2].selected).toBe(true)
      expect(component.hasOneChecked).toBe(true)
    })

    it('clears the flag once the last tick is removed', () => {
      component.listSelection(component.levelList, 2, { checked: true })

      component.listSelection(component.levelList, 2, { checked: false })

      expect(component.hasOneChecked).toBe(false)
    })
  })

  describe('addCompetency', () => {
    beforeEach(() => component.ngOnInit())

    it('closes without saving when cancelled', () => {
      component.addCompetency(entities[0], null, false)

      expect(dialogRef.close).toHaveBeenCalledWith(false)
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('saves one entry per selected level', () => {
      component.listSelection(component.levelList, 0, { checked: true })
      component.listSelection(component.levelList, 2, { checked: true })

      component.addCompetency(entities[0], null, true)

      expect(sentMeta()).toEqual({
        versionKey: 'v1',
        selfAssessment: false,
        competency: false,
        competencySearch: ['10-1', '10-3'],
        competencies_v1: [
          { competencyName: 'Communication', competencyId: '10', level: '1' },
          { competencyName: 'Communication', competencyId: '10', level: '3' },
        ],
      })
      expect(editorService.updateNewContentV3).toHaveBeenCalledWith(expect.anything(), 'do_course1')
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })

    it('saves a level-less entry for a self-assessment', () => {
      editorService.readcontentV3.mockReturnValue(of(parent()))
      const c = build(true)
      c.ngOnInit()

      c.addCompetency(entities[0], null, true)

      expect(sentMeta()).toMatchObject({
        selfAssessment: true,
        competency: true,
        competencies_v1: [{ competencyName: 'Communication', competencyId: '10' }],
      })
    })

    // A course maps one competency at any number of levels. This used to assert
    // that a second competency (20) survived alongside the one being saved (10);
    // it is now replaced outright, with the author warned in the dialog first.
    it('replaces every saved competency, not just the entries for this one', () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          parent({
            competencySearch: ['10-1', '10-5', '20-2'],
            competencies_v1: JSON.stringify([
              { competencyId: '10', level: '1' },
              { competencyId: '20', level: '2' },
            ]),
          }),
        ),
      )
      component.ngOnInit()
      component.listSelection(component.levelList, 3, { checked: true })

      component.addCompetency(entities[0], null, true)

      expect(sentMeta().competencySearch).toEqual(['10-4'])
      expect(sentMeta().competencies_v1).toEqual([{ competencyName: 'Communication', competencyId: '10', level: '4' }])
    })

    it('survives malformed stored competencies when saving', () => {
      editorService.readcontentV3.mockReturnValue(of(parent({ competencies_v1: '{not json' })))
      component.ngOnInit()

      component.addCompetency(entities[0], null, true)

      expect(sentMeta().competencies_v1).toEqual([])
    })

    it('reports a rejected save', () => {
      editorService.updateNewContentV3.mockReturnValue(of({ params: { status: 'failed' } }))

      component.addCompetency(entities[0], null, true)

      expect(dialogRef.close).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.FAIL)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('reports a failed save', () => {
      editorService.updateNewContentV3.mockReturnValue(throwError(() => new Error('boom')))

      component.addCompetency(entities[0], null, true)

      expect(lastNotify()).toBe(Notify.FAIL)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })
})
