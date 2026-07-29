import { Storage, IScromData } from './storage'

describe('SCORM Storage', () => {
  let storage: Storage

  beforeEach(() => {
    window.localStorage.clear()
    storage = new Storage()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('defaults contentKey to "scormData"', () => {
    expect(storage.contentKey).toBe('scormData')
  })

  it('allows overriding contentKey via the setter', () => {
    storage.contentKey = 'customKey'
    expect(storage.contentKey).toBe('customKey')
  })

  describe('setItem / getItem', () => {
    it('stores and retrieves a value', () => {
      storage.setItem('Initialized', true)
      expect(storage.getItem('Initialized')).toBe(true)
    })

    it('initializes an empty object in storage on first write', () => {
      const setSpy = jest.spyOn(window.localStorage.__proto__, 'setItem')
      storage.setItem('cmi.core.exit', 'suspend')
      // first call writes '{}', a later call writes the merged object
      expect(setSpy).toHaveBeenCalledWith('scormData', '{}')
      expect(storage.getItem('cmi.core.exit')).toBe('suspend')
      setSpy.mockRestore()
    })

    it('merges multiple keys into the same stored object', () => {
      storage.setItem('a', 1)
      storage.setItem('b', 2)
      expect(storage.getItem('a')).toBe(1)
      expect(storage.getItem('b')).toBe(2)
    })

    it('getItem returns null when nothing is stored', () => {
      expect(storage.getItem('missing')).toBe(null)
    })

    it('writes to the configured contentKey', () => {
      storage.contentKey = 'myScorm'
      storage.setItem('x', 'y')
      expect(window.localStorage.getItem('myScorm')).toContain('"x":"y"')
    })
  })

  describe('getAll / setAll', () => {
    it('setAll persists the whole object and getAll returns it', () => {
      const data: IScromData = {
        Initialized: true,
        'cmi.core.lesson_status': 'completed',
      }
      storage.setAll(data)
      expect(storage.getAll()).toEqual(data)
    })

    it('getAll returns null when storage is empty', () => {
      expect(storage.getAll()).toBe(null)
    })

    it('setAll ignores falsy data', () => {
      storage.setAll(null as unknown as IScromData)
      expect(window.localStorage.getItem('scormData')).toBe(null)
    })
  })

  describe('clearAll', () => {
    it('removes the stored key', () => {
      storage.setItem('a', 1)
      expect(storage.getAll()).not.toBe(null)
      storage.clearAll()
      expect(window.localStorage.getItem('scormData')).toBe(null)
      expect(storage.getAll()).toBe(null)
    })
  })
})
