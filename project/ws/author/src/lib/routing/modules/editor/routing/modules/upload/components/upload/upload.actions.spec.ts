import { Subject, of, throwError } from 'rxjs'

import { UploadComponent } from './upload.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Wave 18 — the action surface of UploadComponent: `getMessage`, `action`'s
 * dialog branches, `delete`, `finalCall` and `fullScreenToggle`.
 */
describe('UploadComponent (actions)', () => {
  let component: UploadComponent
  let authInitService: any
  let contentService: any
  let snackBar: any
  let editorService: any
  let dialog: any
  let router: any
  let loaderService: any
  let accessService: any
  let notificationSvc: any
  let afterClosed: Subject<any>
  let changeActiveCont: Subject<string>

  const cid = 'content-1'

  beforeEach(() => {
    afterClosed = new Subject<any>()
    changeActiveCont = new Subject<string>()
    authInitService = { ordinals: { subTitles: [{ srclang: 'en' }], canTransCode: [true] } }
    contentService = {
      changeActiveCont,
      upDatedContent: {},
      originalContent: { [cid]: { status: 'Draft', contentType: 'Resource', creatorContacts: [{ id: 'u1' }] } },
      getOriginalMeta: jest.fn().mockReturnValue({ isContentEditingDisabled: false, artifactUrl: 'a' }),
      getUpdatedMeta: jest.fn().mockReturnValue({ artifactUrl: 'a', status: 'Draft', publisherDetails: [{ id: 'u1' }] }),
      isValid: jest.fn().mockReturnValue(true),
      resetOriginalMeta: jest.fn(),
      createInAnotherLanguage: jest.fn().mockReturnValue(of({ identifier: 'content-2' })),
    }
    snackBar = { openFromComponent: jest.fn() }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({})),
      deleteContent: jest.fn().mockReturnValue(of({})),
      forwardBackward: jest.fn().mockReturnValue(of({})),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    router = { navigateByUrl: jest.fn() }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = {
      rootOrg: 'client1',
      userId: 'u1',
      authoringConfig: { isMultiStepFlow: false },
      hasRole: jest.fn().mockReturnValue(true),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({})) }

    component = new UploadComponent(
      authInitService,
      contentService,
      snackBar,
      editorService,
      dialog,
      router,
      loaderService,
      accessService,
      notificationSvc,
    )
    component.currentContent = cid
    component.contents = [{ identifier: cid }, { identifier: 'content-9' }] as any
  })

  afterEach(() => jest.clearAllMocks())

  // ------------------------------------------------------------ getMessage --

  describe('getMessage', () => {
    const withStatus = (status: string) => {
      contentService.originalContent = { [cid]: { status } }
    }

    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['InReview', Notify.REVIEW_SUCCESS],
      ['Reviewed', Notify.PUBLISH_SUCCESS],
    ])('maps %s to its success message', (status, expected) => {
      withStatus(status)
      expect(component.getMessage('success')).toBe(expected)
    })

    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_FAIL],
    ])('maps %s to its failure message', (status, expected) => {
      withStatus(status)
      expect(component.getMessage('failure')).toBe(expected)
    })

    it('returns an empty message for an unknown status', () => {
      withStatus('Unknown')
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })
  })

  // ---------------------------------------------------------------- action --

  describe('action', () => {
    it('saves the content', () => {
      const save = jest.spyOn(component, 'save').mockImplementation(() => undefined)
      component.action('save')
      expect(save).toHaveBeenCalledWith()
    })

    it('saves and moves on', () => {
      const save = jest.spyOn(component, 'save').mockImplementation(() => undefined)
      component.action('saveAndNext')
      expect(save).toHaveBeenCalledWith('next')
    })

    it('confirms before publishing', () => {
      contentService.originalContent = { [cid]: { status: 'Reviewed' } }
      const takeAction = jest.spyOn(component, 'takeAction').mockImplementation(() => undefined)
      component.action('push')
      expect(dialog.open).toHaveBeenCalled()
      expect(takeAction).not.toHaveBeenCalled()
      afterClosed.next(true)
      expect(takeAction).toHaveBeenCalled()
    })

    it('abandons the publish when the confirmation is declined', () => {
      contentService.originalContent = { [cid]: { status: 'Reviewed' } }
      const takeAction = jest.spyOn(component, 'takeAction').mockImplementation(() => undefined)
      component.action('push')
      afterClosed.next(false)
      expect(takeAction).not.toHaveBeenCalled()
    })

    it('pushes a draft forward without a confirmation', () => {
      // rootOrg client1 short-circuits getAction() to publish, so use another org.
      accessService.rootOrg = 'other'
      contentService.originalContent = { [cid]: { status: 'Draft', contentType: 'Resource' } }
      const takeAction = jest.spyOn(component, 'takeAction').mockImplementation(() => undefined)
      component.action('push')
      expect(takeAction).toHaveBeenCalled()
    })

    it('moves to the next content once this one is deleted', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.action('delete')
      afterClosed.next(true)
      expect(next).toHaveBeenCalledWith('content-9')
    })

    it('goes home when the last content is deleted', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.contents = [{ identifier: cid }] as any
      component.action('delete')
      afterClosed.next(true)
      expect(next).not.toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('keeps the content when the deletion is declined', () => {
      component.action('delete')
      afterClosed.next(false)
      expect(component.contents).toHaveLength(2)
    })

    it('ignores an unknown action', () => {
      component.action('somethingElse')
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------- delete --

  describe('delete', () => {
    it('moves to the next content after a successful delete', () => {
      const next = jest.spyOn(changeActiveCont, 'next')
      component.delete()
      expect(editorService.deleteContent).toHaveBeenCalledWith(cid)
      expect(next).toHaveBeenCalledWith('content-9')
    })

    it('goes home after deleting the last content', () => {
      component.contents = [{ identifier: cid }] as any
      component.delete()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('opens the error parser when the delete conflicts', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.delete()
      expect(dialog.open).toHaveBeenCalledTimes(1)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict delete failure', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.delete()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------- fullScreenToggle --

  describe('fullScreenToggle', () => {
    const withElement = (element: any, docProps: any = {}) => {
      jest.spyOn(document, 'getElementById').mockReturnValue(element)
      Object.assign(document as any, docProps)
    }

    afterEach(() => {
      ;(document as any).fullscreenElement = undefined
      ;(document as any).mozFullScreen = undefined
      ;(document as any).msFullscreenElement = undefined
      ;(document as any).webkitIsFullscreen = undefined
    })

    it('enters full screen through the standard API', () => {
      const requestFullscreen = jest.fn()
      withElement({ requestFullscreen }, { fullscreenElement: null })
      component.fullScreenToggle()
      expect(requestFullscreen).toHaveBeenCalled()
    })

    it('leaves full screen through the standard API', () => {
      const exitFullscreen = jest.fn()
      withElement({ requestFullscreen: jest.fn() }, { fullscreenElement: {}, exitFullscreen })
      component.fullScreenToggle()
      expect(exitFullscreen).toHaveBeenCalled()
    })

    it('falls back to the Mozilla API', () => {
      const mozRequestFullScreen = jest.fn()
      withElement({ mozRequestFullScreen }, { mozFullScreen: false })
      component.fullScreenToggle()
      expect(mozRequestFullScreen).toHaveBeenCalled()
    })

    it('leaves full screen through the Mozilla API', () => {
      const mozCancelFullScreen = jest.fn()
      withElement({ mozRequestFullScreen: jest.fn() }, { mozFullScreen: true, mozCancelFullScreen })
      component.fullScreenToggle()
      expect(mozCancelFullScreen).toHaveBeenCalled()
    })

    it('falls back to the Microsoft API', () => {
      const msRequestFullscreen = jest.fn()
      withElement({ msRequestFullscreen }, { msFullscreenElement: null })
      component.fullScreenToggle()
      expect(msRequestFullscreen).toHaveBeenCalled()
    })

    it('leaves full screen through the Microsoft API', () => {
      const msExitFullscreen = jest.fn()
      withElement({ msRequestFullscreen: jest.fn() }, { msFullscreenElement: {}, msExitFullscreen })
      component.fullScreenToggle()
      expect(msExitFullscreen).toHaveBeenCalled()
    })

    it('falls back to the WebKit API', () => {
      const webkitRequestFullscreen = jest.fn()
      withElement({ webkitRequestFullscreen }, { webkitIsFullscreen: false })
      component.fullScreenToggle()
      expect(webkitRequestFullscreen).toHaveBeenCalled()
    })

    it('leaves full screen through the WebKit API', () => {
      const webkitCancelFullscreen = jest.fn()
      withElement({ webkitRequestFullscreen: jest.fn() }, { webkitIsFullscreen: true, webkitCancelFullscreen })
      component.fullScreenToggle()
      expect(webkitCancelFullscreen).toHaveBeenCalled()
    })

    it('does nothing when the browser supports none of them', () => {
      withElement({})
      expect(() => component.fullScreenToggle()).not.toThrow()
    })
  })
})
