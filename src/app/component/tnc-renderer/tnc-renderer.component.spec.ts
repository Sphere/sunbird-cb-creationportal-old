import { TncRendererComponent } from './tnc-renderer.component'
import { NsTnc } from '../../models/tnc.model'

describe('TncRendererComponent', () => {
  const makeUnit = (name: 'Generic T&C' | 'Data Privacy', isAccepted = false): NsTnc.ITncUnit => ({
    acceptedDate: new Date(),
    acceptedLanguage: 'en',
    acceptedVersion: '1.0',
    availableLanguages: ['en'],
    content: 'content',
    isAccepted,
    language: 'en',
    name,
    version: '1.0',
  })

  const makeConfigSvc = (restrictedFeatures?: Set<string>): any => ({
    restrictedFeatures,
  })

  it('should default termsOfUser to true when no restrictedFeatures', () => {
    const comp = new TncRendererComponent(makeConfigSvc(undefined))
    expect(comp.termsOfUser).toBe(true)
    expect(comp.currentPanel).toBe('tnc')
  })

  it('should keep termsOfUser true when restrictedFeatures lacks termsOfUser', () => {
    const comp = new TncRendererComponent(makeConfigSvc(new Set(['other'])))
    expect(comp.termsOfUser).toBe(true)
  })

  it('should set termsOfUser false when restrictedFeatures has termsOfUser', () => {
    const comp = new TncRendererComponent(makeConfigSvc(new Set(['termsOfUser'])))
    expect(comp.termsOfUser).toBe(false)
  })

  describe('ngOnInit', () => {
    it('should do nothing when tncData is null', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      comp.tncData = null
      comp.ngOnInit()
      expect(comp.generalTnc).toBeNull()
      expect(comp.dpTnc).toBeNull()
      expect(comp.currentPanel).toBe('tnc')
    })

    it('should assign general and dp tnc units', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      comp.tncData = {
        isAccepted: false,
        termsAndConditions: [makeUnit('Generic T&C'), makeUnit('Data Privacy')],
      }
      comp.ngOnInit()
      expect(comp.generalTnc && comp.generalTnc.name).toBe('Generic T&C')
      expect(comp.dpTnc && comp.dpTnc.name).toBe('Data Privacy')
    })

    it('should switch to dp panel then tnc panel per acceptance flags', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      // general accepted, dp not accepted -> stays on dp
      comp.tncData = {
        isAccepted: false,
        termsAndConditions: [makeUnit('Generic T&C', true), makeUnit('Data Privacy', false)],
      }
      comp.ngOnInit()
      expect(comp.currentPanel).toBe('dp')
    })

    it('should end on tnc panel when general is not accepted', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      comp.tncData = {
        isAccepted: false,
        termsAndConditions: [makeUnit('Generic T&C', false), makeUnit('Data Privacy', false)],
      }
      comp.ngOnInit()
      expect(comp.currentPanel).toBe('tnc')
    })
  })

  describe('ngOnChanges', () => {
    it('should reassign general and dp on changes', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      comp.tncData = {
        isAccepted: true,
        termsAndConditions: [makeUnit('Data Privacy')],
      }
      comp.ngOnChanges()
      expect(comp.dpTnc && comp.dpTnc.name).toBe('Data Privacy')
      expect(comp.generalTnc).toBeNull()
    })

    it('should do nothing when tncData is null', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      comp.tncData = null
      comp.ngOnChanges()
      expect(comp.generalTnc).toBeNull()
    })
  })

  describe('reCenterPanel', () => {
    it('should scroll into view when element exists', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      const scrollIntoView = jest.fn()
      jest.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as any)
      comp.reCenterPanel()
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      })
    })

    it('should not throw when element is missing', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      jest.spyOn(document, 'getElementById').mockReturnValue(null)
      expect(() => comp.reCenterPanel()).not.toThrow()
    })
  })

  describe('language change emitters', () => {
    it('should emit tncChange with locale', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      const spy = jest.spyOn(comp.tncChange, 'emit')
      comp.changeTncLang('hi')
      expect(spy).toHaveBeenCalledWith('hi')
    })

    it('should emit dpChange with locale', () => {
      const comp = new TncRendererComponent(makeConfigSvc())
      const spy = jest.spyOn(comp.dpChange, 'emit')
      comp.changeDpLang('en')
      expect(spy).toHaveBeenCalledWith('en')
    })
  })
})
