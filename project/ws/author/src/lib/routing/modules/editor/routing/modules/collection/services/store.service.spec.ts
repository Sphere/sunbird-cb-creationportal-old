import { CollectionStoreService } from './store.service'

describe('CollectionStoreService', () => {
  let service: CollectionStoreService
  let contentService: any
  let editorService: any
  let resolver: any
  let authInitService: any
  let logger: any
  let router: any
  let accessService: any
  let configSvc: any

  beforeEach(() => {
    contentService = {
      getUpdatedMeta: jest.fn().mockReturnValue({}),
      setUpdatedMeta: jest.fn(),
      getOriginalMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      parentUpdatedMeta: jest.fn().mockReturnValue({}),
      isValid: jest.fn().mockReturnValue(true),
      originalContent: {},
      upDatedContent: {},
      parentContent: 'root',
    }
    editorService = {
      readMultipleContent: jest.fn(),
      resourceToModule: jest.fn(),
      createAndReadContentV2: jest.fn(),
      createAndReadModule: jest.fn(),
      updateContentV4: jest.fn(),
      readcontentV3: jest.fn(),
      resourseID: 'res1',
    }
    resolver = {
      hasAccess: jest.fn().mockReturnValue(true),
      buildTreeAndMap: jest.fn(),
      getFlatHierarchy: jest.fn(),
    }
    authInitService = {
      collectionConfig: { childrenConfig: {}, maxDepth: 5 },
      creationEntity: new Map(),
    }
    logger = { error: jest.fn() }
    router = { url: '/app/editor/x/id3' }
    accessService = { userId: 'u1', userName: 'name' }
    configSvc = { userProfile: { rootOrgId: 'org1', departmentName: 'dept' } }

    service = new CollectionStoreService(contentService, editorService, resolver, authInitService, logger, router, accessService, configSvc)
  })

  it('creates the service', () => {
    expect(service).toBeTruthy()
  })

  describe('selectedNode getter', () => {
    it('reflects the selectedNodeChange value', () => {
      expect(service.selectedNode).toBeNull()
      service.selectedNodeChange.next(7)
      expect(service.selectedNode).toBe(7)
    })
  })

  describe('uploadFileTypeValue / setUploadContentAcceptType', () => {
    it('reflects the uploadFileType value', () => {
      service.uploadFileType.next('video')
      expect(service.uploadFileTypeValue).toBe('video')
    })

    it.each([
      ['audio', 'audio/mpeg'],
      ['video', 'video/mp4'],
      ['pdf', 'application/pdf'],
      ['zip', 'application/vnd.ekstep.html-archive'],
      ['url', 'application/x-mpegURL'],
    ])('maps %s to %s', (type, expected) => {
      service.uploadFileType.next(type)
      expect(service.setUploadContentAcceptType()).toBe(expected)
    })

    it('defaults to application/pdf', () => {
      service.uploadFileType.next('unknown')
      expect(service.setUploadContentAcceptType()).toBe('application/pdf')
    })
  })

  describe('allowDrop', () => {
    it('disallows when a node is not editable', () => {
      const drag: any = { editable: false, category: 'Resource' }
      const drop: any = { editable: true, category: 'Course', level: 0 }
      expect(service.allowDrop(drag, drop)).toBe(false)
    })

    it('disallows when drop category has no children config', () => {
      const drag: any = { editable: true, category: 'Resource' }
      const drop: any = { editable: true, category: 'Course', level: 0 }
      expect(service.allowDrop(drag, drop)).toBe(false)
    })

    it('allows a valid drop within depth limits', () => {
      authInitService.collectionConfig.childrenConfig = { Course: {} }
      const drag: any = { editable: true, category: 'Resource' }
      const drop: any = { editable: true, category: 'Course', level: 0 }
      expect(service.allowDrop(drag, drop)).toBe(true)
    })

    it('disallows when it breaches max depth', () => {
      authInitService.collectionConfig.childrenConfig = { Course: {} }
      authInitService.collectionConfig.maxDepth = 1
      const drag: any = { editable: true, category: 'Resource' }
      const drop: any = { editable: true, category: 'Course', level: 0 }
      expect(service.allowDrop(drag, drop)).toBe(false)
    })
  })

  describe('formStringFromCondition', () => {
    it('builds a readable string from a fit condition', () => {
      const out = service.formStringFromCondition({ fit: [{ status: ['Draft', 'Live'] }] })
      expect(out).toContain('status in Draft or Live')
    })

    it('returns empty string when no fit', () => {
      expect(service.formStringFromCondition({})).toBe('')
    })
  })

  describe('populateErrorMsg', () => {
    it('adds a new error entry', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, ['bad'], { name: 'Node' } as any, errorId, errorMap)
      expect(errorId.has(1)).toBe(true)
      expect(errorMap.get(1)).toMatchObject({ id: 1, name: 'Node', message: ['bad'] })
    })

    it('concatenates messages for an existing entry', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, ['a'], { name: 'N' } as any, errorId, errorMap)
      service.populateErrorMsg(1, ['b'], { name: 'N' } as any, errorId, errorMap)
      expect(errorMap.get(1).message).toEqual(['a', 'b'])
    })

    it('does nothing for an empty message list', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, [], { name: 'N' } as any, errorId, errorMap)
      expect(errorId.size).toBe(0)
    })
  })

  describe('cascadeDown', () => {
    it('returns false when there are no dependants', () => {
      resolver.getFlatHierarchy.mockReturnValue([1])
      expect(service.cascadeDown(1, 'v', 'competencies')).toBe(false)
    })

    it('propagates the value to dependant nodes', () => {
      resolver.getFlatHierarchy.mockReturnValue([1, 2])
      service.uniqueIdMap.set(2, 'lex2')
      const result = service.cascadeDown(1, 'v', 'competencies')
      expect(result).toBe(true)
      expect(contentService.setUpdatedMeta).toHaveBeenCalledTimes(1)
    })
  })

  describe('getNewTreeHierarchys', () => {
    it('builds a nested hierarchy tree', () => {
      const content = {
        identifier: 'root',
        contentType: 'Course',
        children: [{ identifier: 'c1', contentType: 'Resource', name: 'n', children: [] }],
      }
      const tree = service.getNewTreeHierarchys(content)
      expect(Object.keys(tree)).toEqual(expect.arrayContaining(['root', 'c1']))
      expect(tree['c1'].name).toBe('n')
    })
  })

  describe('deleteNode', () => {
    it('removes the node from maps and records changed hierarchy', () => {
      service.flatNodeMap.set(1, { id: 1, identifier: 'lex1', parentId: 2, children: [] } as any)
      service.flatNodeMap.set(2, {
        id: 2,
        identifier: 'lex2',
        children: [{ id: 1, identifier: 'lex1' }],
      } as any)
      service.uniqueIdMap.set(1, 'lex1')
      service.lexIdMap.set('lex1', [1])
      contentService.originalContent = { lex1: {} }
      contentService.upDatedContent = { lex1: {} }
      resolver.getFlatHierarchy.mockReturnValue([1])

      service.deleteNode(1)

      expect(service.flatNodeMap.has(1)).toBe(false)
      expect(service.changedHierarchy['lex2']).toBeTruthy()
      expect(contentService.originalContent['lex1']).toBeUndefined()
    })
  })

  describe('validationCheck', () => {
    it('returns errors for a course with fewer than 2 children', () => {
      const courseData = {
        identifier: 5,
        contentType: 'Course',
        parent: undefined,
        children: [],
        publisherDetails: [],
        reviewer: [],
      }
      const result = service.validationCheck(5, courseData)
      expect(Array.isArray(result)).toBe(true)
      expect((result as any[]).length).toBeGreaterThan(0)
    })

    it('returns null for valid course data', () => {
      const courseData = {
        identifier: 6,
        contentType: 'Course',
        parent: undefined,
        children: [
          { identifier: 'a', contentType: 'CourseUnit', children: [{ identifier: 'x' }] },
          { identifier: 'b', contentType: 'CourseUnit', children: [{ identifier: 'y' }] },
        ],
        publisherDetails: [{ id: 1 }],
        reviewer: [{ id: 2 }],
      }
      const result = service.validationCheck(6, courseData)
      expect(result).toBeNull()
    })
  })

  describe('checkValidations', () => {
    it('flags a resource with an empty artifactUrl', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      const courseData = {
        children: [{ identifier: 10, contentType: 'Resource', name: 'r', mimeType: 'application/pdf', artifactUrl: '' }],
      }
      service.checkValidations(errorId, errorMap, courseData)
      expect(errorMap.get(10).message).toContain('PDF cannot be empty')
    })
  })
})
