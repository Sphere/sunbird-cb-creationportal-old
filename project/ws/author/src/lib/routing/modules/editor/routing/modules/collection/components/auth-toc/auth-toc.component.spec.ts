import { of, ReplaySubject, Subject, throwError } from 'rxjs'
import { AuthTocComponent } from './auth-toc.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('AuthTocComponent', () => {
  let component: AuthTocComponent
  let dialog: any
  let snackBar: any
  let store: any
  let editorStore: any
  let loaderService: any
  let authInitService: any
  let breakpointObserver: any
  let editorService: any
  let onInvalidNodeChange: ReplaySubject<number[]>
  let treeStructureChange: Subject<any>
  let selectedNodeChange: Subject<any>
  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  /** jQuery is a global in this component; stub it with a chainable no-op. */
  const jqStub = () => {
    const chain: any = {
      hasClass: jest.fn().mockReturnValue(true),
      removeClass: jest.fn(),
      trigger: jest.fn(),
      find: jest.fn(),
    }
    chain.find.mockReturnValue(chain)
    return jest.fn().mockReturnValue(chain)
  }

  const node = (over: any = {}) =>
    ({
      id: 2,
      level: 1,
      identifier: 'do_2',
      category: 'CourseUnit',
      expandable: true,
      children: [],
      editable: true,
      childLoaded: true,
      parentId: 1,
      ...over,
    }) as any

  const build = () =>
    new AuthTocComponent(dialog, snackBar, store, editorStore, loaderService, authInitService, breakpointObserver, editorService)

  beforeEach(() => {
    onInvalidNodeChange = new ReplaySubject<number[]>()
    treeStructureChange = new Subject<any>()
    selectedNodeChange = new Subject<any>()
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()
    ;(global as any).$ = jqStub()

    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    snackBar = { openFromComponent: jest.fn() }
    store = {
      currentParentNode: 1,
      currentSelectedNode: 1,
      onInvalidNodeChange,
      treeStructureChange,
      selectedNodeChange,
      flatNodeMap: new Map<number, any>(),
      uniqueIdMap: new Map<number, string>([[2, 'do_2']]),
      changedHierarchy: {},
      allowDrop: jest.fn().mockReturnValue(true),
      dragAndDrop: jest.fn(),
      deleteNode: jest.fn(),
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      addChildOrSibling: jest.fn().mockResolvedValue(true),
      createChildOrSibling: jest.fn().mockResolvedValue({ isDone: true, content: null }),
    }
    editorStore = {
      currentContent: '',
      parentContent: 'do_course',
      upDatedContent: {},
      changeActiveCont,
      cleanProperties: jest.fn().mockImplementation((v: any) => v),
      getNodeModifyData: jest.fn().mockReturnValue({}),
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
    }
    loaderService = { changeLoad: { next: jest.fn() } }
    authInitService = {
      collectionConfig: { childrenConfig: { CourseUnit: { searchFilter: { a: 1 } } } },
    }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    editorService = {
      updateContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_course' })),
    }

    component = build()
  })

  afterEach(() => {
    jest.clearAllMocks()
    delete (global as any).$
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('builds the tree control and adopts the current parent node', () => {
      component.ngOnInit()
      expect(component.parentNodeId).toBe(1)
      expect(component.treeControl).toBeDefined()
      expect(component.dataSource).toBeDefined()
    })

    it('expands the nodes reported invalid by the store', () => {
      component.ngOnInit()
      const spy = jest.spyOn(component, 'expandNodesById')
      onInvalidNodeChange.next([2, 3])
      expect(component.invalidIds).toEqual([2, 3])
      expect(spy).toHaveBeenCalledWith([2, 3])
    })

    it('renders the tree when the structure changes', () => {
      component.ngOnInit()
      const root = { id: 1, identifier: 'do_1', category: 'Course', children: [], editable: true }
      treeStructureChange.next(root)
      expect(component.dataSource.data).toEqual([root])
    })

    it('adopts a new parent node when the store moves to another course', () => {
      component.ngOnInit()
      store.currentParentNode = 9
      treeStructureChange.next({ id: 9, identifier: 'do_9', children: [] })
      expect(component.parentNodeId).toBe(9)
    })

    it('falls back to a surviving ancestor when the selected node disappears', () => {
      component.ngOnInit()
      component.selectedNode = 5
      component.parentHierarchy = [2]
      store.flatNodeMap.set(2, { identifier: 'do_2' })
      jest.spyOn(changeActiveCont, 'next')
      treeStructureChange.next({ id: 1, identifier: 'do_1', children: [] })
      expect(component.selectedNode).toBe(2)
      expect(editorStore.currentContent).toBe('do_2')
      expect(store.currentSelectedNode).toBe(2)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('tracks the selected node identifier from the flat map', () => {
      component.ngOnInit()
      store.flatNodeMap.set(2, { identifier: 'do_2' })
      selectedNodeChange.next(2)
      expect(component.selectedNode).toBe(2)
      expect(component.contentId).toBe('do_2')
    })

    it('falls back to the raw node id when it is not in the flat map', () => {
      component.ngOnInit()
      selectedNodeChange.next(7)
      expect(component.contentId).toBe('7')
    })

    it('ignores an empty selected-node notification', () => {
      component.ngOnInit()
      selectedNodeChange.next(null)
      expect(component.selectedNode).toBeNull()
    })

    it('shows the sidebar controls on a wide screen', () => {
      component.ngOnInit()
      expect(component.mediumScreen).toBe(false)
      expect(component.leftarrow).toBe(true)
      expect(component.menubtn).toBe(true)
    })

    it('hides the sidebar controls on a narrow screen', () => {
      breakpointObserver.observe.mockReturnValue(of({ matches: true }))
      const c = build()
      c.ngOnInit()
      expect(c.mediumScreen).toBe(true)
      expect(c.drawer).toBe(true)
      expect(c.leftarrow).toBe(false)
      expect(c.menubtn).toBe(false)
    })
  })

  describe('lifecycle', () => {
    it('ngAfterViewInit selects the first node when nothing is selected', () => {
      const chain = (global as any).$()
      chain.hasClass.mockReturnValue(false)
      component.ngAfterViewInit()
      expect(chain.trigger).toHaveBeenCalledWith('click')
    })

    it('ngAfterViewInit leaves an existing selection alone', () => {
      const chain = (global as any).$()
      chain.hasClass.mockReturnValue(true)
      chain.trigger.mockClear()
      component.ngAfterViewInit()
      expect(chain.trigger).not.toHaveBeenCalled()
    })

    it('ngOnDestroy hides the loader', () => {
      component.ngOnDestroy()
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })

  describe('onNodeSelect', () => {
    beforeEach(() => component.ngOnInit())

    it('emits the edit action and records the new selection', () => {
      const emitted: any[] = []
      component.action.subscribe(v => emitted.push(v))
      jest.spyOn(changeActiveCont, 'next')
      component.onNodeSelect(node())
      expect(emitted).toEqual([{ type: 'editContent', identifier: 'do_2', nodeClicked: true }])
      expect(component.selectedNode).toBe(2)
      expect(component.contentId).toBe('do_2')
      expect(editorStore.currentContent).toBe('do_2')
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('does nothing when the node is already selected', () => {
      const emitted: any[] = []
      component.action.subscribe(v => emitted.push(v))
      component.selectedNode = 2
      component.onNodeSelect(node())
      expect(emitted).toEqual([])
    })

    it('clears the stale selection styling', () => {
      const chain = (global as any).$()
      chain.hasClass.mockReturnValue(true)
      component.onNodeSelect(node())
      expect(chain.removeClass).toHaveBeenCalledWith('selected')
    })
  })

  it('closeSidenav emits the close event', () => {
    const emitted: boolean[] = []
    component.closeEvent.subscribe(v => emitted.push(v))
    component.closeSidenav()
    expect(emitted).toEqual([true])
  })

  describe('drag and drop', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.treeControl.dataNodes = [
        node({ id: 1, level: 0, identifier: 'do_1', parentId: undefined }),
        node({ id: 2, level: 1 }),
        node({ id: 3, level: 1, identifier: 'do_3' }),
      ]
    })

    const hoverEvent = (offsetY: number, clientHeight = 100) => ({ preventDefault: jest.fn(), offsetY, target: { clientHeight } }) as any

    it('dragStart records the dragged node', () => {
      component.dragStart(node())
      expect(component.isDragging).toBe(true)
      expect(component.dragContainer).toEqual(node())
    })

    it('dragEnd snapshots and clears the drag state', () => {
      component.dragStart(node())
      component.dropContainer = node({ id: 3 })
      component.draggingPosition = 'below'
      component.dragEnd()
      expect(component.backUpInformation.isDragging).toBe(true)
      expect(component.backUpInformation.draggingPosition).toBe('below')
      expect(component.isDragging).toBe(false)
      expect(component.dragContainer).toBeNull()
      expect(component.dropContainer).toBeNull()
    })

    it('dragHover does nothing while not dragging', () => {
      const event = hoverEvent(50)
      component.dragHover(node({ id: 3 }), event)
      expect(component.dropContainer).toBeNull()
    })

    it('dragHover reads an above-drop from the cursor position', () => {
      component.dragStart(component.treeControl.dataNodes[1])
      component.dragHover(component.treeControl.dataNodes[2], hoverEvent(5))
      expect(component.draggingPosition).toBe('above')
    })

    it('dragHover reads a below-drop from the cursor position', () => {
      component.dragStart(component.treeControl.dataNodes[1])
      component.dragHover(component.treeControl.dataNodes[2], hoverEvent(90))
      expect(component.draggingPosition).toBe('below')
    })

    it('dragHover reads a centre-drop from the cursor position', () => {
      component.dragStart(component.treeControl.dataNodes[1])
      component.dragHover(component.treeControl.dataNodes[2], hoverEvent(50))
      expect(component.draggingPosition).toBe('center')
      expect(store.allowDrop).toHaveBeenCalled()
    })

    it('dragHover expands the hovered node after the delay', () => {
      jest.useFakeTimers()
      const expand = jest.spyOn(component.treeControl, 'expand')
      component.dragStart(component.treeControl.dataNodes[1])
      component.dragHover(component.treeControl.dataNodes[2], hoverEvent(50))
      jest.advanceTimersByTime(600)
      expect(expand).toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('dragHover blocks dropping a node into its own subtree', () => {
      component.dragStart(component.treeControl.dataNodes[0])
      component.dragHover(component.treeControl.dataNodes[1], hoverEvent(50))
      expect(component.isDropDisabled).toBe(true)
    })

    it('dragHover blocks dropping a node onto itself', () => {
      const dragged = node({ id: 9, level: 1, parentId: undefined })
      component.treeControl.dataNodes = [dragged]
      component.dragStart(dragged)
      component.dragHover(dragged, hoverEvent(50))
      expect(component.isDropDisabled).toBe(true)
    })

    it('dragHover blocks an adjacent drop with no parent to receive it', () => {
      const dragged = node({ id: 9, level: 1, parentId: undefined })
      const target = node({ id: 8, level: 1, parentId: undefined })
      component.treeControl.dataNodes = [target]
      component.dragStart(dragged)
      component.dragHover(target, hoverEvent(5))
      expect(component.isDropDisabled).toBe(true)
    })

    it('dragHover defers an adjacent drop to the store', () => {
      component.dragStart(node({ id: 9, level: 2, parentId: undefined }))
      component.dragHover(component.treeControl.dataNodes[1], hoverEvent(5))
      expect(store.allowDrop).toHaveBeenCalled()
      expect(component.isDropDisabled).toBe(false)
    })

    it('dragHoverEnd clears the drop container while dragging', () => {
      component.dragStart(node())
      component.dropContainer = node({ id: 3 })
      const event = { preventDefault: jest.fn() } as any
      component.dragHoverEnd(event)
      expect(event.preventDefault).toHaveBeenCalled()
      expect(component.dropContainer).toBeNull()
      expect(component.backUpInformation.dropContainer).toEqual(node({ id: 3 }))
    })

    it('dragHoverEnd is inert while not dragging', () => {
      const event = { preventDefault: jest.fn() } as any
      component.dragHoverEnd(event)
      expect(component.backUpInformation.dropContainer).toBeNull()
    })

    it('drop moves the node into the hovered container', () => {
      component.isDropDisabled = false
      component.backUpInformation = {
        isDragging: true,
        dragContainer: component.treeControl.dataNodes[1],
        dropContainer: component.treeControl.dataNodes[0],
        draggingPosition: 'center',
      }
      component.drop()
      expect(store.dragAndDrop).toHaveBeenCalledWith(
        component.treeControl.dataNodes[1],
        component.treeControl.dataNodes[0],
        undefined,
        'center',
      )
    })

    it('drop places the node beside its neighbour for an adjacent drop', () => {
      component.isDropDisabled = false
      component.backUpInformation = {
        isDragging: true,
        dragContainer: component.treeControl.dataNodes[2],
        dropContainer: component.treeControl.dataNodes[1],
        draggingPosition: 'below',
      }
      component.drop()
      expect(store.dragAndDrop).toHaveBeenCalledWith(component.treeControl.dataNodes[2], component.treeControl.dataNodes[0], 2, 'below')
    })

    it('drop does nothing when the drop is disabled', () => {
      component.isDropDisabled = true
      component.drop()
      expect(store.dragAndDrop).not.toHaveBeenCalled()
      expect(component.isDragging).toBe(false)
    })

    it('drop does nothing when the node lands on itself', () => {
      component.isDropDisabled = false
      component.backUpInformation = {
        isDragging: true,
        dragContainer: component.treeControl.dataNodes[0],
        dropContainer: component.treeControl.dataNodes[0],
        draggingPosition: 'center',
      }
      component.drop()
      expect(store.dragAndDrop).not.toHaveBeenCalled()
    })
  })

  describe('tree helpers', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.treeControl.dataNodes = [node({ id: 1, level: 0 }), node({ id: 2, level: 1 }), node({ id: 3, level: 2 })]
    })

    it('getParentNode returns null at the root level', () => {
      expect(component.getParentNode(component.treeControl.dataNodes[0])).toBeNull()
    })

    it('getParentNode finds the nearest shallower node', () => {
      expect(component.getParentNode(component.treeControl.dataNodes[2])!.id).toBe(2)
    })

    it('getParentNode returns null when no shallower node precedes it', () => {
      component.treeControl.dataNodes = [node({ id: 5, level: 1 })]
      expect(component.getParentNode(component.treeControl.dataNodes[0])).toBeNull()
    })

    it('preserveExpandedNodes remembers the expanded ids', () => {
      jest.spyOn(component.treeControl, 'isExpandable').mockReturnValue(true)
      jest.spyOn(component.treeControl, 'isExpanded').mockImplementation((n: any) => n.id === 2)
      component.preserveExpandedNodes()
      expect(Array.from(component.expandedNodes)).toEqual([2])
    })

    it('expandNodesById expands the node and its ancestors', () => {
      const expand = jest.spyOn(component.treeControl, 'expand')
      component.expandNodesById([3])
      expect(expand).toHaveBeenCalledWith(component.treeControl.dataNodes[2])
      expect(expand).toHaveBeenCalledWith(component.treeControl.dataNodes[1])
    })

    it('expandNodesById falls back to the remembered set', () => {
      const expand = jest.spyOn(component.treeControl, 'expand')
      component.expandedNodes = new Set([1])
      component.expandNodesById()
      expect(expand).toHaveBeenCalledWith(component.treeControl.dataNodes[0])
    })

    it('_transformer flattens a nested node', () => {
      const flat = (component as any)._transformer(
        { id: 1, identifier: 'do_1', category: 'Course', children: [{ id: 2 }], editable: true, childLoaded: true },
        0,
      )
      expect(flat).toEqual({
        level: 0,
        id: 1,
        identifier: 'do_1',
        category: 'Course',
        expandable: true,
        children: [2],
        editable: true,
        childLoaded: true,
        parentId: undefined,
      })
    })

    it('_transformer marks a childless node as a leaf', () => {
      const flat = (component as any)._transformer({ id: 2, identifier: 'do_2', children: [] }, 1)
      expect(flat.expandable).toBe(false)
      expect(flat.children).toEqual([])
    })

    it('_transformer tolerates a node with no children array', () => {
      const flat = (component as any)._transformer({ id: 2, identifier: 'do_2' }, 1)
      expect(flat.expandable).toBe(false)
      expect(flat.children).toEqual([])
    })
  })

  describe('delete', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.treeControl.dataNodes = [node({ id: 1, level: 0 }), node({ id: 2, level: 1 })]
    })

    it('does nothing when the confirmation is dismissed', () => {
      component.delete(node())
      afterClosed.next(false)
      expect(store.deleteNode).not.toHaveBeenCalled()
    })

    it('deletes the node and pushes the new hierarchy', () => {
      component.delete(node())
      afterClosed.next(true)
      expect(store.deleteNode).toHaveBeenCalledWith(2)
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.SUCCESS } }),
      )
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('records the ancestry so the selection can fall back', () => {
      component.delete(node())
      afterClosed.next(true)
      expect(component.parentHierarchy).toEqual([1])
    })

    it('re-reads the course after a successful delete', () => {
      component.delete(node())
      afterClosed.next(true)
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(editorStore.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
    })

    it('reports a failed delete', () => {
      editorService.updateContentV4.mockReturnValue(throwError(() => 'boom'))
      component.delete(node())
      afterClosed.next(true)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { type: Notify.FAIL } }))
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })

  describe('addChildOrSibling', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.treeControl.dataNodes = [node({ id: 1, level: 0 }), node({ id: 2, level: 1 })]
    })

    it('opens the picker seeded with the existing children', async () => {
      await component.addChildOrSibling(node({ children: [2] }))
      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { filter: { a: 1 }, selectedIds: ['do_2'] } }),
      )
    })

    it('attaches the picked contents as children', async () => {
      await component.addChildOrSibling(node())
      afterClosed.next(['do_9'])
      expect(store.addChildOrSibling).toHaveBeenCalledWith(['do_9'], node(), undefined, 'below')
      expect(component.expandedNodes.has(2)).toBe(true)
    })

    it('attaches the picked contents as siblings', async () => {
      await component.addChildOrSibling(component.treeControl.dataNodes[1], true)
      afterClosed.next(['do_9'])
      expect(store.addChildOrSibling).toHaveBeenCalledWith(['do_9'], component.treeControl.dataNodes[0], 2, 'below')
    })

    it('does nothing when the picker returns nothing', async () => {
      await component.addChildOrSibling(node())
      afterClosed.next([])
      expect(store.addChildOrSibling).not.toHaveBeenCalled()
    })

    it('reports a failed attach', async () => {
      store.addChildOrSibling.mockResolvedValue(false)
      await component.addChildOrSibling(node())
      afterClosed.next(['do_9'])
      await Promise.resolve()
      await Promise.resolve()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('createNewChildOrSibling', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.treeControl.dataNodes = [node({ id: 1, level: 0 }), node({ id: 2, level: 1 })]
    })

    it('creates a child under the given node', async () => {
      await component.createNewChildOrSibling('upload', node())
      expect(store.createChildOrSibling).toHaveBeenCalledWith('upload', node(), undefined, 'below', {}, '', true)
      expect(component.expandedNodes.has(2)).toBe(true)
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('marks a web resource as a link', async () => {
      await component.createNewChildOrSibling('web', node())
      expect(store.createChildOrSibling).toHaveBeenCalledWith('web', node(), undefined, 'below', {}, 'link', true)
    })

    it('creates a sibling beside the given node', async () => {
      await component.createNewChildOrSibling('upload', component.treeControl.dataNodes[1], true)
      expect(store.createChildOrSibling).toHaveBeenCalledWith('upload', component.treeControl.dataNodes[0], 2, 'below', {}, '', true)
    })

    it('saves the tree when a content node was created', async () => {
      store.createChildOrSibling.mockResolvedValue({
        isDone: true,
        content: { identifier: 'do_new' },
      })
      await component.createNewChildOrSibling('upload', node())
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('reports a failed creation', async () => {
      store.createChildOrSibling.mockResolvedValue({ isDone: false, content: null })
      await component.createNewChildOrSibling('upload', node())
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { type: Notify.FAIL } }))
    })
  })

  describe('takeAction', () => {
    beforeEach(() => component.ngOnInit())

    it('routes the view actions through onNodeSelect', () => {
      ;['editMeta', 'editContent', 'preview'].forEach(action => {
        const emitted: any[] = []
        const c = build()
        c.ngOnInit()
        c.action.subscribe(v => emitted.push(v))
        c.takeAction(action, node())
        expect(emitted).toContainEqual({ type: action, identifier: 'do_2' })
      })
    })

    it('routes a delete', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.takeAction('delete', node())
      expect(spy).toHaveBeenCalled()
    })

    it('routes an addChild and addSibling', () => {
      const spy = jest.spyOn(component, 'addChildOrSibling').mockResolvedValue(undefined as any)
      component.takeAction('addChild', node())
      expect(spy).toHaveBeenCalledWith(node())
      component.takeAction('addSibling', node())
      expect(spy).toHaveBeenCalledWith(node(), true)
    })

    it('routes a createChild and createSibling', () => {
      const spy = jest.spyOn(component, 'createNewChildOrSibling').mockResolvedValue(undefined as any)
      component.takeAction('createChild', node(), 'upload')
      expect(spy).toHaveBeenCalledWith('upload', node())
      component.takeAction('createSibling', node(), 'web')
      expect(spy).toHaveBeenCalledWith('web', node(), true)
    })

    it('ignores an unknown action', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.takeAction('whatever', node())
      expect(spy).not.toHaveBeenCalled()
    })

    it('addChapter is retained for the template binding', () => {
      expect(() => component.addChapter()).not.toThrow()
    })
  })

  describe('triggerSave', () => {
    it('pushes the hierarchy and re-reads the course', () => {
      component.triggerSave().subscribe()
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(store.changedHierarchy).toEqual({})
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(editorStore.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('updateSelectedNodeIdentifier', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.contentId = 'do_2'
    })

    it('does nothing when nothing has changed', async () => {
      await component.updateSelectedNodeIdentifier(node())
      expect(editorService.updateContentV3).not.toHaveBeenCalled()
    })

    it('saves the tree when the active node has no pending edit', async () => {
      editorStore.upDatedContent = { do_other: { name: 'x' } }
      const spy = jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.updateSelectedNodeIdentifier(node())
      expect(spy).toHaveBeenCalled()
    })

    it('pushes the pending edit and refreshes the hierarchy', async () => {
      editorStore.upDatedContent = { do_2: { name: 'New', duration: 60, category: 'Resource' } }
      await component.updateSelectedNodeIdentifier(node({ category: 'Resource' }))
      expect(editorService.updateContentV3).toHaveBeenCalled()
      const body = editorService.updateContentV3.mock.calls[0][0]
      expect(body.request.content.duration).toBe('60')
      expect(body.request.content.category).toBeUndefined()
      expect(editorStore.upDatedContent).toEqual({})
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('marks a course unit as a parent-visibility node', async () => {
      editorStore.upDatedContent = { do_2: { name: 'New', category: 'CourseUnit' } }
      await component.updateSelectedNodeIdentifier(node({ category: 'CourseUnit' }))
      expect(editorService.updateContentV3.mock.calls[0][0].request.content.visibility).toBe('Parent')
    })

    it('skips the update for a Collection node', async () => {
      editorStore.upDatedContent = { do_2: { name: 'New' } }
      await component.updateSelectedNodeIdentifier(node({ category: 'Collection' }))
      expect(editorService.updateContentV3).not.toHaveBeenCalled()
    })

    it('skips a change that carries only the version key', async () => {
      editorStore.upDatedContent = { do_2: { versionKey: 'vk1' } }
      await component.updateSelectedNodeIdentifier(node({ category: 'Resource' }))
      expect(editorService.updateContentV3).not.toHaveBeenCalled()
    })

    it('pushes a single non-versionKey change', async () => {
      editorStore.upDatedContent = { do_2: { name: 'New' } }
      await component.updateSelectedNodeIdentifier(node({ category: 'Resource' }))
      expect(editorService.updateContentV3).toHaveBeenCalled()
    })

    it('stringifies a zero duration', async () => {
      editorStore.upDatedContent = { do_2: { name: 'New', duration: 0 } }
      await component.updateSelectedNodeIdentifier(node({ category: 'Resource' }))
      expect(editorService.updateContentV3.mock.calls[0][0].request.content.duration).toBe('0')
    })
  })
})
