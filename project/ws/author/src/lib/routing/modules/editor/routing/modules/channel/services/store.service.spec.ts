import { WIDGET_LIBRARY } from './../constants/widet'
import { ChannelStoreService } from './store.service'

describe('ChannelStoreService', () => {
  let service: ChannelStoreService
  let contentService: any
  let matDialog: any
  let resolver: any

  beforeEach(() => {
    contentService = { currentContent: 'c1' }
    matDialog = { open: jest.fn() }
    resolver = {
      renderToJSON: jest.fn(),
      renderFromJSON: jest.fn(),
    }
    service = new ChannelStoreService(contentService, matDialog, resolver)
    service.originalContent = { c1: {} } as any
  })

  it('creates the service with default Basic edit mode', () => {
    expect(service).toBeTruthy()
    expect(service.editMode).toBe('Basic')
  })

  describe('getUpdatedContent', () => {
    it('returns the root (parent-less) widget when no id given', () => {
      service.originalContent = {
        c1: {
          root: { id: 'root', parent: '', children: [] },
          child: { id: 'child', parent: 'root', children: [] },
        },
      } as any
      expect(service.getUpdatedContent().id).toBe('root')
    })

    it('merges original with updated content for the given id', () => {
      service.originalContent = { c1: { w1: { id: 'w1', parent: '', children: [], label: 'orig' } } } as any
      service.updatedContent = { c1: { w1: { id: 'w1', parent: '', children: [], label: 'upd' } } } as any
      expect((service.getUpdatedContent('w1') as any).label).toBe('upd')
    })
  })

  describe('updateContent / getUpdatedJSON', () => {
    it('adds to updatedContent and emits on the update subject', () => {
      const spy = jest.fn()
      service.update.subscribe(spy)
      service.updateContent('w1', { id: 'w1', parent: '', children: [] } as any)
      expect(service.updatedContent['c1']['w1']).toBeTruthy()
      expect(spy).toHaveBeenCalledWith('w1')
    })

    it('does not emit when push is false', () => {
      const spy = jest.fn()
      service.update.subscribe(() => spy())
      spy.mockClear()
      service.updateContent('w1', { id: 'w1', parent: '', children: [] } as any, false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('getUpdatedJSON merges original + updated', () => {
      service.originalContent = { c1: { a: { id: 'a' } } } as any
      service.updatedContent = { c1: { b: { id: 'b' } } } as any
      const json = service.getUpdatedJSON()
      expect(Object.keys(json)).toEqual(expect.arrayContaining(['a', 'b']))
    })

    it('getUpdatedJSON returns original when no updated content', () => {
      service.originalContent = { c1: { a: { id: 'a' } } } as any
      service.updatedContent = {} as any
      expect(service.getUpdatedJSON()).toEqual({ a: { id: 'a' } })
    })
  })

  describe('resetContent', () => {
    it('folds updated content into original and clears updated', () => {
      service.originalContent = { c1: { a: { id: 'a', label: 'orig' } } } as any
      service.updatedContent = { c1: { a: { id: 'a', label: 'new' } } } as any
      service.resetContent()
      expect((service.originalContent['c1']['a'] as any).label).toBe('new')
      expect(service.updatedContent['c1']).toBeUndefined()
    })
  })

  describe('isValid', () => {
    it('returns false when any widget is invalid', () => {
      service.originalContent = {
        c1: { a: { id: 'a', isValid: true }, b: { id: 'b', isValid: false } },
      } as any
      service.updatedContent = {} as any
      expect(service.isValid()).toBe(false)
    })

    it('returns true when all widgets valid', () => {
      service.originalContent = { c1: { a: { id: 'a', isValid: true } } } as any
      service.updatedContent = {} as any
      expect(service.isValid()).toBe(true)
    })
  })

  describe('addWidget', () => {
    it('merges a simple widget definition into the target node', () => {
      service.originalContent = { c1: { w1: { id: 'w1', parent: '', children: [], rowNo: 0 } } } as any
      service.addWidget('w1', 'audio')
      const stored = service.updatedContent['c1']['w1'] as any
      expect(stored.widgetSubType).toBe(WIDGET_LIBRARY.audio.widgetSubType)
    })
  })

  describe('insertNewNode', () => {
    it('appends a new node id to its parent children (non-grid)', () => {
      service.originalContent = {
        c1: { p: { id: 'p', parent: '', children: [], widgetSubType: 'x' } },
      } as any
      const data: any = { id: 'n1', parent: 'p', children: [], rowNo: 0 }
      service.insertNewNode(data)
      expect(service.updatedContent['c1']['n1']).toBeTruthy()
      expect((service.updatedContent['c1']['p'] as any).children).toContain('n1')
    })

    it('inserts at a given index', () => {
      service.originalContent = {
        c1: { p: { id: 'p', parent: '', children: ['a', 'b'], widgetSubType: 'x' } },
      } as any
      const data: any = { id: 'n1', parent: 'p', children: [], rowNo: 0 }
      service.insertNewNode(data, 1)
      expect((service.updatedContent['c1']['p'] as any).children).toEqual(['a', 'n1', 'b'])
    })
  })

  describe('deleteNode', () => {
    it('removes the node and detaches it from its parent (non-grid)', () => {
      service.originalContent = {
        c1: {
          p: { id: 'p', parent: '', children: ['w1'], widgetSubType: 'x' },
          w1: { id: 'w1', parent: 'p', children: [], rowNo: 0 },
        },
      } as any
      const spy = jest.fn()
      service.update.subscribe(spy)
      service.deleteNode('w1')
      expect(service.originalContent['c1']['w1']).toBeUndefined()
      expect((service.updatedContent['c1']['p'] as any).children).not.toContain('w1')
      expect(spy).toHaveBeenCalledWith('p')
    })
  })

  describe('swapPosition', () => {
    it('moves a string node left within a single row', () => {
      service.originalContent = {
        c1: {
          p: { id: 'p', parent: '', children: ['a', 'b'], widgetSubType: 'gridLayout' },
          a: { id: 'a', parent: 'p', children: [], rowNo: 0 },
          b: { id: 'b', parent: 'p', children: [], rowNo: 0 },
        },
      } as any
      service.swapPosition('moveLeft', 'b', 'p')
      expect((service.updatedContent['c1']['p'] as any).children).toEqual(['b', 'a'])
    })
  })
})
