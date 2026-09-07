import { of, throwError } from 'rxjs'

import { AllContentComponent } from './all-content.component'

/**
 * Wave 18 — the shared confirmation and failure handling that AllContentComponent
 * inherits from MyContentListBaseComponent: `confirmAction`'s message mapping and
 * the 409 branch of every content action.
 */
describe('AllContentComponent (confirmations and failures)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const dialogRef = { afterClosed: jest.fn().mockReturnValue(of(true)) }
    const mocks: any = {
      myContSvc: {
        getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
        fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
        fetchContent: jest.fn().mockReturnValue(of({ result: { content: [], count: 0 } })),
        deleteContent: jest.fn().mockReturnValue(of({})),
        restoreContent: jest.fn().mockReturnValue(of({})),
        createInAnotherLanguage: jest.fn().mockReturnValue(of('newId')),
        upPublishOrDraft: jest.fn().mockReturnValue(of({})),
        forwardBackward: jest.fn().mockReturnValue(of({})),
      },
      activatedRoute: {
        snapshot: { data: { courseTaken: { data: {} }, departmentData: null } },
        queryParams: of({ status: 'published' }),
      },
      router: { navigate: jest.fn(), navigateByUrl: jest.fn() },
      loadService: { changeLoad: { next: jest.fn() } },
      accessService: {
        userId: 'user-1',
        hasRole: jest.fn().mockReturnValue(false),
        authoringConfig: { newDesign: true },
      },
      snackBar: { openFromComponent: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue(dialogRef) },
      authInitService: { ordinals: { subTitles: [{ name: 'English', value: 'en' }] }, authAdditionalConfig: { menus: {} } },
      valueSvc: { isLtMedium$: of(false) },
      configService: { userRoles: new Set(['content_creator']), userProfile: { userId: 'user-1' } },
      ...overrides,
    }
    const component = new AllContentComponent(
      mocks.myContSvc,
      mocks.activatedRoute,
      mocks.router,
      mocks.loadService,
      mocks.accessService,
      mocks.snackBar,
      mocks.dialog,
      mocks.authInitService,
      mocks.valueSvc,
      mocks.configService,
    )
    component.pagination = { offset: 0, limit: 24 }
    return { component, mocks, dialogRef }
  }

  const content = (over: any = {}) => ({ identifier: 'do_1', status: 'Live', mimeType: 'application/pdf', ...over })

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  // --------------------------------------------------------- confirmAction --

  describe('confirmAction', () => {
    const messageFor = (event: any) => {
      const { component, mocks } = build()
      jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)
      jest.spyOn(component, 'restoreContent').mockImplementation(() => undefined)
      jest.spyOn(component, 'unPublishOrDraft').mockImplementation(() => undefined)
      jest.spyOn(component, 'forwardBackward').mockImplementation(() => undefined)
      component.confirmAction(event)
      return { component, mocks }
    }

    it('asks to confirm a delete and then deletes', () => {
      const { component, mocks } = messageFor({ type: 'delete', data: content() })
      expect(mocks.dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'delete' }))
      expect(component.deleteContent).toHaveBeenCalled()
    })

    it('asks to confirm a restore and then restores', () => {
      const { component, mocks } = messageFor({ type: 'restoreDeleted', data: content() })
      expect(mocks.dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'restoreDeleted' }))
      expect(component.restoreContent).toHaveBeenCalled()
    })

    it('asks to confirm an unpublish and then unpublishes', () => {
      const { component, mocks } = messageFor({ type: 'unpublish', data: content() })
      expect(mocks.dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'unpublish' }))
      expect(component.unPublishOrDraft).toHaveBeenCalled()
    })

    it('warns that a whole collection is being retrieved', () => {
      const { mocks } = messageFor({
        type: 'moveToDraft',
        data: content({ mimeType: 'application/vnd.ekstep.content-collection' }),
      })
      expect(mocks.dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'retrieveParent' }))
    })

    it('warns that a single resource is being retrieved', () => {
      const { mocks } = messageFor({ type: 'moveToInReview', data: content() })
      expect(mocks.dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: 'retrieveChild' }))
    })

    it('unpublishes an unpublished course that is moved back to draft', () => {
      const { component } = messageFor({ type: 'moveToDraft', data: content({ status: 'Unpublished' }) })
      expect(component.unPublishOrDraft).toHaveBeenCalled()
    })

    it('collects a comment for any other retrieval', () => {
      const { component } = messageFor({ type: 'moveToInReview', data: content({ status: 'Review' }) })
      expect(component.forwardBackward).toHaveBeenCalled()
    })

    it('goes straight to the comment dialog for an unrecognised action', () => {
      const { component, mocks } = messageFor({ type: 'somethingElse', data: content() })
      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(component.forwardBackward).toHaveBeenCalled()
    })

    it('does nothing when the confirmation is declined', () => {
      const { component, dialogRef } = build()
      dialogRef.afterClosed.mockReturnValue(of(false))
      jest.spyOn(component, 'deleteContent').mockImplementation(() => undefined)
      component.confirmAction({ type: 'delete', data: content() })
      expect(component.deleteContent).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------- failure handling --

  describe('failure handling', () => {
    const conflict = () => throwError(() => ({ status: 409, error: {} }))
    const serverError = () => throwError(() => ({ status: 500 }))

    it('shows the error parser when a delete conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.deleteContent.mockReturnValue(conflict())
      component.deleteContent(content() as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict delete failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.deleteContent.mockReturnValue(serverError())
      component.deleteContent(content() as any)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('shows the error parser when a restore conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.restoreContent.mockReturnValue(conflict())
      component.restoreContent(content() as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict restore failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.restoreContent.mockReturnValue(serverError())
      component.restoreContent(content() as any)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('shows the error parser when a language copy conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.createInAnotherLanguage.mockReturnValue(conflict())
      component.createContent(content({ locale: 'en' }) as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict language copy failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.createInAnotherLanguage.mockReturnValue(serverError())
      component.createContent(content({ locale: 'en' }) as any)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('shows the error parser when an unpublish conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.upPublishOrDraft.mockReturnValue(conflict())
      component.unPublishOrDraft(content() as any)
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict unpublish failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.upPublishOrDraft.mockReturnValue(serverError())
      component.unPublishOrDraft(content() as any)
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('shows the error parser when a workflow move conflicts', () => {
      const { component, mocks } = build()
      mocks.myContSvc.forwardBackward.mockReturnValue(conflict())
      component.finalCall({ controls: { comments: { value: 'c' } } } as any, {
        type: 'moveToDraft',
        data: content(),
      })
      expect(mocks.dialog.open).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict workflow move failure', () => {
      const { component, mocks } = build()
      mocks.myContSvc.forwardBackward.mockReturnValue(serverError())
      component.finalCall({ controls: { comments: { value: 'c' } } } as any, {
        type: 'moveToDraft',
        data: content(),
      })
      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
    })
  })
})
