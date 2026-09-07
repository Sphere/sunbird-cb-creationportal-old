import { CollectionResolverService } from './resolver.service'
import { ICON_TYPE } from '@ws/author/src/lib/constants/icons'
import { MIME_TYPE } from '@ws/author/src/lib/constants/mimeType'
import { IContentNode } from '../interface/icontent-tree'

describe('CollectionResolverService', () => {
  let accessService: any
  let contentService: any
  let authInitService: any
  let service: CollectionResolverService

  beforeEach(() => {
    accessService = { hasRole: jest.fn().mockReturnValue(false) }
    contentService = { hasAccess: jest.fn().mockReturnValue(true) }
    authInitService = {
      collectionConfig: { enabledRole: ['content_reviewer', 'author', 'publisher'] },
    }
    service = new CollectionResolverService(accessService, contentService, authInitService)
  })

  it('is created', () => {
    expect(service).toBeInstanceOf(CollectionResolverService)
  })

  it('uniqueId increases on every read', () => {
    const first = service.uniqueId
    const second = service.uniqueId
    expect(second).toBeGreaterThan(first)
  })

  describe('getIcon', () => {
    it('returns the course icon for a collection course', () => {
      expect(service.getIcon({ mimeType: MIME_TYPE.collection, contentType: 'Course' } as any)).toBe(ICON_TYPE.course)
    })
    it('returns the program icon for a learning path', () => {
      expect(service.getIcon({ mimeType: MIME_TYPE.collection, contentType: 'Learning Path' } as any)).toBe(ICON_TYPE.program)
    })
    it('returns the empty-file icon for a pdf without artifact url', () => {
      expect(service.getIcon({ mimeType: MIME_TYPE.pdf } as any)).toBe(ICON_TYPE.emptyFile)
    })
    it('returns the pdf icon when an artifact url exists', () => {
      expect(service.getIcon({ mimeType: MIME_TYPE.pdf, artifactUrl: 'x' } as any)).toBe(ICON_TYPE.pdf)
    })
    it('returns the assessment icon for a quiz assessment', () => {
      expect(service.getIcon({ mimeType: MIME_TYPE.quiz, resourceType: 'Assessment' } as any)).toBe(ICON_TYPE.assessment)
    })
    it('falls back to the default icon for an unknown mime type', () => {
      expect(service.getIcon({ mimeType: 'unknown/type' } as any)).toBe(ICON_TYPE.default)
    })
  })

  describe('getCategoryType', () => {
    it('always returns an empty string', () => {
      expect(service.getCategoryType({} as any)).toBe('')
    })
  })

  describe('allowMaxDepth', () => {
    it('always allows the drop', () => {
      expect(service.allowMaxDepth({} as any, {} as any, 3)).toBe(true)
    })
  })

  describe('hasAccess', () => {
    it('checks the reviewer role for InReview content with access', () => {
      expect(service.hasAccess({ status: 'InReview' } as any)).toBe(true)
    })
    it('checks the publisher role for Reviewed content', () => {
      contentService.hasAccess.mockReturnValue(false)
      expect(service.hasAccess({ status: 'Reviewed' } as any)).toBe(true)
    })
    it('checks the author role for Draft content', () => {
      contentService.hasAccess.mockReturnValue(false)
      expect(service.hasAccess({ status: 'Draft' } as any)).toBe(true)
    })
    it('falls back to the admin role for other statuses', () => {
      contentService.hasAccess.mockReturnValue(false)
      accessService.hasRole.mockReturnValue(true)
      expect(service.hasAccess({ status: 'Processing' } as any)).toBe(true)
      expect(accessService.hasRole).toHaveBeenCalledWith(['admin'])
    })
  })

  describe('buildTreeAndMap', () => {
    it('builds a tree and populates all the lookup maps', () => {
      const content: any = {
        identifier: 'root',
        name: 'Root',
        category: 'Course',
        children: [{ identifier: 'c1', name: 'Child 1', category: 'Resource', children: [] }],
      }
      const map = new Map<string, any>()
      const flatNodeMap = new Map<number, IContentNode>()
      const uniqueIdMap = new Map<number, string>()
      const lexIdMap = new Map<string, number[]>()

      const tree = service.buildTreeAndMap(content, map, flatNodeMap, uniqueIdMap, lexIdMap)

      expect(tree.identifier).toBe('root')
      expect(tree.category).toBe('Course')
      expect(tree.children.length).toBe(1)
      expect(tree.children[0].identifier).toBe('c1')
      expect(map.get('root')).toBe(content)
      expect(flatNodeMap.size).toBe(2)
      expect(uniqueIdMap.get(tree.id)).toBe('root')
      expect(lexIdMap.get('root')).toEqual([tree.id])
    })

    it('falls back to contentType when category is missing', () => {
      const content: any = { identifier: 'r', name: 'R', contentType: 'Collection', children: [] }
      const tree = service.buildTreeAndMap(content, new Map(), new Map(), new Map(), new Map())
      expect(tree.category).toBe('Collection')
    })
  })

  describe('getFlatHierarchy', () => {
    it('returns the ids of a node and its editable descendants', () => {
      const content: any = {
        identifier: 'root',
        name: 'Root',
        category: 'Course',
        children: [
          { identifier: 'c1', name: 'C1', category: 'Resource', children: [] },
          { identifier: 'c2', name: 'C2', category: 'Resource', children: [] },
        ],
      }
      const flatNodeMap = new Map<number, IContentNode>()
      const tree = service.buildTreeAndMap(content, new Map(), flatNodeMap, new Map(), new Map())
      const flat = service.getFlatHierarchy(tree.id, flatNodeMap)
      expect(flat.length).toBe(3)
      expect(flat[0]).toBe(tree.id)
    })
  })
})
