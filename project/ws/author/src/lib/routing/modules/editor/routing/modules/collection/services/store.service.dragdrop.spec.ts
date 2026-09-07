import { of } from 'rxjs'
import { CollectionStoreService } from './store.service'

/**
 * Wave 18 — the drag-and-drop reparenting of CollectionStoreService
 * (`dragAndDrop`), plus the `getModuleRequest` payload builder and the
 * empty-artifact validation messages.
 */
describe('CollectionStoreService (drag and drop)', () => {
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

  /** A node as it lives in the flat node map. */
  const node = (over: any = {}) =>
    ({
      id: 1,
      identifier: 'do_1',
      contentType: 'CourseUnit',
      children: [],
      ...over,
    }) as any

  const build = () =>
    new CollectionStoreService(contentService, editorService, resolver, authInitService, logger, router, accessService, configSvc)

  beforeEach(() => {
    contentService = {
      parentContent: 'do_course',
      originalContent: {},
      upDatedContent: {},
      getUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'do_1' }),
      getOriginalMeta: jest.fn().mockReturnValue({ identifier: 'do_course', contentType: 'Course', children: [] }),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      parentUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'do_course' }),
    }
    editorService = {
      newCreatedLexid: 'do_new',
      resourseID: 'do_res',
      readMultipleContent: jest.fn().mockReturnValue(of([])),
      createAndReadContentV2: jest.fn().mockReturnValue(of({ identifier: 'do_new' })),
      createAndReadModule: jest.fn().mockReturnValue(of({ identifier: 'do_mod' })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      resourceToModule: jest.fn().mockReturnValue(of({ ok: true })),
    }
    resolver = {
      hasAccess: jest.fn().mockReturnValue(true),
      buildTreeAndMap: jest.fn(),
      getFlatHierarchy: jest.fn().mockReturnValue([]),
    }
    authInitService = {
      collectionConfig: { childrenConfig: { Course: {}, Collection: {} }, maxDepth: 4 },
      creationEntity: new Map<string, any>(),
    }
    logger = { error: jest.fn() }
    router = { url: '/author/editor/do_course/collection' }
    accessService = { userId: 'u1', userName: 'User One' }
    configSvc = { userProfile: { userId: 'u1' } }

    service = build()
  })

  afterEach(() => jest.clearAllMocks())

  /**
   * Seeds the flat node map with a course holding two modules; module A holds the
   * dragged resource. Returns the nodes so a test can assert on them directly.
   */
  const seedTree = () => {
    const resource = node({ id: 10, identifier: 'do_res', contentType: 'Resource', parentId: 2, children: [] })
    const moduleA = node({ id: 2, identifier: 'do_A', parentId: 1, children: [resource] })
    const moduleB = node({ id: 3, identifier: 'do_B', parentId: 1, children: [] })
    const course = node({ id: 1, identifier: 'do_course', contentType: 'Course', children: [moduleA, moduleB] })
    service.flatNodeMap = new Map<number, any>([
      [1, course],
      [2, moduleA],
      [3, moduleB],
      [10, resource],
    ])
    service.parentNode = ['do_course']
    service.changedHierarchy = {}
    return { course, moduleA, moduleB, resource }
  }

  describe('dragAndDrop', () => {
    it('moves a resource into the target module and records both parents', async () => {
      const { moduleA, moduleB, resource } = seedTree()
      await service.dragAndDrop(resource, moduleB)
      expect(moduleA.children).toEqual([])
      expect(moduleB.children).toEqual([resource])
      expect(resource.parentId).toBe(3)
      expect(service.changedHierarchy.do_A).toEqual(expect.objectContaining({ root: false, contentType: 'CourseUnit', children: [] }))
      expect(service.changedHierarchy.do_B).toEqual(
        expect.objectContaining({ root: false, contentType: 'CourseUnit', children: ['do_res'] }),
      )
    })

    it('marks the course as the root when it is the drop target', async () => {
      const { course, resource } = seedTree()
      await service.dragAndDrop(resource, course)
      expect(service.changedHierarchy.do_course.root).toBe(true)
    })

    it('inserts below the adjacent node by default', async () => {
      const { moduleB, resource } = seedTree()
      const sibling = node({ id: 20, identifier: 'do_sib', contentType: 'Resource', parentId: 3 })
      moduleB.children = [sibling]
      ;(moduleB as any).children = [sibling]
      service.flatNodeMap.set(20, sibling)
      await service.dragAndDrop(resource, { ...moduleB, children: [20] } as any, 20)
      expect(moduleB.children.map((c: any) => c.identifier)).toEqual(['do_sib', 'do_res'])
    })

    it('inserts above the adjacent node when asked to', async () => {
      const { moduleB, resource } = seedTree()
      const first = node({ id: 20, identifier: 'do_a', contentType: 'Resource', parentId: 3 })
      const second = node({ id: 21, identifier: 'do_b', contentType: 'Resource', parentId: 3 })
      moduleB.children = [first, second]
      service.flatNodeMap.set(20, first)
      service.flatNodeMap.set(21, second)
      await service.dragAndDrop(resource, { ...moduleB, children: [20, 21] } as any, 21, 'above')
      expect(moduleB.children.map((c: any) => c.identifier)).toEqual(['do_res', 'do_a', 'do_b'])
    })

    it('does not record an old parent for a node that had none', async () => {
      const { moduleB } = seedTree()
      const orphan = node({ id: 30, identifier: 'do_orphan', contentType: 'Resource', parentId: undefined })
      service.flatNodeMap.set(30, orphan)
      await service.dragAndDrop(orphan, moduleB)
      expect(service.changedHierarchy.do_orphan).toBeUndefined()
      expect(service.changedHierarchy.do_B.children).toContain('do_orphan')
    })

    it('records nested modules that were not touched directly', async () => {
      const { moduleB, resource } = seedTree()
      const nested = node({ id: 40, identifier: 'do_nested', children: [node({ id: 41, identifier: 'do_deep' })] })
      moduleB.children = [nested]
      service.flatNodeMap.set(40, nested)
      await service.dragAndDrop(resource, moduleB)
      expect(service.changedHierarchy.do_nested).toEqual(expect.objectContaining({ children: ['do_deep'] }))
    })

    it('re-parents the resource on the server when dropped into a module', async () => {
      const { moduleB, resource } = seedTree()
      moduleB.children = [node({ id: 40, identifier: 'do_other' })]
      await service.dragAndDrop(resource, moduleB)
      expect(editorService.resourceToModule).toHaveBeenCalledWith({
        request: { rootId: 'do_course', unitId: 'do_B', children: ['do_res'] },
      })
    })

    it('does not call the server when dropped back onto the course', async () => {
      const { course, moduleA, resource } = seedTree()
      course.children = [moduleA, node({ id: 50, identifier: 'do_x' })]
      await service.dragAndDrop(resource, course)
      expect(editorService.resourceToModule).not.toHaveBeenCalled()
    })

    it('fills in any root node the move did not already record', async () => {
      const { moduleB, resource } = seedTree()
      service.parentNode = ['do_course']
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        contentType: 'Course',
        children: [{ identifier: 'do_A' }, { identifier: 'do_B' }],
      })
      await service.dragAndDrop(resource, moduleB)
      expect(service.changedHierarchy.do_course).toEqual({
        root: true,
        contentType: 'Course',
        children: ['do_A', 'do_B'],
      })
    })

    it('handles a root node with no children of its own', async () => {
      const { moduleB, resource } = seedTree()
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', contentType: 'Course', children: [] })
      await service.dragAndDrop(resource, moduleB)
      expect(service.changedHierarchy.do_course.children).toEqual([])
    })

    it('announces the change by default', async () => {
      const { moduleB, resource } = seedTree()
      const next = jest.spyOn(service.treeStructureChange, 'next')
      await service.dragAndDrop(resource, moduleB)
      expect(next).toHaveBeenCalled()
    })

    it('stays quiet when asked not to announce', async () => {
      const { moduleB, resource } = seedTree()
      const next = jest.spyOn(service.treeStructureChange, 'next')
      await service.dragAndDrop(resource, moduleB, undefined, 'below', false)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
