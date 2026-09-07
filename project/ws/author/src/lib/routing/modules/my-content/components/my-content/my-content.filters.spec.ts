import { of } from 'rxjs'

import { MyContentComponent } from './my-content.component'

/**
 * Covers the filter, expiry and confirm-dialog paths the sibling
 * my-content.component.spec.ts leaves out.
 */
describe('MyContentComponent (filters + confirmations)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(true)) }
    const mocks: any = {
      myContSvc: {
        getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
        fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
        fetchContent: jest.fn().mockReturnValue(of({ result: { content: [], count: 0 } })),
        deleteOrUnpublishContent: jest.fn().mockReturnValue(of({})),
        restoreContent: jest.fn().mockReturnValue(of({})),
        createInAnotherLanguage: jest.fn().mockReturnValue(of('newId')),
        upPublishOrDraft: jest.fn().mockReturnValue(of({})),
        forwardBackward: jest.fn().mockReturnValue(of({})),
      },
      activatedRoute: { queryParams: of({ status: 'draft' }) },
      router: { navigate: jest.fn(), navigateByUrl: jest.fn() },
      loadService: { changeLoad: { next: jest.fn() } },
      accessService: {
        userId: 'user-1',
        hasRole: jest.fn().mockReturnValue(false),
        authoringConfig: { newDesign: true, allowRedo: true, allowRestore: true, allowExpiry: true },
      },
      snackBar: { openFromComponent: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue(dialogRef) },
      authInitService: { ordinals: { subTitles: [{ name: 'English', value: 'en' }] } },
      configService: {
        unMappedUser: { roles: ['content_creator'] },
        userRoles: new Set(['content_creator']),
        userProfile: { userId: 'user-1' },
      },
      editorService: {
        languageList: jest.fn().mockReturnValue(of([])),
        sourceNames: jest.fn().mockReturnValue(of([])),
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
      },
      filterStateService: {
        getFilters: jest.fn().mockReturnValue([]),
        getSourceName: jest.fn().mockReturnValue(''),
        getLanguage: jest.fn().mockReturnValue(''),
        setFilters: jest.fn(),
        setSourceName: jest.fn(),
        setLanguage: jest.fn(),
        clearFilters: jest.fn(),
      },
      cdr: { detectChanges: jest.fn() },
      ...overrides,
    }
    const component = new MyContentComponent(
      mocks.myContSvc,
      mocks.activatedRoute,
      mocks.router,
      mocks.loadService,
      mocks.accessService,
      mocks.snackBar,
      mocks.dialog,
      mocks.authInitService,
      mocks.configService,
      mocks.editorService,
      mocks.filterStateService,
      mocks.cdr,
    )
    component.pagination = { offset: 0, limit: 24 }
    return { component, mocks, dialogRef }
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('filterApplyEvent', () => {
    const seedMenu = (component: any) => {
      component.filters = []
      component.finalFilters = []
      component.filterMenuItems = [
        {
          type: 'contentType',
          content: [
            { displayName: 'Course', type: 'Course', checked: false },
            { displayName: 'Resource', type: 'Resource', checked: false },
          ],
        },
      ]
      component.dataSource = { data: [] }
    }

    it('adds a newly checked filter and persists it', () => {
      const { component, mocks } = build()
      seedMenu(component)
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })

      expect(component.filters).toHaveLength(1)
      expect(component.filterMenuItems[0].content[0].checked).toBe(true)
      expect(component.finalFilters).toEqual([{ key: 'contentType', value: ['Course'] }])
      expect(mocks.filterStateService.setFilters).toHaveBeenCalledWith(component.finalFilters)
      expect(component.pagination.offset).toBe(0)
      expect(component.sideNavBarOpened).toBe(false)
    })

    it('starts a new filter group per menu type', () => {
      const { component } = build()
      seedMenu(component)
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })
      component.filterApplyEvent({ displayName: 'Resource', type: 'Resource', checked: true })

      expect(component.filters).toHaveLength(2)
      expect(component.finalFilters).toHaveLength(2)
    })

    it('removes a filter that is unchecked', () => {
      const { component, mocks } = build()
      seedMenu(component)
      jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
      component.filters = [{ displayName: 'Course', type: 'Course' }] as any
      component.filterMenuItems[0].content[0].checked = true

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: false })

      expect(component.filters).toHaveLength(0)
      expect(component.filterMenuItems[0].content[0].checked).toBe(false)
      expect(mocks.filterStateService.setFilters).toHaveBeenCalled()
    })

    it('refreshes the tree data source and refetches without changing the filter set', () => {
      const { component } = build()
      seedMenu(component)
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.filterApplyEvent({ displayName: 'Course', type: 'Course', checked: true })

      expect(component.dataSource.data).toBe(component.filterMenuItems)
      expect(fetch).toHaveBeenCalledWith(false, false)
    })
  })

  describe('actionOnExpiry', () => {
    it('opens the expiry dialog with the content', () => {
      const { component, mocks } = build()
      component.actionOnExpiry({ identifier: 'do_1' } as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
      expect(mocks.dialog.open.mock.calls[0][1].data).toEqual({ identifier: 'do_1' })
    })

    it('drops the card once the user confirms an expiry change', () => {
      const { component } = build()
      component.cardContent = [{ identifier: 'do_1' }, { identifier: 'do_2' }] as any

      component.actionOnExpiry({ identifier: 'do_1' } as any)

      expect(component.cardContent.map((c: any) => c.identifier)).toEqual(['do_2'])
    })

    it('leaves the card alone when the dialog is dismissed', () => {
      const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(undefined)) }
      const { component } = build({ dialog: { open: jest.fn().mockReturnValue(dialogRef) } })
      component.cardContent = [{ identifier: 'do_1' }] as any

      component.actionOnExpiry({ identifier: 'do_1' } as any)

      expect(component.cardContent).toHaveLength(1)
    })

    it('tolerates an empty card list', () => {
      const { component } = build()
      component.cardContent = null as any
      expect(() => component.actionOnExpiry({ identifier: 'do_1' } as any)).not.toThrow()
    })
  })

  describe('confirmAction', () => {
    it('asks before deleting and then deletes', () => {
      const { component, mocks } = build()
      const spy = jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)

      component.confirmAction({ type: 'delete', data: { identifier: 'do_1' } })

      expect(mocks.dialog.open.mock.calls[0][1].data).toBe('delete')
      expect(spy).toHaveBeenCalled()
    })

    it('asks before restoring and then restores', () => {
      const { component, mocks } = build()
      const spy = jest.spyOn(component, 'restoreContent').mockImplementation(() => undefined)

      component.confirmAction({ type: 'restoreDeleted', data: { identifier: 'do_1' } })

      expect(mocks.dialog.open.mock.calls[0][1].data).toBe('restoreDeleted')
      expect(spy).toHaveBeenCalled()
    })

    it('asks before unpublishing and then unpublishes', () => {
      const { component, mocks } = build()
      const spy = jest.spyOn(component, 'unPublishOrDraft').mockImplementation(() => undefined)

      component.confirmAction({ type: 'unpublish', data: { identifier: 'do_1' } })

      expect(mocks.dialog.open.mock.calls[0][1].data).toBe('unpublish')
      expect(spy).toHaveBeenCalled()
    })

    it('uses the parent wording when retrieving a collection', () => {
      const { component, mocks } = build()
      jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)

      component.confirmAction({ type: 'moveToDraft', data: { mimeType: 'application/vnd.ekstep.content-collection' } })

      expect(mocks.dialog.open.mock.calls[0][1].data).toBe('retrieveParent')
    })

    it('uses the child wording when retrieving a plain resource', () => {
      const { component, mocks } = build()
      jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)

      component.confirmAction({ type: 'moveToInReview', data: { mimeType: 'application/pdf' } })

      expect(mocks.dialog.open.mock.calls[0][1].data).toBe('retrieveChild')
    })

    it('unpublishes rather than forwards when moving an unpublished item to draft', () => {
      const { component } = build()
      const unpublish = jest.spyOn(component, 'unPublishOrDraft').mockImplementation(() => undefined)
      const forward = jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)

      component.confirmAction({ type: 'moveToDraft', data: { mimeType: 'application/pdf', status: 'Unpublished' } })

      expect(unpublish).toHaveBeenCalled()
      expect(forward).not.toHaveBeenCalled()
    })

    it('forwards directly for any other action without asking', () => {
      const { component, mocks } = build()
      const forward = jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)

      component.confirmAction({ type: 'sendForReview', data: { identifier: 'do_1' } })

      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(forward).toHaveBeenCalled()
    })

    it('does nothing when the confirmation is dismissed', () => {
      const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(false)) }
      const { component } = build({ dialog: { open: jest.fn().mockReturnValue(dialogRef) } })
      const spy = jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)

      component.confirmAction({ type: 'delete', data: { identifier: 'do_1' } })

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('setCurrentSourceName', () => {
    it('stores the source name and refetches', () => {
      const { component, mocks } = build()
      const fetch = jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)

      component.setCurrentSourceName('SourceA')

      expect(component.selectedSourceName).toBe('SourceA')
      expect(mocks.filterStateService.setSourceName).toHaveBeenCalledWith('SourceA')
      expect(fetch).toHaveBeenCalledWith(false)
    })
  })
})
