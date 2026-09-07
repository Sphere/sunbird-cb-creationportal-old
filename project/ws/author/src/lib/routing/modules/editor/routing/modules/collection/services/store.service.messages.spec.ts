import { of } from 'rxjs'
import { CollectionStoreService } from './store.service'

/**
 * Wave 18 — the per-mime-type "cannot be empty" messages that `validationCheck`
 * raises, for both course-level resources and resources nested inside a module,
 * plus the course-level completeness rules and `populateErrorMsg` merging.
 */
describe('CollectionStoreService (validation messages)', () => {
  let contentService: any
  let editorService: any
  let resolver: any
  let authInitService: any
  let logger: any
  let router: any
  let accessService: any
  let configSvc: any
  let service: CollectionStoreService

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  /** A complete course, so only the deliberately broken bits raise messages. */
  const course = (over: any = {}) => ({
    identifier: 'do_course',
    name: 'A course',
    contentType: 'Course',
    publisherDetails: [{ id: 'p1' }],
    reviewer: [{ id: 'r1' }],
    children: [
      { identifier: 'do_a', name: 'A', contentType: 'Resource', mimeType: 'text/x-url', artifactUrl: 'https://x' },
      { identifier: 'do_b', name: 'B', contentType: 'Resource', mimeType: 'text/x-url', artifactUrl: 'https://x' },
    ],
    ...over,
  })

  /** A resource that is missing its artifact. */
  const emptyResource = (mimeType: string, identifier = 'do_res') => ({
    identifier,
    name: 'A resource',
    contentType: 'Resource',
    mimeType,
  })

  beforeEach(() => {
    contentService = {
      parentContent: 'do_course',
      originalContent: {},
      upDatedContent: {},
      getUpdatedMeta: jest.fn().mockReturnValue({}),
      getOriginalMeta: jest.fn().mockReturnValue({ identifier: 'do_course', children: [] }),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
      parentUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'do_course' }),
    }
    editorService = {
      newCreatedLexid: 'do_new',
      resourseID: 'do_new',
      readMultipleContent: jest.fn().mockReturnValue(of([])),
      createAndReadContentV2: jest.fn().mockReturnValue(of({})),
      updateContentV4: jest.fn().mockReturnValue(of({})),
      resourceToModule: jest.fn().mockReturnValue(of({})),
    }
    resolver = { hasAccess: jest.fn().mockReturnValue(true), buildTreeAndMap: jest.fn(), getFlatHierarchy: jest.fn(() => []) }
    authInitService = { collectionConfig: { childrenConfig: {}, maxDepth: 4 }, creationEntity: new Map() }
    logger = { error: jest.fn() }
    router = { url: '/author/editor/do_course/collection' }
    accessService = { userId: 'u1', userName: 'User One' }
    configSvc = { userProfile: { userId: 'u1' } }

    service = new CollectionStoreService(contentService, editorService, resolver, authInitService, logger, router, accessService, configSvc)
  })

  /** All messages raised for a course, flattened. */
  const messagesFor = (data: any): string[] => {
    const errors = service.validationCheck(1, data) || []
    return errors.reduce((all: string[], e: any) => all.concat(e.message), [])
  }

  describe('a complete course', () => {
    it('raises nothing', () => {
      expect(service.validationCheck(1, course())).toBeNull()
    })

    it('raises nothing when given no course at all', () => {
      expect(service.validationCheck(1, undefined)).toBeNull()
    })
  })

  describe('course-level completeness', () => {
    it('requires at least two resources', () => {
      expect(messagesFor(course({ children: [] }))).toContain('Minimum 2 children is required. But 0 present')
    })

    it('requires a publisher', () => {
      expect(messagesFor(course({ children: [], publisherDetails: [] }))).toContain('Publisher details cannot be empty')
    })

    it('requires a publisher even when the field is absent', () => {
      expect(messagesFor(course({ children: [], publisherDetails: undefined }))).toContain('Publisher details cannot be empty')
    })

    it('requires a reviewer', () => {
      expect(messagesFor(course({ children: [], reviewer: [] }))).toContain('Reviewer details cannot be empty')
    })

    it('requires a reviewer even when the field is absent', () => {
      expect(messagesFor(course({ children: [], reviewer: undefined }))).toContain('Reviewer details cannot be empty')
    })

    it('does not demand a publisher on a nested collection', () => {
      const nested = course({ children: [], publisherDetails: [], parent: 'do_parent' })
      expect(messagesFor(nested)).not.toContain('Publisher details cannot be empty')
    })

    it('requires a module to hold at least one resource', () => {
      const withEmptyModule = course({
        children: [
          { identifier: 'do_m1', name: 'Module', contentType: 'CourseUnit' },
          { identifier: 'do_b', name: 'B', contentType: 'Resource', mimeType: 'text/x-url', artifactUrl: 'https://x' },
        ],
      })
      expect(messagesFor(withEmptyModule)).toContain('Minimum 1 children is required. But nothing presents')
    })
  })

  describe('course-level resource messages', () => {
    const withResource = (resource: any) =>
      messagesFor(
        course({
          children: [resource, { identifier: 'do_b', name: 'B', contentType: 'Resource', mimeType: 'text/x-url', artifactUrl: 'x' }],
        }),
      )

    it('requires a title', () => {
      expect(withResource({ ...emptyResource('text/x-url'), name: '', artifactUrl: 'x' })).toContain('Title cannot be empty')
    })

    it.each([
      ['text/x-url', 'Link cannot be empty'],
      ['application/pdf', 'PDF cannot be empty'],
      ['audio/mpeg', 'Audio File cannot be empty'],
      ['video/mp4', 'Video File cannot be empty'],
      ['application/vnd.ekstep.html-archive', 'Zip File cannot be empty'],
      ['application/json', 'Assessment/Quiz cannot be empty'],
    ])('names the missing artifact of a %s resource', (mimeType, expected) => {
      expect(withResource(emptyResource(mimeType))).toContain(expected)
    })

    it('falls back to a generic message for an empty artifact of another type', () => {
      expect(withResource({ ...emptyResource('application/html'), artifactUrl: '' })).toContain('File cannot be empty')
    })

    it('says nothing about a resource that has its artifact', () => {
      expect(withResource({ ...emptyResource('application/pdf'), artifactUrl: 'https://x.pdf' })).not.toContain('PDF cannot be empty')
    })

    it('ignores a module rather than treating it as a resource', () => {
      const messages = withResource({ identifier: 'do_m1', name: 'Module', contentType: 'CourseUnit', children: [{}] })
      expect(messages).not.toContain('Link cannot be empty')
    })
  })

  describe('nested resource messages', () => {
    const withNested = (resource: any) =>
      messagesFor(
        course({
          children: [
            { identifier: 'do_m1', name: 'Module', contentType: 'CourseUnit', children: [resource] },
            { identifier: 'do_b', name: 'B', contentType: 'Resource', mimeType: 'text/x-url', artifactUrl: 'x' },
          ],
        }),
      )

    it('requires a title', () => {
      expect(withNested({ ...emptyResource('text/x-url'), name: '', artifactUrl: 'x' })).toContain('Title cannot be empty')
    })

    it.each([
      ['text/x-url', 'Link cannot be emptys'],
      ['application/pdf', 'PDF cannot be empty'],
      ['audio/mpeg', 'Audio File cannot be empty'],
      ['video/mp4', 'Video File cannot be empty'],
      ['application/vnd.ekstep.html-archive', 'Zip File cannot be empty'],
      ['application/json', 'Assessment/Quiz cannot be empty'],
    ])('names the missing artifact of a nested %s resource', (mimeType, expected) => {
      expect(withNested(emptyResource(mimeType))).toContain(expected)
    })

    it('falls back to a generic message for another nested type', () => {
      expect(withNested({ ...emptyResource('application/html'), artifactUrl: '' })).toContain('File cannot be empty')
    })

    it('says nothing about a nested resource that has its artifact', () => {
      expect(withNested({ ...emptyResource('video/mp4'), artifactUrl: 'https://x.mp4' })).not.toContain('Video File cannot be empty')
    })
  })

  describe('populateErrorMsg', () => {
    it('records the first batch of messages against the node', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, ['first'], { name: 'A course' } as any, errorId, errorMap)
      expect(errorId.has(1)).toBe(true)
      expect(errorMap.get(1)).toEqual({ id: 1, name: 'A course', message: ['first'] })
    })

    it('merges a second batch into the same node', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, ['first'], { name: 'A course' } as any, errorId, errorMap)
      service.populateErrorMsg(1, ['second'], { name: 'A course' } as any, errorId, errorMap)
      expect(errorMap.get(1).message).toEqual(['first', 'second'])
    })

    it('names an unnamed node', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, ['first'], {} as any, errorId, errorMap)
      expect(errorMap.get(1).name).toBe('Untitled Content')
    })

    it('records nothing when there is nothing to say', () => {
      const errorId = new Set<number>()
      const errorMap = new Map<number, any>()
      service.populateErrorMsg(1, [], { name: 'A course' } as any, errorId, errorMap)
      expect(errorMap.size).toBe(0)
      expect(errorId.size).toBe(0)
    })
  })
})
