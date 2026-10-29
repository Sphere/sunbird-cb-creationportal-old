import { NO_CONFIG_DEFAULT, configDefault, emptiedFieldValue, hasSavedValue, isBooleanConfigField } from './config-default'

describe('config-default', () => {
  const authConfig = {
    sourceName: { type: 'string', defaultValue: { Course: [{ value: 'Aastrika' }] } },
    keywords: { type: 'array', defaultValue: { Course: [{ value: ['a'] }] } },
    gatingEnabled: { type: 'boolean', defaultValue: { Course: [{ value: false }] } },
    noDefaults: { type: 'string' },
  }

  describe('configDefault', () => {
    it('returns a copy of the configured default', () => {
      const value = configDefault(authConfig, 'keywords', 'Course') as string[]
      expect(value).toEqual(['a'])
      value.push('b')
      expect(authConfig.keywords.defaultValue.Course[0].value).toEqual(['a'])
    })

    it('keeps a false boolean default', () => {
      expect(configDefault(authConfig, 'gatingEnabled', 'Course')).toBe(false)
    })

    it('reports a field missing from the config instead of throwing', () => {
      expect(configDefault(authConfig, 'cneName', 'Course')).toBe(NO_CONFIG_DEFAULT)
    })

    it('reports a field with no defaults, or none for this content type', () => {
      expect(configDefault(authConfig, 'noDefaults', 'Course')).toBe(NO_CONFIG_DEFAULT)
      expect(configDefault(authConfig, 'sourceName', 'Resource')).toBe(NO_CONFIG_DEFAULT)
      expect(configDefault(authConfig, 'sourceName', undefined)).toBe(NO_CONFIG_DEFAULT)
    })

    it('copes with no config at all', () => {
      expect(configDefault(undefined, 'sourceName', 'Course')).toBe(NO_CONFIG_DEFAULT)
      expect(configDefault(null, 'sourceName', 'Course')).toBe(NO_CONFIG_DEFAULT)
    })
  })

  it('isBooleanConfigField is false for unknown fields rather than throwing', () => {
    expect(isBooleanConfigField(authConfig, 'gatingEnabled')).toBe(true)
    expect(isBooleanConfigField(authConfig, 'sourceName')).toBe(false)
    expect(isBooleanConfigField(authConfig, 'cneName')).toBe(false)
    expect(isBooleanConfigField(undefined, 'cneName')).toBe(false)
  })

  it('hasSavedValue treats undefined, null, empty string and empty list as nothing saved', () => {
    expect([undefined, null, '', []].map(hasSavedValue)).toEqual([false, false, false, false])
    expect(['x', ['a'], 0, false, {}].map(hasSavedValue)).toEqual([true, true, true, true, true])
  })

  describe('emptiedFieldValue', () => {
    it('uses the configured default when there is one', () => {
      expect(emptiedFieldValue(authConfig, 'sourceName', 'Course', '', 'Old')).toBe('Aastrika')
    })

    it('leaves out an unconfigured field that was never saved (a fresh course)', () => {
      expect(emptiedFieldValue(authConfig, 'cneName', 'Course', '', undefined)).toBe(NO_CONFIG_DEFAULT)
      expect(emptiedFieldValue(authConfig, 'trackContactsCtrl', 'Course', null, undefined)).toBe(NO_CONFIG_DEFAULT)
    })

    it('sends the empty value when it clears an unconfigured field that was saved', () => {
      expect(emptiedFieldValue(authConfig, 'cneName', 'Course', '', 'INC-12')).toBe('')
    })
  })
})
