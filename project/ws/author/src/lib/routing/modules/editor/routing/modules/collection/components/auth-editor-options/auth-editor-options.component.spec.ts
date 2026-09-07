import { AuthEditorOptionsComponent } from './auth-editor-options.component'
import { IContentTreeNode } from './../../interface/icontent-tree'

describe('AuthEditorOptionsComponent', () => {
  let component: AuthEditorOptionsComponent
  let authInitService: any
  let accessService: any
  let storeService: any

  const entity = (over: any = {}) => ({
    id: 'course',
    name: 'Course',
    icon: 'book',
    contentType: 'Course',
    ...over,
  })

  const meta = (over: any = {}) => ({
    isContentEditingDisabled: false,
    isMetaEditingDisabled: false,
    ...over,
  })

  const node = (over: Partial<IContentTreeNode> = {}): IContentTreeNode =>
    ({
      id: 1,
      identifier: 'do_1',
      editable: true,
      category: 'Collection',
      childLoaded: true,
      expandable: true,
      level: 1,
      ...over,
    }) as IContentTreeNode

  const buildEntityMap = () =>
    new Map<string, any>([
      ['course', entity()],
      ['knowledgeArtifact', entity({ id: 'knowledgeArtifact', name: 'KA', icon: 'x', contentType: 'Resource' })],
      ['resource', entity({ id: 'resource', name: 'Resource', contentType: 'Resource' })],
      ['collection', entity({ id: 'collection', name: 'Collection', contentType: 'Collection' })],
    ])

  const build = () => {
    const c = new AuthEditorOptionsComponent(authInitService, accessService, storeService)
    c.node = node()
    return c
  }

  beforeEach(() => {
    authInitService = {
      creationEntity: buildEntityMap(),
      collectionConfig: {
        maxDepth: 10,
        childrenConfig: {
          Collection: { allowCreation: true, allowedCreationType: ['course', 'knowledgeArtifact', 'resource', 'collection'] },
        },
      },
    }
    accessService = {
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      hasAccess: jest.fn().mockReturnValue(true),
    }
    storeService = { flatNodeMap: new Map() }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.isInvalid).toBe(true)
  })

  describe('ngOnInit', () => {
    it('reads the meta flags and edit access', () => {
      accessService.getUpdatedMeta.mockReturnValue(meta({ isContentEditingDisabled: true, isMetaEditingDisabled: true }))
      component.ngOnInit()

      expect(component.contentEditDisabled).toBe(true)
      expect(component.metaEditDisabled).toBe(true)
      expect(component.canEdit).toBe(true)
      expect(component.creationContent).toBe(authInitService.creationEntity)
    })

    it('builds the allowed children, excluding resource and collection', () => {
      component.ngOnInit()

      const ids = component.allowedChild.map(c => c.id)
      expect(ids).toContain('course')
      expect(ids).toContain('knowledgeArtifact')
      expect(ids).not.toContain('resource')
      expect(ids).not.toContain('collection')
    })

    it('skips children when creation is not allowed', () => {
      authInitService.collectionConfig.childrenConfig.Collection.allowCreation = false
      component.ngOnInit()
      expect(component.allowedChild).toEqual([])
    })

    it('skips children when the node is not editable', () => {
      component.node = node({ editable: false })
      component.ngOnInit()
      expect(component.allowedChild).toEqual([])
    })

    it('skips children when the user has no edit access', () => {
      accessService.hasAccess.mockReturnValue(false)
      component.ngOnInit()
      expect(component.canEdit).toBe(false)
      expect(component.allowedChild).toEqual([])
    })

    it('skips children when no config exists for the category', () => {
      component.node = node({ category: 'Unknown' })
      component.ngOnInit()
      expect(component.allowedChild).toEqual([])
    })

    it('builds allowed siblings from the parent config', () => {
      storeService.flatNodeMap.set(5, { identifier: 'do_parent', category: 'Collection' })
      component.node = node({ parentId: 5, level: 2 })
      component.ngOnInit()

      const ids = component.allowedSibling.map(c => c.id)
      expect(ids).toContain('course')
      expect(ids).toContain('knowledgeArtifact')
    })

    it('skips siblings when the parent content editing is disabled', () => {
      storeService.flatNodeMap.set(5, { identifier: 'do_parent', category: 'Collection' })
      accessService.getUpdatedMeta.mockImplementation((id: string) =>
        id === 'do_parent' ? meta({ isContentEditingDisabled: true }) : meta(),
      )
      component.node = node({ parentId: 5, level: 2 })
      component.ngOnInit()

      expect(component.allowedSibling).toEqual([])
    })

    it('leaves siblings empty when there is no parent', () => {
      component.ngOnInit()
      expect(component.allowedSibling).toEqual([])
    })
  })

  describe('formChildren', () => {
    beforeEach(() => {
      component.creationContent = authInitService.creationEntity
    })

    it('excludes entities not present in allowedCreationType', () => {
      const result = component.formChildren({ allowedCreationType: ['course'] }, 1)
      expect(result.map(c => c.id)).toEqual(['course'])
    })

    it('excludes entities that would exceed maxDepth', () => {
      authInitService.collectionConfig.maxDepth = 2
      // Course has DEPTH_RUE 3, so currentDepth 1 + 3 = 4 > 2 -> excluded
      const result = component.formChildren({ allowedCreationType: ['course', 'knowledgeArtifact'] }, 1)
      expect(result.map(c => c.id)).toEqual(['knowledgeArtifact'])
    })

    it('returns an empty list when allowedCreationType is missing', () => {
      const result = component.formChildren({}, 1)
      expect(result).toEqual([])
    })
  })

  describe('recursiveAddFunction', () => {
    it('maps an entity into a custom create entity with empty children', () => {
      const result = component.recursiveAddFunction(entity() as any)
      expect(result).toEqual({ children: [], id: 'course', name: 'Course', icon: 'book' })
    })
  })

  describe('click', () => {
    it('emits the action and type', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)
      component.click('addChild', 'course')
      expect(spy).toHaveBeenCalledWith({ action: 'addChild', type: 'course' })
    })

    it('emits with an undefined type when omitted', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)
      component.click('delete')
      expect(spy).toHaveBeenCalledWith({ action: 'delete', type: undefined })
    })
  })
})
