import { of } from 'rxjs'
import { SCORMAdapterService } from './scormAdapter'

describe('SCORMAdapterService', () => {
  let store: any
  let handler: any
  let service: SCORMAdapterService

  const build = () => {
    const http: any = null
    return new SCORMAdapterService(store, http, handler)
  }

  beforeEach(() => {
    store = {
      key: '',
      contentKey: '',
      setItem: jest.fn(),
      getItem: jest.fn(),
      getAll: jest.fn(),
      setAll: jest.fn(),
      clearAll: jest.fn(),
    }
    handler = { handle: jest.fn(() => of({})) }
    // jsdom's window.alert is not implemented -> stub it (addDataV2 calls alert)
    ;(window as any).alert = jest.fn()
    service = build()
  })

  it('should create', () => {
    expect(service).toBeTruthy()
  })

  describe('contentId get/set', () => {
    it('sets the store key and internal id', () => {
      service.contentId = 'content-1'
      expect(store.key).toBe('content-1')
      expect(service.contentId).toBe('content-1')
      expect(service.id).toBe('content-1')
    })
  })

  describe('LMSInitialize', () => {
    it('sets the content key on the store and marks Initialized', () => {
      service.contentId = 'c9'
      const result = service.LMSInitialize()
      expect(store.contentKey).toBe('c9')
      expect(store.setItem).toHaveBeenCalledWith('Initialized', true)
      expect(result).toBe(true)
    })
  })

  describe('LMSFinish', () => {
    it('returns false and sets error when not initialized', () => {
      store.getItem.mockReturnValue(null)
      const setErrorSpy = jest.spyOn(service, '_setError')
      expect(service.LMSFinish()).toBe(false)
      expect(setErrorSpy).toHaveBeenCalledWith(301)
    })

    it('commits, clears and unsets Initialized when initialized', () => {
      store.getItem.mockImplementation((k: string) => (k === 'Initialized' ? true : null))
      store.getAll.mockReturnValue({ a: 1, errors: '[]' })
      const result = service.LMSFinish()
      expect(store.setItem).toHaveBeenCalledWith('Initialized', false)
      expect(store.clearAll).toHaveBeenCalled()
      // LMSCommit returns false
      expect(result).toBe(false)
    })
  })

  describe('LMSGetValue', () => {
    it('returns false + error when not initialized', () => {
      store.getItem.mockReturnValue(null)
      expect(service.LMSGetValue('cmi.core.exit')).toBe(false)
    })

    it('returns the stored value when present', () => {
      store.getItem.mockImplementation((k: string) => (k === 'Initialized' ? true : 'the-value'))
      expect(service.LMSGetValue('cmi.core.exit')).toBe('the-value')
    })

    it('returns empty string + error 201 when value missing', () => {
      store.getItem.mockImplementation((k: string) => (k === 'Initialized' ? true : null))
      const setErrorSpy = jest.spyOn(service, '_setError')
      expect(service.LMSGetValue('cmi.core.exit')).toBe('')
      expect(setErrorSpy).toHaveBeenCalledWith(201)
    })
  })

  describe('LMSSetValue', () => {
    it('returns false when not initialized', () => {
      store.getItem.mockReturnValue(null)
      expect(service.LMSSetValue('el', 'v')).toBe(false)
    })

    it('sets the item and returns the stored value', () => {
      store.getItem.mockImplementation((k: string) => (k === 'Initialized' ? true : 'stored'))
      expect(service.LMSSetValue('el', 'v')).toBe('stored')
      expect(store.setItem).toHaveBeenCalledWith('el', 'v')
    })
  })

  describe('LMSCommit', () => {
    it('deletes errors and calls addDataV2 when data present', () => {
      store.getAll.mockReturnValue({ 'cmi.core.lesson_status': 'completed', errors: '[]' })
      const addSpy = jest.spyOn(service, 'addDataV2')
      expect(service.LMSCommit()).toBe(false)
      expect(addSpy).toHaveBeenCalled()
      const passed = addSpy.mock.calls[0][0] as any
      expect(passed.errors).toBeUndefined()
    })

    it('returns false when no data', () => {
      store.getAll.mockReturnValue(null)
      expect(service.LMSCommit()).toBe(false)
    })
  })

  describe('LMSGetLastError', () => {
    it('pops the last error from the errors array', () => {
      store.getItem.mockReturnValue(JSON.stringify([101, 201]))
      expect(service.LMSGetLastError()).toBe(201)
    })

    it('returns empty string when no errors', () => {
      store.getItem.mockReturnValue('[]')
      expect(service.LMSGetLastError()).toBe('')
    })

    it('returns empty string when errors is null', () => {
      store.getItem.mockReturnValue(null)
      expect(service.LMSGetLastError()).toBe('')
    })
  })

  describe('LMSGetErrorString / LMSGetDiagnostic', () => {
    it('returns the error string for a known code', () => {
      expect(service.LMSGetErrorString(0)).toBe('No Error')
    })

    it('returns empty string for an unknown code', () => {
      expect(service.LMSGetErrorString(999)).toBe('')
    })

    it('returns the diagnostic for a known code', () => {
      expect(service.LMSGetDiagnostic(0)).toContain('No error occurred')
    })

    it('returns empty string diagnostic for an unknown code', () => {
      expect(service.LMSGetDiagnostic(999)).toBe('')
    })
  })

  describe('_isInitialized', () => {
    it('returns the Initialized flag from the store', () => {
      store.getItem.mockReturnValue(true)
      expect(service._isInitialized()).toBe(true)
    })
  })

  describe('_setError', () => {
    it('creates the errors array when none exists and stores it', () => {
      store.getItem.mockReturnValue(null)
      service._setError(101)
      expect(store.setItem).toHaveBeenCalledWith('errors', '[]')
    })

    it('appends to an existing errors array', () => {
      store.getItem.mockReturnValue('[101]')
      service._setError(201)
      expect(store.setItem).toHaveBeenCalledWith('errors', '[101]')
    })
  })

  describe('getStatus', () => {
    it('returns 2 for completed', () => {
      expect(service.getStatus({ 'cmi.core.lesson_status': 'completed' })).toBe(2)
    })

    it('returns 2 for passed', () => {
      expect(service.getStatus({ 'cmi.core.lesson_status': 'passed' })).toBe(2)
    })

    it('returns 1 for other statuses', () => {
      expect(service.getStatus({ 'cmi.core.lesson_status': 'incomplete' })).toBe(1)
    })

    it('returns 1 and swallows errors when input throws', () => {
      expect(service.getStatus(null)).toBe(1)
    })
  })

  describe('getPercentage', () => {
    it('returns 100 for completed', () => {
      expect(service.getPercentage({ 'cmi.core.lesson_status': 'completed' })).toBe(100)
    })

    it('returns 0 for other statuses', () => {
      expect(service.getPercentage({ 'cmi.core.lesson_status': 'incomplete' })).toBe(0)
    })

    it('returns 0 and swallows errors when input throws', () => {
      expect(service.getPercentage(null)).toBe(0)
    })
  })

  describe('addDataV2', () => {
    it('alerts and returns an empty object', () => {
      const result = service.addDataV2({ 'cmi.core.lesson_status': 'completed' } as any)
      expect(window.alert).toHaveBeenCalled()
      expect(result).toEqual({})
    })
  })

  describe('loadDataV2', () => {
    it('returns an empty object', () => {
      expect(service.loadDataV2()).toEqual({})
    })
  })

  describe('http-backed methods', () => {
    beforeEach(() => {
      ;(service as any).http = {
        get: jest.fn(() => of({ result: { data: {} } })),
        post: jest.fn(() => of({})),
      }
    })

    it('loadDataAsync calls http.get with the fetch endpoint', () => {
      service.contentId = 'cid'
      service.loadDataAsync()
      expect((service as any).http.get).toHaveBeenCalledWith(expect.stringContaining('/scrom/get/cid'))
    })

    it('downladFile requests the url as a blob', () => {
      service.downladFile('http://x/file')
      expect((service as any).http.get).toHaveBeenCalledWith('http://x/file', { responseType: 'blob' })
    })

    it('loadData fetches and stores the parsed data', () => {
      ;(service as any).http.get = jest.fn(() =>
        of({
          result: {
            data: {
              'cmi.core.exit': 'e',
              'cmi.core.lesson_status': 'completed',
              'cmi.core.session_time': '00:01',
              'cmi.suspend_data': 's',
              Initialized: true,
            },
          },
        }),
      )
      service.contentId = 'cid'
      service.loadData()
      expect(store.setAll).toHaveBeenCalled()
    })

    it('addData posts to the add endpoint', () => {
      service.contentId = 'cid'
      const result = service.addData({} as any)
      expect((service as any).http.post).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('ngOnDestroy', () => {
    it('does not throw', () => {
      expect(() => service.ngOnDestroy()).not.toThrow()
    })
  })
})
