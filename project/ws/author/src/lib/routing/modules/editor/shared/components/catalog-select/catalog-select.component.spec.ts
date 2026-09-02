import { of } from 'rxjs'
import { CatalogSelectComponent } from './catalog-select.component'

describe('CatalogSelectComponent', () => {
  let uploadSvc: any
  let dialogRef: any

  /** A three-level catalog: Common > Health > Nutrition > Vitamins. */
  const catalog = () => ({
    Common: {
      child: [
        {
          name: 'Health',
          path: 'Health',
          identifier: 'id_health',
          nodeId: 'n_health',
          child: [
            {
              name: 'Nutrition',
              path: 'Health>Nutrition',
              identifier: 'id_nutrition',
              nodeId: 'n_nutrition',
              child: [
                {
                  name: 'Vitamins',
                  path: 'Health>Nutrition>Vitamins',
                  identifier: 'id_vitamins',
                  nodeId: 'n_vitamins',
                  child: [],
                },
              ],
            },
          ],
        },
        { name: 'Finance', path: 'Finance', identifier: 'id_finance', nodeId: 'n_finance', child: [] },
      ],
    },
  })

  const build = (selected: string[] = []) => {
    const component = new CatalogSelectComponent(uploadSvc, dialogRef, selected as any)
    return component
  }

  beforeEach(() => {
    uploadSvc = { fetchCatalog: jest.fn().mockReturnValue(of(catalog())) }
    dialogRef = { close: jest.fn() }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  it('adopts the already-selected paths from the dialog data', () => {
    const component = build(['Common', 'Health'])
    expect(component.parentPaths).toEqual(['Common', 'Health'])
  })

  describe('ngOnInit', () => {
    it('loads the catalog and marks the fetch done', () => {
      const component = build()
      component.ngOnInit()
      expect(uploadSvc.fetchCatalog).toHaveBeenCalled()
      expect(component.status).toBe('done')
      expect(component.dataSource.data.length).toBe(2)
    })

    it('flattens every catalog level into the lookup list', () => {
      const component = build()
      component.ngOnInit()
      const names = component.flatCatalogData.map(c => c.name)
      expect(names).toEqual(expect.arrayContaining(['Health', 'Nutrition', 'Vitamins', 'Finance']))
    })

    it('preselects the incoming paths, ignoring the Common root', () => {
      const component = build(['Common', 'Health'])
      component.ngOnInit()
      const selectedPaths = component.checklistSelection.selected.map(n => n.path)
      expect(selectedPaths).toContain('Health')
      expect(component.selectedCatalogPaths).toEqual(['Common', 'Health'])
    })

    it('selects nothing when the incoming paths do not match the catalog', () => {
      const component = build(['Nowhere'])
      component.ngOnInit()
      expect(component.checklistSelection.selected.length).toBe(0)
    })
  })

  describe('transformCatalogData', () => {
    it('nests children and grandchildren under each root', () => {
      const component = build()
      component.catalogData = catalog().Common.child as any
      component.transformCatalogData()
      expect(component.treeData).toEqual({
        Health: { Nutrition: { Vitamins: null } },
        Finance: null,
      })
    })

    it('maps a childless root to null', () => {
      const component = build()
      component.catalogData = [{ name: 'Solo', path: 'Solo', child: [] }] as any
      component.transformCatalogData()
      expect(component.treeData).toEqual({ Solo: null })
    })

    it('getChildData flattens a leaf list', () => {
      const component = build()
      const result = component.getChildData([
        { name: 'A', path: 'A', child: [] },
        { name: 'B', path: 'B', child: [] },
      ] as any)
      expect(result).toEqual({ A: null, B: null })
      expect(component.flatCatalogData.map(c => c.name)).toEqual(['A', 'B'])
    })
  })

  describe('buildFileTree', () => {
    it('builds nested nodes from a nested object', () => {
      const component = build()
      const tree = component.buildFileTree({ Health: { Nutrition: null } }, 0)
      expect(tree.length).toBe(1)
      expect(tree[0].name).toBe('Health')
      expect(tree[0].children[0].name).toBe('Nutrition')
    })

    it('uses a primitive value as the node name', () => {
      const component = build()
      const tree = component.buildFileTree({ key: 'Actual Name' }, 0)
      expect(tree[0].name).toBe('Actual Name')
    })

    it('leaves a null value as a childless node', () => {
      const component = build()
      const tree = component.buildFileTree({ Leaf: null }, 0)
      expect(tree[0].name).toBe('Leaf')
      expect(tree[0].children).toBeUndefined()
    })
  })

  describe('tree predicates', () => {
    it('reads the level, expandability and children off a node', () => {
      const component = build()
      expect(component.getLevel({ level: 2 } as any)).toBe(2)
      expect(component.isExpandable({ expandable: true } as any)).toBe(true)
      expect(component.getChildren({ children: [{ name: 'x' }] } as any)).toEqual([{ name: 'x' }])
    })

    it('hasChild follows the expandable flag', () => {
      const component = build()
      expect(component.hasChild(0, { expandable: true } as any)).toBe(true)
      expect(component.hasChild(0, { expandable: false } as any)).toBe(false)
    })

    it('hasNoContent detects a blank node', () => {
      const component = build()
      expect(component.hasNoContent(0, { name: '' } as any)).toBe(true)
      expect(component.hasNoContent(0, { name: 'Health' } as any)).toBe(false)
    })
  })

  describe('transformer', () => {
    it('copies the catalog metadata onto the flat node', () => {
      const component = build()
      component.catalogData = catalog().Common.child as any
      component.transformCatalogData()
      const flat = component.transformer({ name: 'Health', children: [] } as any, 1)
      expect(flat.path).toBe('Health')
      expect(flat.identifier).toBe('id_health')
      expect(flat.nodeId).toBe('n_health')
      expect(flat.level).toBe(1)
      expect(flat.expandable).toBe(true)
      expect(flat.checkable).toBe(true)
    })

    it('marks the Common root as not checkable', () => {
      const component = build()
      const flat = component.transformer({ name: 'Common' } as any, 0)
      expect(flat.checkable).toBe(false)
      expect(flat.expandable).toBe(false)
    })

    it('reuses the flat node already mapped for a nested node', () => {
      const component = build()
      const nested = { name: 'Health', children: [] } as any
      const first = component.transformer(nested, 0)
      const second = component.transformer(nested, 1)
      expect(second).toBe(first)
      expect(second.level).toBe(1)
    })
  })

  describe('selection', () => {
    /** Builds a component with a small tree already flattened into the tree control. */
    const withTree = () => {
      const component = build()
      component.ngOnInit()
      const nodes = component.treeControl.dataNodes
      return { component, nodes }
    }

    it('descendantsAllSelected is true once every child is selected', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      const descendants = component.treeControl.getDescendants(health)
      component.checklistSelection.select(...descendants)
      expect(component.descendantsAllSelected(health)).toBe(true)
    })

    it('descendantsAllSelected is false while a child is unselected', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      expect(component.descendantsAllSelected(health)).toBe(false)
    })

    it('descendantsPartiallySelected is true for a mixed selection', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      const descendants = component.treeControl.getDescendants(health)
      component.checklistSelection.select(descendants[0])
      expect(component.descendantsPartiallySelected(health)).toBe(true)
    })

    it('descendantsPartiallySelected is false when nothing is selected', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      expect(component.descendantsPartiallySelected(health)).toBe(false)
    })

    it('todoItemSelectionToggle selects the node and its descendants', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      component.todoItemSelectionToggle(health)
      expect(component.checklistSelection.isSelected(health)).toBe(true)
      component.treeControl.getDescendants(health).forEach(d => {
        expect(component.checklistSelection.isSelected(d)).toBe(true)
      })
    })

    it('todoItemSelectionToggle deselects the whole subtree on a second toggle', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      component.todoItemSelectionToggle(health)
      component.todoItemSelectionToggle(health)
      component.treeControl.getDescendants(health).forEach(d => {
        expect(component.checklistSelection.isSelected(d)).toBe(false)
      })
    })

    it('todoLeafItemSelectionToggle toggles a single leaf', () => {
      const { component, nodes } = withTree()
      const finance = nodes.find(n => n.name === 'Finance')!
      component.todoLeafItemSelectionToggle(finance)
      expect(component.checklistSelection.isSelected(finance)).toBe(true)
    })

    it('getParentNode returns null at the root level', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      expect(component.getParentNode(health)).toBeNull()
    })

    it('getParentNode finds the enclosing branch', () => {
      const { component, nodes } = withTree()
      const nutrition = nodes.find(n => n.name === 'Nutrition')!
      expect(component.getParentNode(nutrition)!.name).toBe('Health')
    })

    it('getParentNode returns null when no shallower node precedes it', () => {
      const { component } = withTree()
      const orphan = { level: 1, name: 'Orphan' } as any
      component.treeControl.dataNodes = [orphan]
      expect(component.getParentNode(orphan)).toBeNull()
    })

    it('checkRootNodeSelection deselects a branch whose children are all clear', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      component.checklistSelection.select(health)
      component.selectedCatalogPaths = ['Health']
      component.checkRootNodeSelection(health)
      expect(component.checklistSelection.isSelected(health)).toBe(false)
      expect(component.selectedCatalogPaths).not.toContain('Health')
    })

    it('checkRootNodeSelection keeps a branch selected while a child is selected', () => {
      const { component, nodes } = withTree()
      const health = nodes.find(n => n.name === 'Health')!
      const nutrition = nodes.find(n => n.name === 'Nutrition')!
      component.checklistSelection.select(nutrition)
      component.checkRootNodeSelection(health)
      expect(component.checklistSelection.isSelected(health)).toBe(true)
      expect(component.selectedCatalogPaths).toContain('Health')
    })
  })

  describe('addNodePath', () => {
    it('adds a path that is not selected yet', () => {
      const component = build()
      component.addNodePath({ path: 'Health' } as any)
      expect(component.selectedCatalogPaths).toEqual(['Health'])
    })

    it('removes a path that is already selected', () => {
      const component = build()
      component.selectedCatalogPaths = ['Health', 'Finance']
      component.addNodePath({ path: 'Health' } as any)
      expect(component.selectedCatalogPaths).toEqual(['Finance'])
    })

    it('removes a parent path the same way', () => {
      const component = build()
      component.selectedCatalogPaths = ['Health']
      component.addNodePath({ path: 'Health' } as any, true)
      expect(component.selectedCatalogPaths).toEqual([])
    })
  })

  describe('onClose', () => {
    it('returns the selected paths under the Common root', () => {
      const component = build()
      component.ngOnInit()
      const health = component.treeControl.dataNodes.find(n => n.name === 'Health')!
      component.checklistSelection.select(health)
      component.onClose()
      expect(dialogRef.close).toHaveBeenCalledWith(['Common', 'Health'])
    })

    it('returns an empty list when the author cleared every selection', () => {
      const component = build(['Common', 'Health'])
      component.ngOnInit()
      component.checklistSelection.clear()
      component.onClose()
      expect(dialogRef.close).toHaveBeenCalledWith([])
    })

    it('returns the incoming paths when the catalog never loaded', () => {
      const component = build(['Common', 'Health'])
      component.onClose()
      expect(dialogRef.close).toHaveBeenCalledWith(['Common', 'Health'])
    })

    it('skips selected nodes that carry no path', () => {
      const component = build()
      component.ngOnInit()
      component.checklistSelection.select({ path: '', name: 'Common' } as any)
      component.onClose()
      expect(dialogRef.close).toHaveBeenCalledWith(['Common'])
    })
  })
})
