import { of } from 'rxjs'

import { EditorContentService } from './editor-content.service'

describe('EditorContentService', () => {
  let service: EditorContentService
  let accessService: any
  let editorService: any
  let authInitService: any

  beforeEach(() => {
    accessService = { hasAccess: jest.fn().mockReturnValue(true) }
    editorService = { createAndReadContent: jest.fn() }
    authInitService = { authConfig: {} }
    service = new EditorContentService(accessService, editorService, authInitService)
  })

  it('creates the service', () => {
    expect(service).toBeTruthy()
  })

  describe('listOfFiles / listOfUpdatedIPR', () => {
    it('updates and returns the list of files', () => {
      const file = new File(['a'], 'a.txt')
      service.updateListOfFiles('id1', file)
      expect(service.getListOfFiles()).toEqual({ id1: file })
    })

    it('updates and returns the list of updated IPR', () => {
      service.updateListOfUpdatedIPR('id1', true)
      expect(service.getListOfUpdatedIPR()).toEqual({ id1: true })
    })

    it('removes file and IPR entries for an id', () => {
      const file = new File(['a'], 'a.txt')
      service.updateListOfFiles('id1', file)
      service.updateListOfUpdatedIPR('id1', true)
      service.removeListOfFilesAndUpdatedIPR('id1')
      expect(service.getListOfFiles()).toEqual({})
      expect(service.getListOfUpdatedIPR()).toEqual({})
    })
  })

  describe('meta getters/setters', () => {
    it('setOriginalMeta stores a deep copy and getOriginalMeta returns it', () => {
      const meta: any = { identifier: 'm1', name: 'A' }
      service.setOriginalMeta(meta)
      const stored = service.getOriginalMeta('m1')
      expect(stored).toEqual(meta)
      expect(stored).not.toBe(meta)
    })

    it('getUpdatedMeta merges original and updated content', () => {
      service.setOriginalMeta({ identifier: 'm1', name: 'A' } as any)
      service.setUpdatedMeta({ name: 'B' } as any, 'm1', false)
      expect(service.getUpdatedMeta('m1').name).toBe('B')
    })

    it('getUpdatedMeta returns {} for an unknown id', () => {
      expect(service.getUpdatedMeta('nope')).toEqual({})
    })

    it('resetOriginalMeta merges and clears updated content', () => {
      service.setOriginalMeta({ identifier: 'm1', name: 'A' } as any)
      service.setUpdatedMeta({ name: 'B' } as any, 'm1', false)
      service.resetOriginalMeta({ description: 'D' } as any, 'm1')
      expect(service.getOriginalMeta('m1')).toMatchObject({ name: 'B', description: 'D' })
      expect((service as any).upDatedContent['m1']).toBeUndefined()
    })

    it('resetVersionKey sets the versionKey on original content', () => {
      service.setOriginalMeta({ identifier: 'm1', name: 'A' } as any)
      service.resetVersionKey(42, 'm1')
      expect(service.getOriginalMeta('m1').versionKey).toBe(42)
    })

    it('getChildData finds a nested child by identifier', () => {
      service.setOriginalMeta({
        identifier: 'root',
        children: [{ identifier: 'c1', name: 'child' }],
      } as any)
      const child = service.getChildData('c1')
      expect(child).toMatchObject({ identifier: 'c1' })
    })
  })

  describe('setUpdatedMeta emit behaviour', () => {
    it('emits onContentChange when emit is true', () => {
      const spy = jest.fn()
      service.onContentChange.subscribe(spy)
      service.setUpdatedMeta({ name: 'B' } as any, 'm1', true)
      expect(spy).toHaveBeenCalledWith('m1')
    })
  })

  describe('iap content', () => {
    it('sets and gets iap content', () => {
      service.setIapContent({ a: 1 } as any, 'q1')
      expect(service.getIapContent('q1')).toMatchObject({ a: 1 })
    })
  })

  describe('cleanProperties', () => {
    it('removes null/undefined/empty-string/empty-array props', () => {
      const result = service.cleanProperties({
        keep: 'x',
        n: null,
        u: undefined,
        e: '',
        arr: [],
        good: [1],
      })
      expect(result).toEqual({ keep: 'x', good: [1] })
    })
  })

  describe('status helpers', () => {
    it('resetStatus reflects Draft status', () => {
      service.setOriginalMeta({ identifier: 'm1', status: 'Draft' } as any)
      expect(service.resetStatus()).toBe(true)
    })

    it('changeStatusDraft sets all to Draft', () => {
      service.setOriginalMeta({ identifier: 'm1', status: 'Live' } as any)
      service.changeStatusDraft()
      expect(service.getOriginalMeta('m1').status).toBe('Draft')
    })
  })

  describe('reset', () => {
    it('clears original content and flags', () => {
      service.setOriginalMeta({ identifier: 'm1' } as any)
      service.currentContent = 'm1'
      service.isSubmitted = true
      service.reset()
      expect(service.getOriginalMeta('m1')).toBeUndefined()
      expect(service.currentContent).toBe('')
      expect(service.isSubmitted).toBe(false)
    })
  })

  describe('hasAccess', () => {
    it('delegates to accessService', () => {
      const meta: any = { identifier: 'm1' }
      expect(service.hasAccess(meta, true)).toBe(true)
      expect(accessService.hasAccess).toHaveBeenCalledWith(meta, true, undefined)
    })
  })

  describe('isLangPresent', () => {
    it('returns true when a stored content has the locale', () => {
      service.setOriginalMeta({ identifier: 'm1', locale: 'hi' } as any)
      expect(service.isLangPresent('hi')).toBe(true)
      expect(service.isLangPresent('en')).toBe(false)
    })
  })

  describe('jsonVerify', () => {
    it('returns true for valid JSON, false otherwise', () => {
      expect(service.jsonVerify('{"a":1}')).toBe(true)
      expect(service.jsonVerify('not json')).toBe(false)
    })
  })

  describe('resetOriginalMetaWithHierarchy', () => {
    it('parses JSON-encoded contact fields and recurses children', () => {
      const meta: any = {
        identifier: 'root',
        creatorContacts: JSON.stringify([{ id: 1 }]),
        reviewer: JSON.stringify([{ id: 2 }]),
        creatorDetails: 'invalid',
        publisherDetails: JSON.stringify([{ id: 3 }]),
        children: [
          {
            identifier: 'c1',
            creatorContacts: 'x',
            reviewer: 'x',
            creatorDetails: 'x',
            publisherDetails: 'x',
          },
        ],
      }
      service.resetOriginalMetaWithHierarchy(meta)
      const root = service.getOriginalMeta('root') as any
      expect(root.creatorContacts).toEqual([{ id: 1 }])
      expect(root.trackContacts).toEqual([{ id: 2 }])
      expect(root.creatorDetails).toEqual([])
      expect(service.getOriginalMeta('c1')).toBeTruthy()
    })
  })

  describe('checkConditionV2 / checkUniqueCondition', () => {
    it('returns true when no conditions given', () => {
      expect(service.checkConditionV2({ status: 'Draft' } as any)).toBe(true)
    })

    it('passes a fit condition that matches', () => {
      const content: any = { status: 'Draft' }
      expect(service.checkConditionV2(content, { fit: [{ status: ['Draft'] }] } as any)).toBe(true)
    })

    it('fails a notFit condition that matches', () => {
      const content: any = { status: 'Live' }
      expect(service.checkConditionV2(content, { notFit: [{ status: ['Live'] }] } as any)).toBe(false)
    })

    it('checkUniqueCondition returns false on error input', () => {
      expect(service.checkUniqueCondition({} as any, null as any)).toBe(false)
    })
  })

  describe('isValid', () => {
    it('returns true when config empty', () => {
      expect(service.isValid('m1')).toBe(true)
    })
  })

  describe('createInAnotherLanguage', () => {
    it('returns of(true) when the language already exists', done => {
      service.setOriginalMeta({ identifier: 'm1', locale: 'hi' } as any)
      service.createInAnotherLanguage('hi').subscribe(v => {
        expect(v).toBe(true)
        done()
      })
    })

    it('creates content when the language is new', done => {
      const created: any = { identifier: 'new1', name: 'created' }
      editorService.createAndReadContent.mockReturnValue(of(created))
      service.createInAnotherLanguage('fr').subscribe(v => {
        expect(editorService.createAndReadContent).toHaveBeenCalledTimes(1)
        const body = editorService.createAndReadContent.mock.calls[0][0]
        expect(body.locale).toBe('fr')
        expect(body.name).toBe('Untitled Content')
        expect((v as any).identifier).toBe('new1')
        expect(service.getOriginalMeta('new1')).toBeTruthy()
        done()
      })
    })
  })
})
