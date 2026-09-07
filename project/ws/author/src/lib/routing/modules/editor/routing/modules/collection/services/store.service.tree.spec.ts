import { of, throwError } from 'rxjs'
import { CollectionStoreService } from './store.service'

/**
 * Covers the content-creation and tree-hierarchy side of CollectionStoreService —
 * addChildOrSibling, createChildOrSibling, getTreeHierarchy and deleteContentNode.
 * The sibling store.service.spec.ts covers allowDrop, cascadeDown and validation.
 */
describe('CollectionStoreService (create + hierarchy)', () => {
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

  const treeNode = (over: any = {}) =>
    ({
      id: 2,
      identifier: 'do_2',
      level: 1,
      category: 'Resource',
      editable: true,
      expandable: false,
      children: [],
      parentId: 1,
      ...over,
    }) as any

  const build = () =>
    new CollectionStoreService(contentService, editorService, resolver, authInitService, logger, router, accessService, configSvc)

  beforeEach(() => {
    contentService = {
      parentContent: 'do_course',
      originalContent: { do_2: { identifier: 'do_2' } },
      upDatedContent: { do_2: {} },
      getUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'do_2' }),
      getOriginalMeta: jest.fn().mockReturnValue({ identifier: 'do_course', children: [] }),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      parentUpdatedMeta: jest.fn().mockReturnValue({
        identifier: 'do_course',
        categoryType: 'Course',
        posterImage: 'p.png',
        sourceName: 'src',
        subTitle: 'sub',
        body: '<p/>',
      }),
    }
    editorService = {
      newCreatedLexid: 'do_new',
      readMultipleContent: jest.fn().mockReturnValue(of([{ identifier: 'do_9' }])),
      createAndReadContentV2: jest.fn().mockReturnValue(of({ identifier: 'do_new' })),
      createAndReadModule: jest.fn().mockReturnValue(of({ identifier: 'do_mod' })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
    }
    resolver = {
      hasAccess: jest.fn().mockReturnValue(true),
      buildTreeAndMap: jest.fn().mockReturnValue(treeNode({ id: 5, identifier: 'do_5' })),
      getFlatHierarchy: jest.fn().mockReturnValue([]),
    }
    authInitService = {
      collectionConfig: { childrenConfig: { Course: {}, Collection: {} }, maxDepth: 4 },
      creationEntity: new Map<string, any>([
        ['upload', { mimeType: 'application/pdf', contentType: 'Resource', primaryCategory: 'Learning Resource' }],
        [
          'collection',
          {
            mimeType: 'application/vnd.ekstep.content-collection',
            contentType: 'CourseUnit',
            primaryCategory: 'Course Unit',
          },
        ],
        ['link', { mimeType: 'text/x-url', contentType: 'Resource', primaryCategory: 'Learning Resource' }],
      ]),
    }
    logger = { error: jest.fn() }
    router = { url: '/author/editor/do_course/collection' }
    accessService = { userId: 'u1', userName: 'User One' }
    configSvc = { userProfile: { userId: 'u1' } }

    service = build()
  })

  describe('setUploadContentAcceptType', () => {
    const cases: Array<[string, string]> = [
      ['audio', 'audio/mpeg'],
      ['video', 'video/mp4'],
      ['pdf', 'application/pdf'],
      ['zip', 'application/vnd.ekstep.html-archive'],
      ['url', 'application/x-mpegURL'],
    ]

    cases.forEach(([type, mime]) => {
      it(`maps "${type}" to ${mime}`, () => {
        service.uploadFileType.next(type)
        expect(service.setUploadContentAcceptType()).toBe(mime)
      })
    })
  })

  describe('addChildOrSibling', () => {
    it('reads the picked contents and grafts them into the tree', async () => {
      const spy = jest.spyOn(service, 'dragAndDrop').mockResolvedValue(undefined as any)
      const result = await service.addChildOrSibling(['do_9'], treeNode({ id: 1 }))
      expect(editorService.readMultipleContent).toHaveBeenCalledWith(['do_9'])
      expect(contentService.setOriginalMeta).toHaveBeenCalledWith({ identifier: 'do_9' })
      expect(resolver.buildTreeAndMap).toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('emits the tree change only after the last content is grafted', async () => {
      editorService.readMultipleContent.mockReturnValue(of([{ identifier: 'do_9' }, { identifier: 'do_10' }]))
      const spy = jest.spyOn(service, 'dragAndDrop').mockResolvedValue(undefined as any)
      await service.addChildOrSibling(['do_9', 'do_10'], treeNode({ id: 1 }))
      expect(spy.mock.calls[0][4]).toBe(false)
      expect(spy.mock.calls[1][4]).toBe(true)
    })

    it('logs and reports failure when the read fails', async () => {
      editorService.readMultipleContent.mockReturnValue(throwError(() => 'boom'))
      const result = await service.addChildOrSibling(['do_9'], treeNode({ id: 1 }))
      expect(logger.error).toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  describe('createChildOrSibling', () => {
    beforeEach(() => {
      jest.spyOn(service, 'dragAndDrop').mockResolvedValue(undefined as any)
    })

    it('creates an ordinary resource and grafts it into the tree', async () => {
      const result = await service.createChildOrSibling('upload', treeNode({ id: 1 }), undefined, 'below', {})
      expect(editorService.createAndReadContentV2).toHaveBeenCalled()
      expect(contentService.setOriginalMeta).toHaveBeenCalledWith({ identifier: 'do_new' })
      expect(service.dragAndDrop).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('inherits the parent metadata onto the new resource', async () => {
      await service.createChildOrSibling('upload', treeNode({ id: 1 }), undefined, 'below', {
        topicName: 'My Resource',
        topicDescription: 'about it',
      })
      const body = editorService.createAndReadContentV2.mock.calls[0][0]
      expect(body.name).toBe('My Resource')
      expect(body.description).toBe('about it')
      expect(body.categoryType).toBe('Course')
      expect(body.resourceType).toBe('Course')
      expect(body.sourceName).toBe('src')
      expect(body.subTitle).toBe('sub')
      expect(body.ownershipType).toEqual(['createdFor'])
    })

    // getModuleRequest() walks this.parentData.children while assembling the
    // hierarchy payload, so the module tests need the course tree seeded.
    const seedParentData = () => {
      service.parentNode = ['do_course']
      service.parentData = { identifier: 'do_course', category: 'Course', children: [] } as any
    }

    it('creates a module through the module endpoint', async () => {
      seedParentData()
      await service.createChildOrSibling({ type: 'collection' }, treeNode({ id: 1 }), undefined, 'below', {})
      expect(editorService.createAndReadModule).toHaveBeenCalled()
      expect(service.createdModuleUpdate).toBe(true)
      expect(editorService.createAndReadContentV2).not.toHaveBeenCalled()
    })

    it('names the module rather than taking the topic name', async () => {
      seedParentData()
      await service.createChildOrSibling({ type: 'collection' }, treeNode({ id: 1 }), undefined, 'below', {
        topicName: 'Ignored',
      })
      const payload = editorService.createAndReadModule.mock.calls[0][0]
      expect(payload.request.data.nodesModified['Module Name']).toBeDefined()
      expect(service.createdModuleUpdate).toBe(true)
    })

    it('attaches the new module to the course root in the hierarchy', async () => {
      seedParentData()
      await service.createChildOrSibling({ type: 'collection' }, treeNode({ id: 1 }), undefined, 'below', {})
      const hierarchy = editorService.createAndReadModule.mock.calls[0][0].request.data.hierarchy
      expect(hierarchy['do_course'].children).toContain('Module Name')
      expect(hierarchy['Module Name']).toEqual({
        root: false,
        contentType: 'CourseUnit',
        primaryCategory: 'Course Unit',
        children: [],
      })
    })

    it('registers the existing resources in the module hierarchy', async () => {
      service.parentNode = ['do_course']
      service.parentData = {
        identifier: 'do_course',
        category: 'Course',
        children: [{ identifier: 'do_res', contentType: 'Resource', name: 'Res' }],
      } as any
      await service.createChildOrSibling({ type: 'collection' }, treeNode({ id: 1 }), undefined, 'below', {})
      const hierarchy = editorService.createAndReadModule.mock.calls[0][0].request.data.hierarchy
      expect(hierarchy['do_res']).toEqual({ children: [], name: 'Res', root: false })
    })

    it('marks the course itself as the root node to modify', async () => {
      seedParentData()
      await service.createChildOrSibling({ type: 'collection' }, treeNode({ id: 1 }), undefined, 'below', {})
      const nodes = editorService.createAndReadModule.mock.calls[0][0].request.data.nodesModified
      expect(nodes['do_course']).toEqual({ isNew: false, root: true })
    })

    it('treats a web resource as a link with the link mime type', async () => {
      await service.createChildOrSibling('web', treeNode({ id: 1 }), undefined, 'below', {}, 'link')
      const body = editorService.createAndReadContentV2.mock.calls[0][0]
      expect(body.mimeType).toBe('text/x-url')
      expect(body.fileType).toBe('link')
    })

    it('uses the selected upload mime type for an upload', async () => {
      service.uploadFileType.next('video')
      await service.createChildOrSibling('upload', treeNode({ id: 1 }), undefined, 'below', {})
      expect(editorService.createAndReadContentV2.mock.calls[0][0].mimeType).toBe('video/mp4')
    })

    it('returns the created content when the caller asks for it', async () => {
      const result = await service.createChildOrSibling('upload', treeNode({ id: 1 }), undefined, 'below', {}, '', true)
      expect(result).toEqual({ content: { identifier: 'do_new' }, isDone: true })
    })

    it('logs and reports failure when the create fails', async () => {
      editorService.createAndReadContentV2.mockReturnValue(throwError(() => 'boom'))
      const result = await service.createChildOrSibling('upload', treeNode({ id: 1 }), undefined, 'below', {})
      expect(logger.error).toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  describe('getTreeHierarchy', () => {
    it('returns an empty tree without parent data', () => {
      expect(service.getTreeHierarchy()).toEqual({})
    })

    it('returns an empty tree when the parent has no identifier', () => {
      service.parentData = { category: 'Course' }
      expect(service.getTreeHierarchy()).toEqual({})
    })

    it('lists the course children under the root', () => {
      service.parentNode = ['do_course']
      service.parentData = {
        identifier: 'do_course',
        category: 'Course',
        children: [{ identifier: 'do_mod', contentType: 'CourseUnit', children: [] }],
      }
      expect(service.getTreeHierarchy()['do_course']).toEqual({
        root: true,
        contentType: 'Course',
        children: ['do_mod'],
      })
    })

    it('registers each module and its resources', () => {
      service.parentNode = ['do_course']
      service.parentData = {
        identifier: 'do_course',
        category: 'Course',
        children: [
          {
            identifier: 'do_mod',
            contentType: 'CourseUnit',
            primaryCategory: 'Course Unit',
            children: [
              {
                identifier: 'do_res',
                contentType: 'Resource',
                primaryCategory: 'Learning Resource',
                name: 'Res',
              },
            ],
          },
        ],
      }
      const tree = service.getTreeHierarchy()
      expect(tree['do_mod'].children).toEqual(['do_res'])
      expect(tree['do_mod'].primaryCategory).toBe('Course Unit')
      expect(tree['do_res']).toEqual({
        root: false,
        contentType: undefined,
        primaryCategory: undefined,
        name: 'Res',
        children: [],
      })
    })

    it('marks a nested module as a course unit', () => {
      service.parentNode = ['do_course']
      service.parentData = {
        identifier: 'do_course',
        category: 'Course',
        children: [
          {
            identifier: 'do_mod',
            contentType: 'CourseUnit',
            children: [{ identifier: 'do_sub', contentType: 'CourseUnit', primaryCategory: 'Course Unit', children: [] }],
          },
        ],
      }
      const tree = service.getTreeHierarchy()
      expect(tree['do_sub'].contentType).toBe('CourseUnit')
      expect(tree['do_sub'].primaryCategory).toBe('Course Unit')
    })

    it('handles a course with no children', () => {
      service.parentData = { identifier: 'do_course', category: 'Course' }
      expect(service.getTreeHierarchy()['do_course'].children).toEqual([])
    })
  })

  describe('deleteContentNode', () => {
    it('deletes the matching top-level child', async () => {
      const child = { id: 2, identifier: 'do_2', children: [] }
      service.currentParentNode = 1
      service.flatNodeMap.set(1, { id: 1, identifier: 'do_1', children: [child] } as any)
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => {})
      await service.deleteContentNode({ identifier: 'do_2' })
      expect(spy).toHaveBeenCalledWith(2)
    })

    it('deletes a matching nested child', async () => {
      const grandchild = { id: 3, identifier: 'do_3' }
      const child = { id: 2, identifier: 'do_2', children: [grandchild] }
      service.currentParentNode = 1
      service.flatNodeMap.set(1, { id: 1, identifier: 'do_1', children: [child] } as any)
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => {})
      await service.deleteContentNode({ identifier: 'do_3' })
      expect(spy).toHaveBeenCalledWith(3)
    })

    it('does nothing when the content is not in the tree', async () => {
      service.currentParentNode = 1
      service.flatNodeMap.set(1, { id: 1, identifier: 'do_1', children: [] } as any)
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => {})
      await service.deleteContentNode({ identifier: 'do_nope' })
      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when there is no parent node', async () => {
      const spy = jest.spyOn(service, 'deleteNode').mockImplementation(() => {})
      await service.deleteContentNode({ identifier: 'do_2' })
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
