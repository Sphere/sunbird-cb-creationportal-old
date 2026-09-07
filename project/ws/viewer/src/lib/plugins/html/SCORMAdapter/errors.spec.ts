import { errorCodes } from './errors'

describe('SCORMAdapter errorCodes', () => {
  it('is a single-element array holding the error map', () => {
    expect(Array.isArray(errorCodes)).toBe(true)
    expect(errorCodes).toHaveLength(1)
    expect(typeof errorCodes[0]).toBe('object')
  })

  it('defines every documented SCORM 1.2 error code', () => {
    const expectedCodes = [0, 101, 201, 202, 203, 301, 401, 402, 403, 404, 405]
    const map = errorCodes[0]
    expectedCodes.forEach(code => {
      expect(map[code]).toBeDefined()
    })
    expect(Object.keys(map)).toHaveLength(expectedCodes.length)
  })

  it('gives each code a non-empty errorString and diagnostic', () => {
    const map = errorCodes[0]
    Object.keys(map).forEach(key => {
      const entry = map[Number(key)]
      expect(typeof entry.errorString).toBe('string')
      expect(entry.errorString.length).toBeGreaterThan(0)
      expect(typeof entry.diagnostic).toBe('string')
      expect(entry.diagnostic.length).toBeGreaterThan(0)
    })
  })

  it('has the expected well-known values', () => {
    const map = errorCodes[0]
    expect(map[0].errorString).toBe('No Error')
    expect(map[101].errorString).toBe('General Exception')
    expect(map[201].errorString).toBe('Invalid argument error')
    expect(map[301].errorString).toBe('Not initialized')
    expect(map[403].errorString).toBe('Element is read only')
    expect(map[405].errorString).toBe('Incorrect Data Type')
  })
})
