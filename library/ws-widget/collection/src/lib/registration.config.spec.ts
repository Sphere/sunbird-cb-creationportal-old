import { WIDGET_REGISTERED_MODULES, WIDGET_REGISTRATION_CONFIG } from './registration.config'
import { ROOT_WIDGET_CONFIG } from './collection.config'

describe('registration.config', () => {
  describe('WIDGET_REGISTERED_MODULES', () => {
    it('should be a populated array of module classes', () => {
      expect(Array.isArray(WIDGET_REGISTERED_MODULES)).toBe(true)
      expect(WIDGET_REGISTERED_MODULES.length).toBeGreaterThan(20)
    })

    it('should contain only truthy (defined) module references', () => {
      WIDGET_REGISTERED_MODULES.forEach(mod => {
        expect(mod).toBeTruthy()
        expect(typeof mod).toBe('function')
      })
    })

    it('should have no duplicate module entries', () => {
      expect(new Set(WIDGET_REGISTERED_MODULES).size).toBe(WIDGET_REGISTERED_MODULES.length)
    })
  })

  describe('WIDGET_REGISTRATION_CONFIG', () => {
    it('should be a populated array of registration entries', () => {
      expect(Array.isArray(WIDGET_REGISTRATION_CONFIG)).toBe(true)
      expect(WIDGET_REGISTRATION_CONFIG.length).toBeGreaterThan(20)
    })

    it('should have widgetType, widgetSubType and a component class for every entry', () => {
      WIDGET_REGISTRATION_CONFIG.forEach(entry => {
        expect(typeof entry.widgetType).toBe('string')
        expect(entry.widgetType.length).toBeGreaterThan(0)
        expect(typeof entry.widgetSubType).toBe('string')
        expect(entry.widgetSubType.length).toBeGreaterThan(0)
        expect(entry.component).toBeTruthy()
        expect(typeof entry.component).toBe('function')
      })
    })

    it('should reference widgetType/widgetSubType values drawn from ROOT_WIDGET_CONFIG', () => {
      const authorCard = WIDGET_REGISTRATION_CONFIG.find(
        e => e.widgetSubType === ROOT_WIDGET_CONFIG.authorCard.default && e.widgetType === ROOT_WIDGET_CONFIG.authorCard._type,
      )
      expect(authorCard).toBeDefined()

      const pdfPlayer = WIDGET_REGISTRATION_CONFIG.find(
        e => e.widgetType === ROOT_WIDGET_CONFIG.player._type && e.widgetSubType === ROOT_WIDGET_CONFIG.player.pdf,
      )
      expect(pdfPlayer).toBeDefined()
      expect(pdfPlayer!.component).toBeTruthy()

      const singleStrip = WIDGET_REGISTRATION_CONFIG.find(
        e => e.widgetType === ROOT_WIDGET_CONFIG.contentStrip._type && e.widgetSubType === ROOT_WIDGET_CONFIG.contentStrip.singleStrip,
      )
      expect(singleStrip).toBeDefined()
    })

    it('should register multiple distinct actionButton subtypes under the same widgetType', () => {
      const actionButtons = WIDGET_REGISTRATION_CONFIG.filter(e => e.widgetType === ROOT_WIDGET_CONFIG.actionButton._type)
      expect(actionButtons.length).toBeGreaterThan(1)
      const subTypes = actionButtons.map(e => e.widgetSubType)
      expect(new Set(subTypes).size).toBe(subTypes.length)
      expect(subTypes).toContain(ROOT_WIDGET_CONFIG.actionButton.apps)
    })

    it('should map each entry to a distinct component class', () => {
      const components = WIDGET_REGISTRATION_CONFIG.map(e => e.component)
      // every registered widget resolves to a unique component
      expect(new Set(components).size).toBe(components.length)
    })
  })
})
