import { Subject } from 'rxjs'
import { AuthTableOfContentsComponent } from './auth-table-of-contents.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { IContentNode, IContentTreeNode } from '../../interface/icontent-tree'

describe('AuthTableOfContentsComponent', () => {
  let component: AuthTableOfContentsComponent
  let dialog: any
  let snackBar: any
  let store: any
  let editorStore: any
  let loaderService: any
  let authInitService: any
  let breakpointObserver: any
  let breakpoint$: Subject<{ matches: boolean }>
  let afterClosed$: Subject<any>

  /** Root > [modA > [leaf], modB] — 4 nodes, ids 1..4. */
  const tree = (): IContentNode => ({
    id: 1,
    identifier: 'do_root',
    category: 'Course',
    primaryCategory: 'Course',
    editable: true,
    childLoaded: true,
    name: 'Root',
    children: [
      {
        id: 2,
        identifier: 'do_modA',
        category: 'Module',
        primaryCategory: 'Module',
        editable: true,
        childLoaded: true,
        parentId: 1,
        name: 'Module A',
        children: [
          {
            id: 4,
            identifier: 'do_leaf',
            category: 'Resource',
            primaryCategory: 'Resource',
            editable: true,
            childLoaded: true,
            parentId: 2,
            name: 'Leaf',
          },
        ],
      },
      {
        id: 3,
        identifier: 'do_modB',
        category: 'Module',
        primaryCategory: 'Module',
        editable: true,
        childLoaded: true,
        parentId: 1,
        name: 'Module B',
      },
    ],
  })

  /** ngOnInit + push a tree through the store so treeControl.dataNodes is populated. */
  const withTree = (data: IContentNode = tree()) => {
    component.ngOnInit()
    store.treeStructureChange.next(data)
  }

  const nodeById = (id: number): IContentTreeNode => component.treeControl.dataNodes.find(n => n.id === id) as IContentTreeNode

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const hoverEvent = (offsetY: number, clientHeight = 100) =>
    ({
      preventDefault: jest.fn(),
      offsetY,
      target: { clientHeight },
    }) as any

  beforeEach(() => {
    jest.useFakeTimers()
    afterClosed$ = new Subject<any>()
    breakpoint$ = new Subject<{ matches: boolean }>()

    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed$ }) }
    snackBar = { openFromComponent: jest.fn() }
    store = {
      currentParentNode: 1,
      currentSelectedNode: 0,
      flatNodeMap: new Map<number, any>(),
      uniqueIdMap: new Map<number, string>([
        [1, 'do_root'],
        [2, 'do_modA'],
        [3, 'do_modB'],
        [4, 'do_leaf'],
      ]),
      onInvalidNodeChange: new Subject<number[]>(),
      treeStructureChange: new Subject<any>(),
      selectedNodeChange: new Subject<number>(),
      allowDrop: jest.fn().mockReturnValue(true),
      dragAndDrop: jest.fn(),
      deleteNode: jest.fn(),
      addChildOrSibling: jest.fn().mockResolvedValue(true),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
    }
    editorStore = { currentContent: '', changeActiveCont: { next: jest.fn() } }
    loaderService = { changeLoad: { next: jest.fn() } }
    authInitService = {
      collectionConfig: {
        childrenConfig: {
          Course: { searchFilter: { contentType: ['Module'] } },
          Module: { searchFilter: { contentType: ['Resource'] } },
          Resource: { searchFilter: {} },
        },
      },
    }
    breakpointObserver = { observe: jest.fn().mockReturnValue(breakpoint$) }

    component = new AuthTableOfContentsComponent(dialog, snackBar, store, editorStore, loaderService, authInitService, breakpointObserver)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.drawer).toBe(true)
    expect(component.menubtn).toBe(true)
    expect(component.leftarrow).toBe(true)
  })

  describe('ngOnInit', () => {
    it('builds the flat tree control from the current parent node', () => {
      store.currentParentNode = 7
      component.ngOnInit()

      expect(component.parentNodeId).toBe(7)
      expect(component.treeControl).toBeTruthy()
      expect(component.treeFlattener).toBeTruthy()
      expect(component.dataSource).toBeTruthy()
    })

    it('flattens the emitted tree structure into data nodes', () => {
      withTree()

      expect(component.treeControl.dataNodes.map(n => n.id)).toEqual([1, 2, 4, 3])
      expect(nodeById(1).expandable).toBe(true)
      expect(nodeById(1).children).toEqual([2, 3])
      expect(nodeById(3).expandable).toBe(false)
      expect(nodeById(3).children).toEqual([])
      expect(nodeById(4).parentId).toBe(2)
      expect(nodeById(4).level).toBe(2)
    })

    it('records invalid ids and expands them', () => {
      withTree()
      store.onInvalidNodeChange.next([4])

      expect(component.invalidIds).toEqual([4])
      expect(component.treeControl.isExpanded(nodeById(2))).toBe(true)
      expect(component.treeControl.isExpanded(nodeById(1))).toBe(true)
    })

    it('re-selects the closest surviving ancestor when the selected node is gone', () => {
      withTree()
      component.selectedNode = 99
      component.parentHierarchy = [4, 2]
      store.flatNodeMap.set(2, {})

      store.treeStructureChange.next(tree())

      expect(component.selectedNode).toBe(2)
      expect(editorStore.currentContent).toBe('do_modA')
      expect(store.currentSelectedNode).toBe(2)
      expect(editorStore.changeActiveCont.next).toHaveBeenCalledWith('do_modA')
    })

    it('keeps the selection when the selected node still exists', () => {
      withTree()
      component.selectedNode = 2
      store.flatNodeMap.set(2, {})

      store.treeStructureChange.next(tree())

      expect(component.selectedNode).toBe(2)
      expect(editorStore.changeActiveCont.next).not.toHaveBeenCalled()
    })

    it('only re-syncs the parent node id when the parent changed', () => {
      withTree()
      component.selectedNode = 99
      component.parentHierarchy = [2]
      store.flatNodeMap.set(2, {})
      store.currentParentNode = 42

      store.treeStructureChange.next(tree())

      expect(component.parentNodeId).toBe(42)
      expect(component.selectedNode).toBe(99)
      expect(editorStore.changeActiveCont.next).not.toHaveBeenCalled()
    })

    it('tracks the externally selected node', () => {
      component.ngOnInit()

      store.selectedNodeChange.next(5)
      expect(component.selectedNode).toBe(5)

      store.selectedNodeChange.next(0 as any)
      expect(component.selectedNode).toBe(5)
    })

    it('collapses the chrome on small screens', () => {
      component.ngOnInit()
      breakpoint$.next({ matches: true })

      expect(component.mediumScreen).toBe(true)
      expect(component.drawer).toBe(true)
      expect(component.leftarrow).toBe(false)
      expect(component.menubtn).toBe(false)
    })

    it('restores the chrome on large screens', () => {
      component.ngOnInit()
      breakpoint$.next({ matches: true })
      breakpoint$.next({ matches: false })

      expect(component.mediumScreen).toBe(false)
      expect(component.leftarrow).toBe(true)
      expect(component.menubtn).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('clears the loader', () => {
      component.ngOnDestroy()
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })

  describe('onNodeSelect', () => {
    it('publishes the newly selected node', () => {
      withTree()
      component.onNodeSelect(nodeById(2))

      expect(component.selectedNode).toBe(2)
      expect(editorStore.currentContent).toBe('do_modA')
      expect(store.currentSelectedNode).toBe(2)
      expect(editorStore.changeActiveCont.next).toHaveBeenCalledWith('do_modA')
    })

    it('ignores a re-select of the active node', () => {
      withTree()
      component.selectedNode = 2

      component.onNodeSelect(nodeById(2))

      expect(editorStore.changeActiveCont.next).not.toHaveBeenCalled()
    })
  })

  describe('closeSidenav', () => {
    it('emits the close event', () => {
      const spy = jest.fn()
      component.closeEvent.subscribe(spy)

      component.closeSidenav()

      expect(spy).toHaveBeenCalledWith(true)
    })
  })

  describe('drag lifecycle', () => {
    it('dragStart marks the dragged container', () => {
      withTree()
      component.dragStart(nodeById(2))

      expect(component.isDragging).toBe(true)
      expect(component.dragContainer).toBe(nodeById(2))
    })

    it('dragEnd backs the drag state up and resets it', () => {
      withTree()
      component.dragStart(nodeById(4))
      component.dropContainer = nodeById(3)
      component.draggingPosition = 'center'

      component.dragEnd()

      expect(component.backUpInformation).toEqual({
        isDragging: true,
        dropContainer: nodeById(3),
        dragContainer: nodeById(4),
        draggingPosition: 'center',
      })
      expect(component.isDragging).toBe(false)
      expect(component.dropContainer).toBeNull()
      expect(component.dragContainer).toBeNull()
      expect(component.draggingPosition).toBeNull()
    })

    it('dragHoverEnd clears the pending expand and the drop target', () => {
      withTree()
      component.dragStart(nodeById(4))
      component.dropContainer = nodeById(3)

      const event = { preventDefault: jest.fn() } as any
      component.dragHoverEnd(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(component.backUpInformation.dropContainer).toBe(nodeById(3))
      expect(component.dropContainer).toBeNull()
    })

    it('dragHoverEnd is inert when nothing is being dragged', () => {
      withTree()
      component.dropContainer = nodeById(3)

      component.dragHoverEnd({ preventDefault: jest.fn() } as any)

      expect(component.dropContainer).toBe(nodeById(3))
    })
  })

  describe('dragHover', () => {
    beforeEach(() => {
      withTree()
      component.dragStart(nodeById(4))
    })

    it('does nothing when no drag is in flight', () => {
      component.isDragging = false
      component.dragHover(nodeById(3), hoverEvent(50))

      expect(component.dropContainer).toBeNull()
    })

    it('expands the hovered node after the expand delay', () => {
      component.dragHover(nodeById(2), hoverEvent(50))
      expect(component.treeControl.isExpanded(nodeById(2))).toBe(false)

      jest.advanceTimersByTime(component.expandDelay)

      expect(component.treeControl.isExpanded(nodeById(2))).toBe(true)
    })

    it.each([
      [10, 'above'],
      [90, 'below'],
      [50, 'center'],
    ])('maps offsetY %i to the %s position', (offsetY, expected) => {
      component.dragHover(nodeById(3), hoverEvent(offsetY))
      expect(component.draggingPosition).toBe(expected)
    })

    it('blocks a drop onto a descendant of the dragged node', () => {
      component.dragStart(nodeById(2))
      component.dragHover(nodeById(4), hoverEvent(50))

      expect(component.isDropDisabled).toBe(true)
    })

    it('blocks a drop onto the dragged node itself', () => {
      component.dragStart(nodeById(3))
      component.dropContainer = nodeById(3)
      component.dragHover(nodeById(3), hoverEvent(50))

      expect(component.isDropDisabled).toBe(true)
    })

    it('asks the store whether an adjacent drop is allowed', () => {
      store.allowDrop.mockReturnValue(false)
      component.dragHover(nodeById(3), hoverEvent(10))

      expect(store.allowDrop).toHaveBeenCalledWith(nodeById(4), nodeById(1))
      expect(component.isDropDisabled).toBe(true)
    })

    it('blocks an adjacent drop on a root node that has no parent', () => {
      component.dragHover(nodeById(1), hoverEvent(10))

      expect(component.isDropDisabled).toBe(true)
    })

    it('asks the store whether a drop into a container is allowed', () => {
      store.allowDrop.mockReturnValue(true)
      component.dragHover(nodeById(3), hoverEvent(50))

      expect(store.allowDrop).toHaveBeenCalledWith(nodeById(4), nodeById(3))
      expect(component.isDropDisabled).toBe(false)
    })
  })

  describe('drop', () => {
    beforeEach(() => {
      withTree()
    })

    it('does nothing when the drop is disabled', () => {
      component.isDropDisabled = true
      component.drop()

      expect(component.isDragging).toBe(false)
      expect(store.dragAndDrop).not.toHaveBeenCalled()
    })

    it('moves the node into the hovered container', () => {
      component.isDropDisabled = false
      component.backUpInformation = {
        isDragging: true,
        dragContainer: nodeById(4),
        dropContainer: nodeById(3),
        draggingPosition: 'center',
      }

      component.drop()

      expect(store.dragAndDrop).toHaveBeenCalledWith(nodeById(4), nodeById(3), undefined, 'center')
    })

    it('moves the node next to its sibling for an adjacent drop', () => {
      component.isDropDisabled = false
      component.backUpInformation = {
        isDragging: true,
        dragContainer: nodeById(4),
        dropContainer: nodeById(3),
        draggingPosition: 'below',
      }

      component.drop()

      expect(store.dragAndDrop).toHaveBeenCalledWith(nodeById(4), nodeById(1), 3, 'below')
    })

    it('skips a drop onto itself', () => {
      component.isDropDisabled = false
      component.backUpInformation = {
        isDragging: true,
        dragContainer: nodeById(3),
        dropContainer: nodeById(3),
        draggingPosition: 'center',
      }

      component.drop()

      expect(store.dragAndDrop).not.toHaveBeenCalled()
    })
  })

  describe('preserveExpandedNodes', () => {
    it('snapshots only the expanded expandable nodes', () => {
      withTree()
      component.treeControl.expand(nodeById(2))

      component.preserveExpandedNodes()

      expect(Array.from(component.expandedNodes)).toEqual([2])
    })
  })

  describe('expandNodesById', () => {
    it('expands the given ids and their ancestors', () => {
      withTree()
      component.expandNodesById([4])

      expect(component.treeControl.isExpanded(nodeById(2))).toBe(true)
      expect(component.treeControl.isExpanded(nodeById(1))).toBe(true)
    })

    it('falls back to the preserved set when no ids are given', () => {
      withTree()
      component.expandedNodes = new Set([2])

      component.expandNodesById()

      expect(component.treeControl.isExpanded(nodeById(2))).toBe(true)
    })
  })

  describe('getParentNode', () => {
    it('returns null for a root-level node', () => {
      withTree()
      expect(component.getParentNode(nodeById(1))).toBeNull()
    })

    it('returns the nearest shallower node', () => {
      withTree()
      expect(component.getParentNode(nodeById(4))).toBe(nodeById(2))
      expect(component.getParentNode(nodeById(2))).toBe(nodeById(1))
    })

    it('returns null when no shallower node precedes it', () => {
      withTree()
      const orphan = { ...nodeById(2), level: 1 }
      expect(component.getParentNode(orphan as IContentTreeNode)).toBeNull()
    })
  })

  describe('delete', () => {
    it('opens the confirm dialog', () => {
      withTree()
      component.delete(nodeById(4))

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '500px',
        height: '175px',
        data: 'deleteTreeNode',
      })
    })

    it('deletes the node and records its ancestry when confirmed', () => {
      withTree()
      component.delete(nodeById(4))

      afterClosed$.next(true)

      expect(component.parentHierarchy).toEqual([2, 1])
      expect(store.deleteNode).toHaveBeenCalledWith(4)
      expect(lastNotify()).toBe(Notify.SUCCESS)
    })

    it('leaves the tree alone when cancelled', () => {
      withTree()
      component.delete(nodeById(4))

      afterClosed$.next(false)

      expect(store.deleteNode).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  describe('addChildOrSibling', () => {
    it('opens the picker seeded with the search filter and existing children', () => {
      withTree()
      component.addChildOrSibling(nodeById(1))

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '90vw',
        height: '90vh',
        data: {
          filter: { contentType: ['Module'] },
          selectedIds: ['do_modA', 'do_modB'],
        },
      })
    })

    it('adds the picked contents under the node', async () => {
      withTree()
      component.addChildOrSibling(nodeById(2))

      afterClosed$.next(['do_new'])
      await Promise.resolve()
      await Promise.resolve()

      expect(component.expandedNodes.has(2)).toBe(true)
      expect(store.addChildOrSibling).toHaveBeenCalledWith(['do_new'], nodeById(2), undefined, 'below')
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(lastNotify()).toBe(Notify.SUCCESS)
    })

    it('adds the picked contents beside the node when asked for a sibling', async () => {
      withTree()
      component.addChildOrSibling(nodeById(4), true)

      afterClosed$.next(['do_new'])
      await Promise.resolve()
      await Promise.resolve()

      expect(store.addChildOrSibling).toHaveBeenCalledWith(['do_new'], nodeById(2), 4, 'below')
    })

    it('reports a failure from the store', async () => {
      store.addChildOrSibling.mockResolvedValue(false)
      withTree()
      component.addChildOrSibling(nodeById(2))

      afterClosed$.next(['do_new'])
      await Promise.resolve()
      await Promise.resolve()

      expect(lastNotify()).toBe(Notify.FAIL)
    })

    it('does nothing when the picker is dismissed', async () => {
      withTree()
      component.addChildOrSibling(nodeById(2))

      afterClosed$.next([])
      await Promise.resolve()

      expect(store.addChildOrSibling).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  describe('createNewChildOrSibling', () => {
    it('creates a child under the node', async () => {
      withTree()
      await component.createNewChildOrSibling('Resource', nodeById(2))

      expect(component.expandedNodes.has(2)).toBe(true)
      expect(store.createChildOrSibling).toHaveBeenCalledWith('Resource', nodeById(2), undefined, 'below')
      expect(lastNotify()).toBe(Notify.SUCCESS)
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('creates a sibling beside the node', async () => {
      withTree()
      await component.createNewChildOrSibling('Resource', nodeById(4), true)

      expect(store.createChildOrSibling).toHaveBeenCalledWith('Resource', nodeById(2), 4, 'below')
    })

    it('reports a failure from the store', async () => {
      store.createChildOrSibling.mockResolvedValue(false)
      withTree()

      await component.createNewChildOrSibling('Resource', nodeById(2))

      expect(lastNotify()).toBe(Notify.FAIL)
    })
  })

  describe('takeAction', () => {
    beforeEach(() => withTree())

    it.each(['editMeta', 'editContent', 'preview'])('emits the %s action', action => {
      const spy = jest.fn()
      component.action.subscribe(spy)

      component.takeAction(action, nodeById(2))

      expect(component.selectedNode).toBe(2)
      expect(spy).toHaveBeenCalledWith({ type: action, identifier: 'do_modA' })
    })

    it('routes delete to the confirm dialog', () => {
      component.takeAction('delete', nodeById(4))
      expect(dialog.open).toHaveBeenCalled()
    })

    it('routes addChild to the picker', () => {
      const spy = jest.spyOn(component, 'addChildOrSibling')
      component.takeAction('addChild', nodeById(2))

      expect(spy).toHaveBeenCalledWith(nodeById(2))
    })

    it('routes addSibling to the picker', () => {
      const spy = jest.spyOn(component, 'addChildOrSibling')
      component.takeAction('addSibling', nodeById(4))

      expect(spy).toHaveBeenCalledWith(nodeById(4), true)
    })

    it('routes createChild to the store', () => {
      const spy = jest.spyOn(component, 'createNewChildOrSibling')
      component.takeAction('createChild', nodeById(2), 'Resource')

      expect(spy).toHaveBeenCalledWith('Resource', nodeById(2))
    })

    it('routes createSibling to the store', () => {
      const spy = jest.spyOn(component, 'createNewChildOrSibling')
      component.takeAction('createSibling', nodeById(4), 'Resource')

      expect(spy).toHaveBeenCalledWith('Resource', nodeById(4), true)
    })

    it('ignores an unknown action', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)

      component.takeAction('nope', nodeById(2))

      expect(spy).not.toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })
})
