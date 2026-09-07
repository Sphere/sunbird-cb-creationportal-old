import { CardTableComponent } from './card-table.component'

describe('CardTableComponent', () => {
  let component: CardTableComponent

  const build = (widgetData: any = {}) => {
    const c = new CardTableComponent()
    c.widgetData = { columns: [], ...widgetData } as any
    return c
  }

  beforeEach(() => {
    component = build()
  })

  it('is created with a unique host id and emitters', () => {
    expect(component).toBeTruthy()
    expect(component.id).toMatch(/^ws-card_/)
    expect(component.clicked).toBeTruthy()
    expect(component.actionsClick).toBeTruthy()
    expect(component.display).toBe('table')
  })

  describe('ngOnInit', () => {
    it('takes the columns and wires the data source', () => {
      const c = build({ columns: [{ key: 'name' }] })
      c.data = [{ name: 'a' }] as any
      c.paginator = {} as any

      c.ngOnInit()

      expect(c.displayedColumns).toEqual([{ key: 'name' }])
      expect(c.dataSource.data).toEqual([{ name: 'a' }])
      expect(c.dataSource.paginator).toBe(c.paginator)
    })

    it('defaults columns to an empty list', () => {
      const c = build({ columns: undefined })
      c.ngOnInit()
      expect(c.displayedColumns).toEqual([])
    })
  })

  describe('ngOnChanges', () => {
    it('resets the data source from the change payload', () => {
      component.ngOnChanges({ data: { currentValue: [{ x: 1 }] } })
      expect(component.dataSource.data).toEqual([{ x: 1 }])
    })
  })

  describe('updatedisplay', () => {
    it('toggles between table and card', () => {
      component.updatedisplay()
      expect(component.display).toBe('card')
      component.updatedisplay()
      expect(component.display).toBe('table')
    })
  })

  describe('image fallbacks', () => {
    it('swaps to the default logo', () => {
      const ev: any = { target: { src: '' } }
      component.changeToDefaultImg(ev)
      expect(ev.target.src).toContain('default.png')
    })

    it('swaps to the default source logo', () => {
      const ev: any = { target: { src: '' } }
      component.changeToDefaultSourceImg(ev)
      expect(ev.target.src).toContain('sourcenew.png')
    })
  })

  describe('getRatingIcon', () => {
    it('returns a full star below the rating floor', () => {
      expect(component.getRatingIcon({ averageRating: 4.5 }, 3)).toBe('star')
    })

    it('returns a half star at the fractional boundary', () => {
      expect(component.getRatingIcon({ averageRating: 4.5 }, 5)).toBe('star_half')
    })

    it('returns an empty star above the rating', () => {
      expect(component.getRatingIcon({ averageRating: 4 }, 5)).toBe('star_border')
    })

    it('returns an empty star without a rating', () => {
      expect(component.getRatingIcon({}, 1)).toBe('star_border')
      expect(component.getRatingIcon(null, 1)).toBe('star_border')
    })
  })

  describe('applyFilter', () => {
    it('lowercases the filter value (the source keeps surrounding spaces)', () => {
      component.applyFilter({ value: '  HeLLo  ' })
      expect(component.dataSource.filter).toBe('  hello  ')
    })

    it('clears the filter when empty', () => {
      component.applyFilter({ value: '' })
      expect(component.dataSource.filter).toBe('')
      component.applyFilter(null)
      expect(component.dataSource.filter).toBe('')
    })
  })

  describe('buttonClick / takeAction', () => {
    it('emits when the action is enabled', () => {
      const c = build({ actions: [{ name: 'go', disabled: false }] })
      const spy = jest.spyOn(c.actionsClick!, 'emit')

      c.buttonClick('go', { id: 1 })

      expect(spy).toHaveBeenCalledWith({ action: 'go', row: { id: 1 } })
    })

    it('does not emit a disabled action', () => {
      const c = build({ actions: [{ name: 'go', disabled: true }] })
      const spy = jest.spyOn(c.actionsClick!, 'emit')

      c.buttonClick('go', { id: 1 })

      expect(spy).not.toHaveBeenCalled()
    })

    it('takeAction emits a typed payload', () => {
      const c = build({ actions: [{ name: 'edit', disabled: false }] })
      const spy = jest.spyOn(c.actionsClick!, 'emit')

      c.takeAction('edit', { id: 2 })

      expect(spy).toHaveBeenCalledWith({ type: 'edit', data: { id: 2 } })
    })
  })

  describe('getFinalColumns', () => {
    it('builds the column list with select, hash, actions and menu', () => {
      const c = build({
        columns: [{ key: 'name' }, { key: 'status' }],
        needCheckBox: true,
        needHash: true,
        actions: [{ name: 'a' }],
        actionsMenu: { menus: [{ x: 1 }] },
      })

      expect(c.getFinalColumns()).toEqual(['SR', 'select', 'name', 'status', 'Actions', 'ActionsMenu'])
    })

    it('returns plain columns without extras', () => {
      const c = build({ columns: [{ key: 'name' }] })
      expect(c.getFinalColumns()).toEqual(['name'])
    })
  })

  describe('getCardHeadRows', () => {
    it('returns the first column key plus the actions menu', () => {
      const c = build({ columns: [{ key: 'name' }, { key: 'status' }] })
      expect(c.getCardHeadRows()).toEqual(['name', 'ActionsMenu'])
      expect(c.cardTableColumns).toEqual([{ key: 'name' }])
    })

    it('returns an empty list when there are no columns', () => {
      const c = build({ columns: [] })
      expect(c.getCardHeadRows()).toEqual([])
    })
  })

  describe('selection', () => {
    it('reports all selected when every row is chosen', () => {
      component.dataSource.data = [{ a: 1 }, { a: 2 }]
      component.dataSource.data.forEach(r => component.selection.select(r))
      expect(component.isAllSelected()).toBe(true)
    })

    it('masterToggle selects then clears everything', () => {
      component.dataSource.data = [{ a: 1 }, { a: 2 }]

      component.masterToggle()
      expect(component.selection.selected.length).toBe(2)

      component.masterToggle()
      expect(component.selection.selected.length).toBe(0)
    })

    it('checkboxLabel describes the header and rows', () => {
      component.dataSource.data = [{ position: 0 }]
      expect(component.checkboxLabel()).toContain('all')
      expect(component.checkboxLabel({ position: 0 })).toBe('select row 1')
    })
  })

  describe('filterList', () => {
    it('projects a single key out of the list', () => {
      expect(component.filterList([{ k: 1 }, { k: 2 }], 'k')).toEqual([1, 2])
    })
  })

  describe('hasRole', () => {
    it('matches a role present in the user roles', () => {
      component.userRoles = new Set(['editor'])
      expect(component.hasRole(['admin', 'editor'])).toBe(true)
    })

    it('returns false with no matching role', () => {
      component.userRoles = new Set(['viewer'])
      expect(component.hasRole(['admin'])).toBe(false)
    })

    it('tolerates a null role set', () => {
      component.userRoles = null
      expect(component.hasRole(['admin'])).toBe(false)
    })
  })

  describe('hasAccess', () => {
    it('grants access to editors/admins outright', () => {
      component.userRoles = new Set(['admin'])
      expect(component.hasAccess({ status: 'Draft' } as any)).toBe(true)
    })

    it('grants a draft creator access', () => {
      component.userRoles = new Set()
      component.userId = 'u1'
      const meta: any = { status: 'Draft', creatorContacts: [{ id: 'u1' }] }
      expect(component.hasAccess(meta)).toBe(true)
    })

    it('denies a draft when the user is not a creator', () => {
      component.userRoles = new Set()
      component.userId = 'u2'
      const meta: any = { status: 'Draft', creatorContacts: [{ id: 'u1' }] }
      expect(component.hasAccess(meta)).toBe(false)
    })

    it('lets a matching reviewer access an in-review item', () => {
      component.userRoles = new Set(['content_reviewer'])
      component.userId = 'r1'
      const meta: any = { status: 'InReview', trackContacts: [{ id: 'r1' }] }
      expect(component.hasAccess(meta)).toBe(true)
    })

    it('lets a matching publisher access a reviewed item', () => {
      component.userRoles = new Set(['content_publisher'])
      component.userId = 'p1'
      const meta: any = { status: 'Reviewed', publisherDetails: [{ id: 'p1' }] }
      expect(component.hasAccess(meta)).toBe(true)
    })

    it('grants preview access to public content', () => {
      component.userRoles = new Set()
      const meta: any = { status: 'Unknown', visibility: 'Public' }
      expect(component.hasAccess(meta, true)).toBe(true)
    })
  })

  describe('showMenuItem', () => {
    beforeEach(() => {
      component.userRoles = new Set(['editor'])
      component.userId = 'u1'
    })

    it('never shows a menu for a Resource row', () => {
      expect(component.showMenuItem('edit', { contentType: 'Resource', status: 'Draft' })).toBe(false)
    })

    it('shows edit for a draft the user can access', () => {
      expect(component.showMenuItem('edit', { status: 'Draft' })).toBe(true)
    })

    it('hides edit when authoring is disabled', () => {
      expect(component.showMenuItem('edit', { status: 'Draft', authoringDisabled: true })).toBe(false)
    })

    it('shows moveToDraft from an in-review status', () => {
      expect(component.showMenuItem('moveToDraft', { status: 'InReview' })).toBe(true)
    })

    it('shows publish for a reviewed row', () => {
      expect(component.showMenuItem('publish', { status: 'Reviewed' })).toBe(true)
    })

    it('shows unpublish for a live row', () => {
      expect(component.showMenuItem('unpublish', { status: 'Live' })).toBe(true)
    })

    it('shows the lang action', () => {
      expect(component.showMenuItem('lang', { status: 'Anything' })).toBe(true)
    })
  })

  describe('lifecycle no-ops', () => {
    it('does not throw on destroy or after view init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
      expect(() => component.ngAfterViewInit()).not.toThrow()
    })
  })
})
