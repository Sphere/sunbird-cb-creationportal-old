import { Subject, of, throwError } from 'rxjs'

import { WebModuleEditorComponent } from './web-module-editor.component'
import { Page, ModuleObj, WebModuleData } from '../web-module.class'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Wave 18 — the page-management side of WebModuleEditorComponent: `drop`,
 * `onDelete`, `action`'s delete/close branches,
 * `getMessage` / `getAction` and the content-load chain.
 */
describe('WebModuleEditorComponent (page management)', () => {
  let component: WebModuleEditorComponent
  let dialog: any
  let snackBar: any
  let router: any
  let activateRoute: any
  let breakpointObserver: any
  let loaderService: any
  let metaContentService: any
  let uploadService: any
  let editorService: any
  let authInitService: any
  let accessService: any
  let notificationSvc: any
  let afterClosed: Subject<any>
  let changeActiveCont: Subject<string>

  const currentId = 'lex-1'

  /** Seeds the editor with a three-page module. */
  const seedPages = (count = 3) => {
    const data = new WebModuleData({
      pageJson: Array.from({ length: count }, (_v, i) => new ModuleObj({ URL: `/assets/index${i}.html`, title: `p${i}` })),
      pages: Array.from({ length: count }, (_v, i) => new Page({ fileIndex: i, body: `<p>page ${i}</p>` })),
    })
    component.userData[currentId] = data
    component.currentId = currentId
    component.selectedPage = 0
    return data
  }

  beforeEach(() => {
    afterClosed = new Subject<any>()
    changeActiveCont = new Subject<string>()
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    snackBar = { openFromComponent: jest.fn() }
    router = { url: '/author/web/lex-1/page', navigateByUrl: jest.fn() }
    activateRoute = { parent: { parent: {} } }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont,
      upDatedContent: {},
      originalContent: { [currentId]: { status: 'Draft', creatorContacts: [{ id: 'u1' }] } },
      getUpdatedMeta: jest.fn().mockReturnValue({ locale: 'en', status: 'Draft', mimeType: 'application/web-module' }),
      getOriginalMeta: jest.fn().mockReturnValue({ status: 'Draft' }),
      isValid: jest.fn().mockReturnValue(true),
      resetOriginalMeta: jest.fn(),
      createInAnotherLanguage: jest.fn().mockReturnValue(of({ identifier: 'lex-2' })),
    }
    uploadService = { encodedUpload: jest.fn().mockReturnValue(of({ code: 'ok' })) }
    editorService = {
      getDataForContent: jest
        .fn()
        .mockReturnValue(of([{ content: { children: [], artifactUrl: 'https://x/y/z.json', identifier: currentId } }])),
      updateContent: jest.fn().mockReturnValue(of({})),
      deleteContent: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({})),
    }
    authInitService = { ordinals: { subTitles: [{ srclang: 'en' }, { srclang: 'hi' }] } }
    accessService = {
      rootOrg: 'client1',
      userId: 'u1',
      authoringConfig: { isMultiStepFlow: false },
      hasRole: jest.fn().mockReturnValue(true),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({})) }

    component = new WebModuleEditorComponent(
      dialog,
      snackBar,
      router,
      activateRoute,
      breakpointObserver,
      loaderService,
      metaContentService,
      uploadService,
      editorService,
      authInitService,
      accessService,
      notificationSvc,
    )
  })

  afterEach(() => jest.clearAllMocks())

  // ------------------------------------------------------------------- drop --

  describe('drop', () => {
    it('reorders the pages', () => {
      const data = seedPages()
      component.drop({ previousIndex: 0, currentIndex: 2 } as any)
      expect(data.pages.map(p => p.fileIndex)).toEqual([1, 2, 0])
      expect(component.changedContent).toBe(true)
    })

    it('follows the page that was dragged', () => {
      seedPages()
      component.selectedPage = 0
      component.drop({ previousIndex: 0, currentIndex: 2 } as any)
      expect(component.selectedPage).toBe(2)
    })

    it('follows the page that was displaced', () => {
      seedPages()
      component.selectedPage = 2
      component.drop({ previousIndex: 0, currentIndex: 2 } as any)
      expect(component.selectedPage).toBe(0)
    })

    it('leaves the selection alone for an unrelated move', () => {
      seedPages(4)
      component.selectedPage = 3
      component.drop({ previousIndex: 0, currentIndex: 1 } as any)
      expect(component.selectedPage).toBe(3)
    })
  })

  // --------------------------------------------------------------- onDelete --

  describe('onDelete', () => {
    it('does nothing when the confirmation is declined', () => {
      const data = seedPages()
      component.onDelete(1, { stopPropagation: jest.fn() } as any)
      afterClosed.next(false)
      expect(data.pages).toHaveLength(3)
    })

    it('removes the page and its metadata', () => {
      const data = seedPages()
      component.onDelete(1, { stopPropagation: jest.fn() } as any)
      afterClosed.next(true)
      expect(data.pages).toHaveLength(2)
      expect(data.pageJson).toHaveLength(2)
      expect(component.changedContent).toBe(true)
    })

    it('steps back a page when the open one is deleted', () => {
      seedPages()
      const changePage = jest.spyOn(component, 'changePage').mockImplementation(() => undefined)
      component.selectedPage = 1
      component.onDelete(1, { stopPropagation: jest.fn() } as any)
      afterClosed.next(true)
      expect(changePage).toHaveBeenCalledWith(0)
    })

    it('stays on the first page when it is the one deleted', () => {
      seedPages()
      const changePage = jest.spyOn(component, 'changePage').mockImplementation(() => undefined)
      component.selectedPage = 0
      component.onDelete(0, { stopPropagation: jest.fn() } as any)
      afterClosed.next(true)
      expect(changePage).toHaveBeenCalledWith(0)
    })

    it('steps back when the last page is deleted from under the selection', () => {
      seedPages()
      const changePage = jest.spyOn(component, 'changePage').mockImplementation(() => undefined)
      component.selectedPage = 2
      component.onDelete(0, { stopPropagation: jest.fn() } as any)
      afterClosed.next(true)
      expect(changePage).toHaveBeenCalledWith(1)
    })
  })

  // ----------------------------------------------------------- getMessage --

  describe('getMessage and getAction', () => {
    const withStatus = (status: string) => {
      metaContentService.originalContent = { [currentId]: { status } }
      component.currentId = currentId
    }

    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['InReview', Notify.REVIEW_SUCCESS],
      ['Reviewed', Notify.PUBLISH_SUCCESS],
      ['Review', Notify.PUBLISH_SUCCESS],
    ])('maps %s to its success message', (status, expected) => {
      withStatus(status)
      expect(component.getMessage('success')).toBe(expected)
    })

    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_FAIL],
      ['Review', Notify.PUBLISH_FAIL],
    ])('maps %s to its failure message', (status, expected) => {
      withStatus(status)
      expect(component.getMessage('failure')).toBe(expected)
    })

    it('returns an empty message for an unknown status', () => {
      withStatus('Unknown')
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })

    it.each([
      ['Draft', 'sendForReview'],
      ['Live', 'sendForReview'],
      ['InReview', 'review'],
      ['QualityReview', 'review'],
      ['Reviewed', 'publish'],
      ['Review', 'publish'],
      ['Unknown', 'sendForReview'],
    ])('maps %s to the %s action', (status, expected) => {
      withStatus(status)
      expect(component.getAction()).toBe(expected)
    })
  })

  // ----------------------------------------------------------------- action --

  describe('action', () => {
    beforeEach(() => {
      component.currentId = currentId
      component.allContents = [{ identifier: currentId }, { identifier: 'lex-9' }] as any
    })

    it('previews the module', () => {
      const preview = jest.spyOn(component, 'preview').mockImplementation(() => undefined)
      component.action('preview')
      expect(preview).toHaveBeenCalled()
    })

    it('saves the module', () => {
      const save = jest.spyOn(component, 'save').mockImplementation(() => undefined)
      component.action('save')
      expect(save).toHaveBeenCalled()
    })

    it('pushes the module forward', () => {
      const takeAction = jest.spyOn(component, 'takeAction').mockImplementation(() => undefined)
      component.action('push')
      expect(takeAction).toHaveBeenCalled()
    })

    it('moves to the next module once this one is deleted', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.action('delete')
      afterClosed.next(true)
      expect(next).toHaveBeenCalledWith('lex-9')
    })

    it('goes home when the last module is deleted', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.allContents = [{ identifier: currentId }] as any
      component.action('delete')
      afterClosed.next(true)
      expect(next).not.toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('keeps the module when the delete is declined', () => {
      component.action('delete')
      afterClosed.next(false)
      expect(component.allContents).toHaveLength(2)
    })

    it('goes home on close', () => {
      component.action('close')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('ignores an unknown action', () => {
      component.action('somethingElse')
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------ deleteContent --

  describe('delete confirmation', () => {
    beforeEach(() => {
      component.currentId = currentId
      component.allContents = [{ identifier: currentId }, { identifier: 'lex-9' }] as any
    })

    it('reports a failed delete', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => new Error('boom')))
      component.delete()
      afterClosed.next(true)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('moves to the next module after a successful delete', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.delete()
      afterClosed.next(true)
      expect(next).toHaveBeenCalledWith('lex-9')
    })

    it('goes home after deleting the last module', () => {
      component.allContents = [{ identifier: currentId }] as any
      component.delete()
      afterClosed.next(true)
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('does nothing when the delete is declined', () => {
      component.delete()
      afterClosed.next(false)
      expect(editorService.deleteContent).not.toHaveBeenCalled()
    })
  })
})
