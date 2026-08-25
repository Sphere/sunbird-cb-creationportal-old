import { of } from 'rxjs'

import { CollectionStoreService } from './store.service'

/**
 * Covers the validation engine the other collection store specs leave out:
 * checkValidation, checkValidations, metaValidationCheck and hierarchyStructureCheck.
 */
describe('CollectionStoreService (validation engine)', () => {
  let service: CollectionStoreService
  let contentService: any
  let editorService: any
  let resolver: any
  let authInitService: any
  let logger: any
  let router: any
  let accessService: any
  let configSvc: any

  let errorId: Set<number>
  let errorMap: Map<number, any>

  const meta = (over: any = {}) => ({
    identifier: 'do_1',
    name: 'Something',
    contentType: 'Resource',
    category: 'Resource',
    mimeType: 'text/plain',
    artifactUrl: 'a.pdf',
    ...over,
  })

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    errorId = new Set<number>()
    errorMap = new Map<number, any>()

    contentService = {
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      setUpdatedMeta: jest.fn(),
      getOriginalMeta: jest.fn().mockReturnValue({}),
      setOriginalMeta: jest.fn(),
      resetOriginalMeta: jest.fn(),
      parentUpdatedMeta: jest.fn().mockReturnValue({}),
      isValid: jest.fn().mockReturnValue(true),
      checkConditionV2: jest.fn().mockReturnValue(true),
      originalContent: {},
      upDatedContent: {},
      parentContent: 'root',
      currentContent: 'root',
    }
    editorService = {
      readMultipleContent: jest.fn(),
      readcontentV3: jest.fn().mockReturnValue(of({ status: 'Live' })),
      updateContentV4: jest.fn().mockReturnValue(of({})),
      resourseID: 'res1',
    }
    resolver = { hasAccess: jest.fn().mockReturnValue(true), buildTreeAndMap: jest.fn(), getFlatHierarchy: jest.fn().mockReturnValue([]) }
    authInitService = {
      authConfig: {},
      ordinals: {},
      collectionConfig: { maxDepth: 4, childrenConfig: {} },
    }
    logger = { log: jest.fn(), error: jest.fn() }
    router = { url: '/author/editor/do_course/collection', navigate: jest.fn() }
    accessService = { userId: 'u1', userName: 'User One' }
    configSvc = { userProfile: { rootOrgId: 'org1' } }

    service = new CollectionStoreService(contentService, editorService, resolver, authInitService, logger, router, accessService, configSvc)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('populateErrorMsg', () => {
    it('records a new error entry', () => {
      service.populateErrorMsg(1, ['bad'], meta({ name: 'Node' }) as any, errorId, errorMap)
      expect(errorId.has(1)).toBe(true)
      expect(errorMap.get(1)).toEqual({ id: 1, name: 'Node', message: ['bad'] })
    })

    it('concatenates onto an existing entry', () => {
      service.populateErrorMsg(1, ['one'], meta() as any, errorId, errorMap)
      service.populateErrorMsg(1, ['two'], meta() as any, errorId, errorMap)
      expect(errorMap.get(1).message).toEqual(['one', 'two'])
    })

    it('falls back to Untitled Content with no name', () => {
      service.populateErrorMsg(1, ['bad'], { name: '' } as any, errorId, errorMap)
      expect(errorMap.get(1).name).toBe('Untitled Content')
    })

    it('records nothing for an empty message list', () => {
      service.populateErrorMsg(1, [], meta() as any, errorId, errorMap)
      expect(errorId.size).toBe(0)
      expect(errorMap.size).toBe(0)
    })
  })

  describe('checkValidation', () => {
    const course = (over: any = {}) => ({
      identifier: 1,
      contentType: 'Course',
      children: [{ identifier: 2 }, { identifier: 3 }],
      publisherDetails: [{ id: 'p1' }],
      reviewer: [{ id: 'r1' }],
      ...over,
    })

    it('passes a course with two children and full contacts', () => {
      service.checkValidation(errorId, errorMap, course())
      expect(errorMap.size).toBe(0)
    })

    it('flags a course with fewer than two children', () => {
      service.checkValidation(errorId, errorMap, course({ children: [{ identifier: 2 }] }))
      expect(errorMap.get(1).message[0]).toContain('Minimum 2 children is required')
    })

    it('flags missing publisher details on a thin course', () => {
      service.checkValidation(errorId, errorMap, course({ children: [], publisherDetails: undefined }))
      const messages = errorMap.get(1).message
      expect(messages.some((m: string) => m.includes('Publisher details cannot be empty'))).toBe(true)
    })

    it('flags missing reviewer details on a thin course', () => {
      service.checkValidation(errorId, errorMap, course({ children: [], reviewer: undefined }))
      const messages = errorMap.get(1).message
      expect(messages.some((m: string) => m.includes('Reviewer details cannot be empty'))).toBe(true)
    })

    it('flags an empty module inside the course', () => {
      service.checkValidation(
        errorId,
        errorMap,
        course({
          children: [
            { identifier: 2, contentType: 'CourseUnit' },
            { identifier: 3, contentType: 'Resource' },
          ],
        }),
      )
      expect(errorMap.get(2).message[0]).toContain('Minimum 1 children is required')
    })

    it('accepts a module that has children', () => {
      service.checkValidation(
        errorId,
        errorMap,
        course({
          children: [
            { identifier: 2, contentType: 'CourseUnit', children: [{ identifier: 4 }] },
            { identifier: 3, contentType: 'Resource' },
          ],
        }),
      )
      expect(errorMap.has(2)).toBe(false)
    })

    it('does nothing without course data', () => {
      service.checkValidation(errorId, errorMap, null)
      expect(errorMap.size).toBe(0)
    })
  })

  describe('checkValidations', () => {
    const withChildren = (children: any[]) => ({ identifier: 1, children })

    it('flags a resource with an empty title', () => {
      service.checkValidations(errorId, errorMap, withChildren([{ identifier: 2, contentType: 'Resource', name: '', artifactUrl: 'a' }]))
      expect(errorMap.get(2).message).toContain('Title cannot be empty')
    })

    const mimeCases: Array<[string, string]> = [
      ['text/x-url', 'Link cannot be empty'],
      ['application/pdf', 'PDF cannot be empty'],
      ['audio/mpeg', 'Audio File cannot be empty'],
      ['video/mp4', 'Video File cannot be empty'],
      ['application/vnd.ekstep.html-archive', 'Zip File cannot be empty'],
      ['application/json', 'Assessment/Quiz cannot be empty'],
    ]

    it.each(mimeCases)('reports the %s specific empty-file message', (mimeType, message) => {
      service.checkValidations(errorId, errorMap, withChildren([{ identifier: 2, contentType: 'Resource', name: 'X', mimeType }]))
      expect(errorMap.get(2).message).toContain(message)
    })

    it('reports a generic message for any other mime type with a blank url', () => {
      service.checkValidations(
        errorId,
        errorMap,
        withChildren([{ identifier: 2, contentType: 'Resource', name: 'X', mimeType: 'text/plain', artifactUrl: '' }]),
      )
      expect(errorMap.get(2).message).toContain('File cannot be empty')
    })

    it('accepts a resource that has an artifact url', () => {
      service.checkValidations(
        errorId,
        errorMap,
        withChildren([{ identifier: 2, contentType: 'Resource', name: 'X', mimeType: 'application/pdf', artifactUrl: 'a.pdf' }]),
      )
      expect(errorMap.has(2)).toBe(false)
    })

    it('validates resources nested inside a module', () => {
      service.checkValidations(
        errorId,
        errorMap,
        withChildren([
          {
            identifier: 2,
            contentType: 'CourseUnit',
            children: [{ identifier: 5, contentType: 'Resource', name: '', mimeType: 'application/pdf' }],
          },
        ]),
      )
      expect(errorMap.get(5).message).toContain('Title cannot be empty')
      expect(errorMap.get(5).message).toContain('PDF cannot be empty')
    })

    it('ignores non-resource children', () => {
      service.checkValidations(errorId, errorMap, withChildren([{ identifier: 2, contentType: 'CourseUnit', name: '' }]))
      expect(errorMap.has(2)).toBe(false)
    })

    it('does nothing without course data', () => {
      service.checkValidations(errorId, errorMap, null)
      expect(errorMap.size).toBe(0)
    })
  })

  describe('metaValidationCheck', () => {
    const run = (content: any) => {
      contentService.getUpdatedMeta.mockReturnValue(content)
      service.uniqueIdMap = new Map<any, any>([[1, 'do_1']])
      service.metaValidationCheck([1], errorId, errorMap)
    }

    it('passes a fully populated resource', () => {
      run(meta())
      expect(errorMap.size).toBe(0)
    })

    it('flags an empty title', () => {
      run(meta({ name: '' }))
      expect(errorMap.get(1).message).toContain('Title cannot be empty')
    })

    it('flags a missing pdf artifact', () => {
      run(meta({ mimeType: 'application/pdf', artifactUrl: undefined }))
      expect(errorMap.get(1).message).toContain('PDF cannot be empty')
    })

    it('flags a missing link', () => {
      run(meta({ mimeType: 'text/x-url', artifactUrl: undefined }))
      expect(errorMap.get(1).message).toContain('Link cannot be empty')
    })

    it('flags missing publisher details on a root course', () => {
      run(meta({ contentType: 'Course', category: 'Course', publisherDetails: [], parent: undefined }))
      expect(errorMap.get(1).message).toContain('Publisher details cannot be empty')
    })

    it('flags missing reviewer details on a root course', () => {
      run(meta({ contentType: 'Course', category: 'Course', trackContacts: [], parent: undefined }))
      expect(errorMap.get(1).message).toContain('Reviewer details cannot be empty')
    })

    it('flags missing mandatory metadata', () => {
      contentService.isValid.mockReturnValue(false)
      run(meta())
      expect(errorMap.get(1).message).toContain('Mandatory fields are missing')
    })

    it('asks for a url or body on an html resource', () => {
      run(meta({ category: 'Resource', mimeType: 'application/html', artifactUrl: undefined, body: undefined }))
      expect(errorMap.get(1).message).toContain('Provide URL or populate "Body" field')
    })

    it('accepts an html resource that has a body', () => {
      run(meta({ category: 'Resource', mimeType: 'application/html', artifactUrl: undefined, body: '<p>hi</p>' }))
      expect(errorMap.has(1)).toBe(false)
    })

    it('asks for an upload on a pdf resource with no artifact', () => {
      run(meta({ category: 'Resource', mimeType: 'application/pdf', artifactUrl: undefined }))
      expect(errorMap.get(1).message).toContain('Upload file')
    })
  })

  describe('hierarchyStructureCheck', () => {
    const seedNode = (over: any = {}) => {
      const node: any = { id: 1, identifier: 'do_1', category: 'Course', children: [], parentId: undefined, ...over }
      service.flatNodeMap = new Map<any, any>([[1, node]])
      service.uniqueIdMap = new Map<any, any>([[1, 'do_1']])
      return node
    }

    it('flags a node that should have no children but does', () => {
      authInitService.collectionConfig.childrenConfig = {}
      seedNode({ children: [{ id: 2, identifier: 'do_2' }] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message[0]).toContain('Should not contain any child')
    })

    it('passes a leaf node with no child config', () => {
      authInitService.collectionConfig.childrenConfig = {}
      seedNode({ children: [] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.size).toBe(0)
    })

    it('flags too few children', () => {
      authInitService.collectionConfig.childrenConfig = { Course: { childTypes: [], minChildren: 2 } }
      seedNode({ children: [{ id: 2, identifier: 'do_2' }] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message[0]).toContain('Minimum 2 children is required')
    })

    it('reports "nothing" when there are no children at all', () => {
      authInitService.collectionConfig.childrenConfig = { Course: { childTypes: [], minChildren: 2 } }
      seedNode({ children: [] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message[0]).toContain('nothing present')
    })

    it('flags too many children', () => {
      authInitService.collectionConfig.childrenConfig = { Course: { childTypes: [], maxChildren: 1 } }
      seedNode({
        children: [
          { id: 2, identifier: 'do_2' },
          { id: 3, identifier: 'do_3' },
        ],
      })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message.some((m: string) => m.includes('children is allowed'))).toBe(true)
    })

    it('flags a child whose type is not allowed here', () => {
      contentService.checkConditionV2.mockReturnValue(false)
      contentService.getUpdatedMeta.mockReturnValue(meta({ name: 'Bad Child' }))
      authInitService.collectionConfig.childrenConfig = {
        Course: { childTypes: [{ conditions: { fit: [] } }] },
      }
      seedNode({ children: [{ id: 2, identifier: 'do_2' }] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message).toContain('Bad Child is not allowed to add here')
    })

    it('accepts a child whose type is allowed', () => {
      contentService.checkConditionV2.mockReturnValue(true)
      authInitService.collectionConfig.childrenConfig = {
        Course: { childTypes: [{ conditions: { fit: [] } }] },
      }
      seedNode({ children: [{ id: 2, identifier: 'do_2' }] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.size).toBe(0)
    })

    it('flags exceeding the maximum allowed depth', () => {
      authInitService.collectionConfig = { maxDepth: 1, childrenConfig: {} }
      const parent: any = { id: 9, identifier: 'do_9', category: 'Course', children: [], parentId: undefined }
      const child: any = { id: 1, identifier: 'do_1', category: 'Course', children: [], parentId: 9 }
      service.flatNodeMap = new Map<any, any>([
        [9, parent],
        [1, child],
      ])
      service.uniqueIdMap = new Map<any, any>([[1, 'do_1']])

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message[0]).toContain('Breached maximum level of depth allowed')
    })

    it('flags too many children of a given type', () => {
      contentService.checkConditionV2.mockReturnValue(true)
      authInitService.collectionConfig.childrenConfig = {
        Course: { childTypes: [{ conditions: { fit: [{ contentType: ['Resource'] }] }, maximum: 1 }] },
      }
      seedNode({
        children: [
          { id: 2, identifier: 'do_2' },
          { id: 3, identifier: 'do_3' },
        ],
      })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message.some((m: string) => m.includes('is allowed. But 2 is present'))).toBe(true)
    })

    it('flags too few children of a type while the course is still a draft', () => {
      contentService.checkConditionV2.mockReturnValue(true)
      editorService.readcontentV3.mockReturnValue(of({ status: 'Draft' }))
      authInitService.collectionConfig.childrenConfig = {
        Course: { childTypes: [{ conditions: { fit: [{ contentType: ['Resource'] }] }, minimum: 3 }] },
      }
      seedNode({ children: [{ id: 2, identifier: 'do_2' }] })

      service.hierarchyStructureCheck([1], errorId, errorMap)

      expect(errorMap.get(1).message.some((m: string) => m.includes('Minimum 3 contents of type'))).toBe(true)
    })
  })

  describe('formStringFromCondition', () => {
    it('renders a readable fit condition', () => {
      expect(service.formStringFromCondition({ fit: [{ contentType: ['Resource', 'Course'] }] })).toBe('contentType in Resource or Course')
    })

    it('joins several fit clauses with "or"', () => {
      const out = service.formStringFromCondition({ fit: [{ a: ['1'] }, { b: ['2'] }] })
      expect(out).toContain('or')
    })

    it('returns an empty string with no fit clause', () => {
      expect(service.formStringFromCondition({})).toBe('')
    })
  })
})
