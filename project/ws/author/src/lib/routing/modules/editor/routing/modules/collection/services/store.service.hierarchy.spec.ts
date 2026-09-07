import { BehaviorSubject, of } from 'rxjs'

import { CollectionStoreService } from './store.service'

/**
 * Covers the hierarchy-payload and delete paths the base store.service.spec.ts and
 * store.service.tree.spec.ts leave out: getTreeHierarchy / getNewTreeHierarchy,
 * getModuleRequest, getHierarchyTreeStructure, updateNewSubChild, deleteNode and
 * deleteContentNode.
 */
describe('CollectionStoreService (hierarchy + delete)', () => {
  let service: CollectionStoreService
  let contentService: any
  let editorService: any
  let resolver: any
  let authInitService: any
  let logger: any
  let router: any
  let accessService: any
  let configSvc: any

  const node = (over: any = {}): any => ({ id: 1, identifier: 'n1', children: [], ...over })

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    contentService = {
      getUpdatedMeta: jest.fn().mockReturnValue({}),
      setUpdatedMeta: jest.fn(),
      getOriginalMeta: jest.fn().mockReturnValue({}),
      setOriginalMeta: jest.fn(),
      resetOriginalMeta: jest.fn(),
      parentUpdatedMeta: jest.fn().mockReturnValue({}),
      isValid: jest.fn().mockReturnValue(true),
      originalContent: {},
      upDatedContent: {},
      parentContent: 'root',
      currentContent: 'root',
    }
    editorService = {
      readMultipleContent: jest.fn(),
      resourceToModule: jest.fn(),
      createAndReadContentV2: jest.fn(),
      createAndReadModule: jest.fn(),
      updateContentV4: jest.fn().mockReturnValue(of({})),
      readcontentV3: jest.fn(),
      resourseID: 'res1',
    }
    resolver = {
      hasAccess: jest.fn().mockReturnValue(true),
      buildTreeAndMap: jest.fn(),
      getFlatHierarchy: jest.fn().mockReturnValue([]),
    }
    authInitService = { authConfig: {}, ordinals: {} }
    logger = { log: jest.fn(), error: jest.fn() }
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() }
    accessService = { userId: 'u1', userName: 'User One', rootOrg: 'root' }
    configSvc = { userProfile: { rootOrgId: 'org1', departmentName: 'Dept' } }

    service = new CollectionStoreService(contentService, editorService, resolver, authInitService, logger, router, accessService, configSvc)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('getTreeHierarchy', () => {
    it('returns an empty tree when there is no parent data', () => {
      service.parentData = undefined as any
      expect(service.getTreeHierarchy()).toEqual({})
    })

    it('returns an empty tree when the parent has no identifier', () => {
      service.parentData = { children: [] } as any
      expect(service.getTreeHierarchy()).toEqual({})
    })

    it('marks the course root and lists its direct children', () => {
      service.parentNode = ['course1']
      service.parentData = {
        identifier: 'course1',
        category: 'Course',
        children: [{ identifier: 'mod1', primaryCategory: 'Course Unit', contentType: 'CourseUnit' }],
      } as any

      const tree = service.getTreeHierarchy()

      expect(tree.course1.root).toBe(true)
      expect(tree.course1.contentType).toBe('Course')
      expect(tree.course1.children).toEqual(['mod1'])
      expect(tree.mod1).toEqual({
        root: false,
        contentType: 'CourseUnit',
        primaryCategory: 'Course Unit',
        name: undefined,
        children: [],
      })
    })

    it('names a direct Resource child rather than typing it as a unit', () => {
      service.parentData = {
        identifier: 'course1',
        children: [{ identifier: 'res1', primaryCategory: 'Learning Resource', contentType: 'Resource', name: 'Res One' }],
      } as any

      const tree = service.getTreeHierarchy()

      expect(tree.res1.contentType).toBeUndefined()
      expect(tree.res1.name).toBe('Res One')
    })

    it('handles a parent with no children array', () => {
      service.parentData = { identifier: 'course1', category: 'Course' } as any
      expect(service.getTreeHierarchy().course1.children).toEqual([])
    })

    it('descends into a module and its grandchildren', () => {
      service.parentData = {
        identifier: 'course1',
        children: [
          {
            identifier: 'mod1',
            contentType: 'CourseUnit',
            primaryCategory: 'Course Unit',
            children: [
              {
                identifier: 'sub1',
                contentType: 'CourseUnit',
                primaryCategory: 'Course Unit',
                children: [{ identifier: 'res1', contentType: 'Resource', primaryCategory: 'Learning Resource', name: 'R' }],
              },
            ],
          },
        ],
      } as any

      const tree = service.getTreeHierarchy()

      expect(tree.mod1.children).toEqual(['sub1'])
      expect(tree.sub1.children).toEqual(['res1'])
      expect(tree.res1.name).toBe('R')
    })

    it('skips a child without a primaryCategory when mapping ids', () => {
      service.parentData = {
        identifier: 'course1',
        children: [{ identifier: 'plain', contentType: 'CourseUnit' }],
      } as any

      const tree = service.getTreeHierarchy()

      expect(tree.course1.children).toEqual(['plain'])
      expect(tree.plain).toBeUndefined()
    })
  })

  describe('getNewTreeHierarchy', () => {
    it('builds the same shape from an explicitly supplied content root', () => {
      service.parentNode = ['course1']
      const tree = service.getNewTreeHierarchy({
        identifier: 'course1',
        category: 'Course',
        children: [{ identifier: 'mod1', primaryCategory: 'Course Unit', contentType: 'CourseUnit' }],
      })

      expect(tree.course1.root).toBe(true)
      expect(tree.course1.children).toEqual(['mod1'])
      expect(tree.mod1.primaryCategory).toBe('Course Unit')
    })

    it('handles a root with no children', () => {
      const tree = service.getNewTreeHierarchy({ identifier: 'course1', category: 'Course' })
      expect(tree.course1.children).toEqual([])
    })

    it('descends two levels deep', () => {
      const tree = service.getNewTreeHierarchy({
        identifier: 'course1',
        children: [
          {
            identifier: 'mod1',
            contentType: 'CourseUnit',
            primaryCategory: 'Course Unit',
            children: [
              {
                identifier: 'sub1',
                contentType: 'CourseUnit',
                primaryCategory: 'Course Unit',
                children: [{ identifier: 'res1', contentType: 'Resource', primaryCategory: 'LR', name: 'R' }],
              },
            ],
          },
        ],
      })

      expect(tree.mod1.contentType).toBe('CourseUnit')
      expect(tree.sub1.children).toEqual(['res1'])
      expect(tree.res1.name).toBe('R')
    })
  })

  describe('getModuleRequest', () => {
    const meta = (over: any = {}) => ({
      name: 'New Module',
      description: 'desc',
      contentType: 'CourseUnit',
      primaryCategory: 'Course Unit',
      mimeType: 'application/vnd.ekstep.content-collection',
      isAssessment: false,
      ...over,
    })

    beforeEach(() => {
      service.parentNode = ['course1']
      service.parentData = { identifier: 'course1', category: 'Course', children: [] } as any
    })

    it('marks the course as an existing root node', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })

      const payload: any = service.getModuleRequest(meta())

      expect(payload.request.data.nodesModified.course1).toEqual({ isNew: false, root: true })
    })

    it('registers the new module as a new non-root node', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })

      const payload: any = service.getModuleRequest(meta())
      const created = payload.request.data.nodesModified['New Module']

      expect(created.isNew).toBe(true)
      expect(created.root).toBe(false)
      expect(created.metadata.name).toBe('New Module')
      expect(created.metadata.createdBy).toBe('u1')
      expect(created.metadata.creator).toBe('User One')
      expect(created.metadata.createdFor).toEqual(['org1'])
      expect(created.metadata.organisation).toEqual(['Dept'])
    })

    it('generates a 16-digit code for the new module', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })
      const code = (service.getModuleRequest(meta()) as any).request.data.nodesModified['New Module'].metadata.code
      expect(code).toMatch(/^\d{16}$/)
    })

    it('defaults the license and flags an html module as external', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })

      const payload: any = service.getModuleRequest(meta({ mimeType: 'application/html' }))
      const md = payload.request.data.nodesModified['New Module'].metadata

      expect(md.license).toBe('CC BY 4.0')
      expect(md.isExternal).toBe(true)
    })

    it('keeps an explicit license', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })
      const payload: any = service.getModuleRequest(meta({ license: 'MIT' }))
      expect(payload.request.data.nodesModified['New Module'].metadata.license).toBe('MIT')
    })

    it('falls back to empty org fields without a user profile', () => {
      configSvc.userProfile = undefined
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })

      const md = (service.getModuleRequest(meta()) as any).request.data.nodesModified['New Module'].metadata

      expect(md.createdFor).toEqual([''])
      expect(md.organisation).toEqual([''])
    })

    it('registers existing Course Unit children as unchanged nodes', () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'course1',
        children: [{ identifier: 'mod1', primaryCategory: 'Course Unit' }],
      })

      const nodes = (service.getModuleRequest(meta()) as any).request.data.nodesModified

      expect(nodes.mod1).toEqual({ isNew: false, root: false })
    })

    it('attaches the new module under every root in the hierarchy', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })

      const hierarchy = (service.getModuleRequest(meta()) as any).request.data.hierarchy

      expect(hierarchy['New Module']).toEqual({ root: false, contentType: 'CourseUnit', primaryCategory: 'Course Unit', children: [] })
      expect(hierarchy.course1.children).toContain('New Module')
    })

    it('lists existing top-level resources in the hierarchy', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'course1', children: [] })
      service.parentData = {
        identifier: 'course1',
        category: 'Course',
        children: [{ identifier: 'res1', contentType: 'Resource', name: 'Res One' }],
      } as any

      const hierarchy = (service.getModuleRequest(meta()) as any).request.data.hierarchy

      expect(hierarchy.res1).toEqual({ children: [], name: 'Res One', root: false })
    })
  })

  describe('getHierarchyTreeStructure', () => {
    it('builds the hierarchy from the current tree node and pushes it to the server', () => {
      service.treeStructureChange = new BehaviorSubject<any>({
        identifier: 'course1',
        parentId: undefined,
        children: [{ identifier: 'mod1', children: [{ identifier: 'res1', children: [] }] }],
      }) as any

      service.getHierarchyTreeStructure()

      const body: any = editorService.updateContentV4.mock.calls[0][0]
      expect(body.request.data.hierarchy.course1.root).toBe(true)
      expect(body.request.data.hierarchy.course1.children).toEqual(['mod1'])
      expect(body.request.data.hierarchy.mod1.root).toBe(false)
      expect(body.request.data.hierarchy.mod1.children).toEqual(['res1'])
    })

    it('skips a node that already has a parent', () => {
      service.treeStructureChange = new BehaviorSubject<any>({
        identifier: 'mod1',
        parentId: 'course1',
        children: [],
      }) as any

      service.getHierarchyTreeStructure()

      expect(editorService.updateContentV4.mock.calls[0][0].request.data.hierarchy).toEqual({})
    })

    it('resets the pending updates once the server accepts the change', () => {
      contentService.upDatedContent = { a: { name: 'A' }, b: { name: 'B' } }
      service.changedHierarchy = { x: {} } as any
      service.treeStructureChange = new BehaviorSubject<any>({ identifier: 'course1', children: [] }) as any

      service.getHierarchyTreeStructure()

      expect(contentService.resetOriginalMeta).toHaveBeenCalledTimes(2)
      expect(contentService.upDatedContent).toEqual({})
      expect(service.changedHierarchy).toEqual({})
    })
  })

  describe('updateNewSubChild', () => {
    it('marks the current content as the root of the changed hierarchy', () => {
      service.changedHierarchy = { root: { children: ['a'] } } as any
      contentService.currentContent = 'root'

      service.updateNewSubChild()

      const body: any = editorService.updateContentV4.mock.calls[0][0]
      expect(body.request.data.hierarchy.root.root).toBe(true)
    })

    it('sends an empty hierarchy when nothing changed', () => {
      service.changedHierarchy = {} as any

      service.updateNewSubChild()

      expect(editorService.updateContentV4.mock.calls[0][0].request.data.hierarchy).toEqual({})
    })

    it('clears the pending updates on success', () => {
      contentService.upDatedContent = { a: { name: 'A' } }
      service.changedHierarchy = {} as any

      service.updateNewSubChild()

      expect(contentService.resetOriginalMeta).toHaveBeenCalledWith({ name: 'A' }, 'a')
      expect(contentService.upDatedContent).toEqual({})
    })
  })

  describe('deleteNode', () => {
    beforeEach(() => {
      service.treeStructureChange = new BehaviorSubject<any>({ identifier: 'course1', children: [] }) as any
    })

    it('drops the node from every lookup map', () => {
      resolver.getFlatHierarchy.mockReturnValue([2])
      service.flatNodeMap = new Map<any, any>([[2, node({ id: 2, identifier: 'res1' })]])
      service.uniqueIdMap = new Map<any, any>([[2, 'res1']])
      service.lexIdMap = new Map<any, any>([['res1', [2]]])
      contentService.originalContent = { res1: {} }
      contentService.upDatedContent = { res1: {} }

      service.deleteNode(2)

      expect(service.flatNodeMap.has(2)).toBe(false)
      expect(service.uniqueIdMap.has(2)).toBe(false)
      expect(service.lexIdMap.has('res1')).toBe(false)
      expect(contentService.originalContent.res1).toBeUndefined()
      expect(contentService.upDatedContent.res1).toBeUndefined()
    })

    it('keeps the lex entry when the same content appears elsewhere in the tree', () => {
      resolver.getFlatHierarchy.mockReturnValue([2])
      service.flatNodeMap = new Map<any, any>([[2, node({ id: 2, identifier: 'res1' })]])
      service.uniqueIdMap = new Map<any, any>([[2, 'res1']])
      service.lexIdMap = new Map<any, any>([['res1', [2, 9]]])
      contentService.originalContent = { res1: { keep: true } }

      service.deleteNode(2)

      expect(service.lexIdMap.get('res1')).toEqual([9])
      expect(contentService.originalContent.res1).toEqual({ keep: true })
    })

    it('detaches the node from its parent and records the new child list', () => {
      resolver.getFlatHierarchy.mockReturnValue([2])
      const child = node({ id: 2, identifier: 'res1', parentId: 1 })
      const parent = node({ id: 1, identifier: 'course1', children: [child, node({ id: 3, identifier: 'res2' })] })
      service.flatNodeMap = new Map<any, any>([
        [1, parent],
        [2, child],
      ])
      service.uniqueIdMap = new Map<any, any>([[2, 'res1']])
      service.lexIdMap = new Map<any, any>([['res1', [2]]])
      service.parentNode = ['course1']

      service.deleteNode(2)

      expect(parent.children.map((c: any) => c.identifier)).toEqual(['res2'])
      expect(service.changedHierarchy.course1).toEqual({ root: true, children: ['res2'] })
    })

    it('records nested modules that still hold children', () => {
      resolver.getFlatHierarchy.mockReturnValue([2])
      const gone = node({ id: 2, identifier: 'res1', parentId: 1 })
      const mod = node({
        id: 3,
        identifier: 'mod1',
        contentType: 'CourseUnit',
        children: [node({ id: 4, identifier: 'res2' })],
      })
      const parent = node({ id: 1, identifier: 'course1', children: [gone, mod] })
      service.flatNodeMap = new Map<any, any>([
        [1, parent],
        [2, gone],
      ])
      service.uniqueIdMap = new Map<any, any>([[2, 'res1']])
      service.lexIdMap = new Map<any, any>([['res1', [2]]])
      service.parentNode = ['course1']

      service.deleteNode(2)

      expect(service.changedHierarchy.mod1).toEqual({ root: false, contentType: 'CourseUnit', children: ['res2'] })
    })

    it('backfills any root node that was not already recorded', () => {
      resolver.getFlatHierarchy.mockReturnValue([2])
      const gone = node({ id: 2, identifier: 'res1', parentId: 1 })
      const parent = node({ id: 1, identifier: 'course1', children: [gone] })
      service.flatNodeMap = new Map<any, any>([
        [1, parent],
        [2, gone],
      ])
      service.uniqueIdMap = new Map<any, any>([[2, 'res1']])
      service.lexIdMap = new Map<any, any>([['res1', [2]]])
      service.parentNode = ['course1', 'other1']
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Course',
        children: [{ identifier: 'x1' }],
      })

      service.deleteNode(2)

      expect(service.changedHierarchy.other1).toEqual({ root: true, contentType: 'Course', children: ['x1'] })
    })

    it('is a no-op on the parent bookkeeping for a root-level node', () => {
      resolver.getFlatHierarchy.mockReturnValue([1])
      service.flatNodeMap = new Map<any, any>([[1, node({ id: 1, identifier: 'course1' })]])
      service.uniqueIdMap = new Map<any, any>([[1, 'course1']])
      service.lexIdMap = new Map<any, any>([['course1', [1]]])

      expect(() => service.deleteNode(1)).not.toThrow()
      expect(service.changedHierarchy).toEqual({})
    })
  })

  describe('deleteContentNode', () => {
    it('finds a direct child by identifier and deletes it', async () => {
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => undefined)
      service.currentParentNode = 1
      service.flatNodeMap = new Map<any, any>([[1, node({ id: 1, children: [node({ id: 5, identifier: 'res1' })] })]])

      await service.deleteContentNode({ identifier: 'res1' })

      expect(spy).toHaveBeenCalledWith(5)
    })

    it('finds a grandchild inside a module', async () => {
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => undefined)
      service.currentParentNode = 1
      service.flatNodeMap = new Map<any, any>([
        [1, node({ id: 1, children: [node({ id: 5, identifier: 'mod1', children: [node({ id: 7, identifier: 'res2' })] })] })],
      ])

      await service.deleteContentNode({ identifier: 'res2' })

      expect(spy).toHaveBeenCalledWith(7)
    })

    it('does nothing when the content is not in the tree', async () => {
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => undefined)
      service.currentParentNode = 1
      service.flatNodeMap = new Map<any, any>([[1, node({ id: 1, children: [node({ id: 5, identifier: 'other' })] })]])

      await service.deleteContentNode({ identifier: 'missing' })

      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when the parent has no children', async () => {
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => undefined)
      service.currentParentNode = 1
      service.flatNodeMap = new Map<any, any>([[1, node({ id: 1, children: [] })]])

      await service.deleteContentNode({ identifier: 'res1' })

      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when the parent node is missing entirely', async () => {
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => undefined)
      service.currentParentNode = 99
      service.flatNodeMap = new Map<any, any>()

      await service.deleteContentNode({ identifier: 'res1' })

      expect(spy).not.toHaveBeenCalled()
    })
  })
})
