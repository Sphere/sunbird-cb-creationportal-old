import { of } from 'rxjs'
import { CompetencyPopupComponent } from './competency-popup.component'

describe('CompetencyPopupComponent', () => {
  let loader: any
  let snackBar: any
  let dialogRef: any
  let editorService: any
  let router: any

  const entities = (names: string[]) => ({
    result: { entity: names.map((name, i) => ({ name, code: `C${i + 1}`, entityId: `e${i + 1}` })) },
  })

  /** Content as stored on the server. `lang` is whatever was last SAVED. */
  const build = (data: any, savedLang: string | undefined = 'en') => {
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_1', versionKey: 'v1', lang: savedLang })),
      getAllEntities: jest.fn().mockReturnValue(of(entities(['Pregnancy Identification']))),
      updateNewContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
    }
    loader = { changeLoad: { next: jest.fn() } }
    snackBar = { openFromComponent: jest.fn() }
    dialogRef = { close: jest.fn() }
    router = { url: '/author/editor/do_1/meta' }
    return new CompetencyPopupComponent(loader, snackBar, dialogRef, editorService, router, data)
  }

  describe('language used for the competency list', () => {
    it('uses the language passed from the form, not the saved one', () => {
      // The author picked Hindi but has not saved, so the server still says 'en'.
      const c = build({ selfAssessment: false, lang: 'hi' }, 'en')
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('hi')
    })

    it('falls back to the saved language when the form did not supply one', () => {
      const c = build({ selfAssessment: false, lang: '' }, 'kn')
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('kn')
    })

    it('falls back to English when neither is available', () => {
      const c = build({ selfAssessment: false }, undefined)
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('en')
    })

    it('normalises a saved display name to its ISO code', () => {
      // Content has been written with display names rather than codes.
      const c = build({ selfAssessment: false }, 'Hindi')
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('hi')
    })

    it('normalises a saved array value', () => {
      // ...and as an array, e.g. lang: ['English'].
      const c = build({ selfAssessment: false }, ['Kannada'] as any)
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('kn')
    })

    it('passes an unrecognised code through unchanged', () => {
      const c = build({ selfAssessment: false }, 'ta')
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('ta')
    })

    it('still honours the saved language for the original boolean contract', () => {
      // Older callers passed the self-assessment flag directly.
      const c = build(true, 'hi')
      c.ngOnInit()

      expect(editorService.getAllEntities).toHaveBeenCalledWith('hi')
      expect(c.disableLevel).toBe(true)
    })
  })

  describe('dialog data contract', () => {
    it('reads the self-assessment flag from the object form', () => {
      const c = build({ selfAssessment: true, lang: 'hi' })
      c.ngOnInit()

      expect(c.disableLevel).toBe(true)
      expect(c.selectedLang).toBe('hi')
    })

    it('reads the self-assessment flag from a bare boolean', () => {
      const c = build(false)
      c.ngOnInit()

      expect(c.disableLevel).toBe(false)
      expect(c.selectedLang).toBe('')
    })
  })

  describe('search', () => {
    it('matches on name or code, case-insensitively', () => {
      const c = build({ selfAssessment: false, lang: 'en' })
      c.ngOnInit()

      expect(c.search('pregnancy').length).toBe(1)
      expect(c.search('c1').length).toBe(1)
      expect(c.search('nothing').length).toBe(0)
    })

    it('returns the full list for an empty filter', () => {
      const c = build({ selfAssessment: false, lang: 'en' })
      c.ngOnInit()

      expect(c.search('').length).toBe(1)
    })
  })

  describe('displayCompetency', () => {
    it('renders "code - name" when a code exists', () => {
      const c = build({ selfAssessment: false })
      expect(c.displayCompetency({ code: 'C1', name: 'Pregnancy Identification' })).toBe('C1 - Pregnancy Identification')
    })

    it('handles a bare string and a null option', () => {
      const c = build({ selfAssessment: false })
      expect(c.displayCompetency('typed text')).toBe('typed text')
      expect(c.displayCompetency(null)).toBe('')
    })
  })
})
