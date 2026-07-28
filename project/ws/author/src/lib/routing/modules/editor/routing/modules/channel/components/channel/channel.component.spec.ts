import { FormControl, FormGroup } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { ChannelComponent } from './channel.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { AUTHORING_CONTENT_BASE } from '@ws/author/src/lib/constants/apiEndpoints'

describe('ChannelComponent', () => {
  let component: ChannelComponent
  let activateRoute: any
  let contentService: any
  let snackBar: any
  let editorService: any
  let dialog: any
  let router: any
  let loaderService: any
  let storeService: any
  let channelResolver: any
  let uploadService: any
  let changeDetector: any
  let accessService: any
  let authInitService: any
  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  const meta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      status: 'Draft',
      artifactUrl: 'a.json',
      ...over,
    }) as any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const build = () =>
    new ChannelComponent(
      activateRoute,
      contentService,
      snackBar,
      editorService,
      dialog,
      router,
      loaderService,
      storeService,
      channelResolver,
      uploadService,
      changeDetector,
      accessService,
      authInitService,
      '/',
    )

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()
    activateRoute = { parent: null }
    contentService = {
      changeActiveCont,
      currentContent: 'do_1',
      originalContent: { do_1: meta() },
      upDatedContent: { do_1: {} },
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      resetOriginalMeta: jest.fn(),
      isValid: jest.fn().mockReturnValue(true),
      createInAnotherLanguage: jest.fn().mockReturnValue(of(meta({ identifier: 'do_2' }))),
    }
    snackBar = { openFromComponent: jest.fn() }
    editorService = {
      updateContent: jest.fn().mockReturnValue(of({ ok: true })),
      forwardBackward: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({ ok: true })),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    router = { navigateByUrl: jest.fn() }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    storeService = {
      editMode: 'Basic',
      originalContent: {},
      updatedContent: {},
      getUpdatedJSON: jest.fn().mockReturnValue({ widgets: [] }),
      resetContent: jest.fn(),
    }
    channelResolver = {
      renderFromJSON: jest.fn().mockReturnValue({ rendered: true }),
      renderToJSON: jest.fn().mockReturnValue({ json: true }),
    }
    uploadService = { encodedUpload: jest.fn().mockReturnValue(of({ artifactURL: 'new.json' })) }
    changeDetector = { detach: jest.fn(), detectChanges: jest.fn() }
    accessService = { rootOrg: 'sunbird', hasRole: jest.fn().mockReturnValue(false) }
    authInitService = { ordinals: { subTitles: ['en', 'hi'] } }

    component = build()
    component.currentContent = 'do_1'
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('collects the languages and known contents', () => {
      contentService.originalContent = { do_1: meta() }
      component.ngOnInit()
      expect(component.allLanguages).toEqual(['en', 'hi'])
      expect(component.contents.length).toBe(1)
      expect(loaderService.changeLoadState).toHaveBeenCalledWith(true)
    })

    it('shows the setting buttons only for Siemens', () => {
      component.ngOnInit()
      expect(component.showSettingButtons).toBe(false)
      accessService.rootOrg = 'Siemens'
      const c = build()
      c.ngOnInit()
      expect(c.showSettingButtons).toBe(true)
    })

    it('offers the mode switch to an advanced channel creator', () => {
      accessService.hasRole.mockReturnValue(true)
      const c = build()
      c.ngOnInit()
      expect(c.canShowMode).toBe(true)
    })

    it('publishes the edit mode to the store', () => {
      component.ngOnInit()
      expect(storeService.editMode).toBe('Basic')
    })

    it('tracks the active content', () => {
      component.ngOnInit()
      changeActiveCont.next('do_9')
      expect(component.currentContent).toBe('do_9')
    })

    it('renders an existing page layout from the route data', () => {
      activateRoute = {
        parent: {
          parent: {
            data: of({
              contents: [{ content: meta(), data: { pageLayout: { widgetType: 'layout' } } }],
            }),
          },
        },
      }
      const c = build()
      c.ngOnInit()
      expect(c.isNew['do_1']).toBe(false)
      expect(channelResolver.renderFromJSON).toHaveBeenCalled()
      expect(storeService.originalContent['do_1']).toEqual({ rendered: true })
    })

    it('seeds a blank grid layout for a brand-new page', () => {
      activateRoute = {
        parent: { parent: { data: of({ contents: [{ content: meta(), data: null }] }) } },
      }
      const c = build()
      c.ngOnInit()
      expect(c.isNew['do_1']).toBe(true)
      expect(storeService.updatedContent['do_1']).toEqual({ rendered: true })
      expect(storeService.originalContent['do_1']).toEqual({ rendered: true })
    })
  })

  it('ngOnDestroy detaches change detection and hides the loader', () => {
    component.ngOnDestroy()
    expect(changeDetector.detach).toHaveBeenCalled()
    expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
  })

  describe('regex replacements', () => {
    it('regexUploadReplace decodes the stored path', () => {
      expect(component.regexUploadReplace('', encodeURIComponent('/content-store/a b'), '"')).toBe('/content-store/a b"')
    })

    it('regexDownloadReplace prefixes and encodes the authoring path', () => {
      expect(component.regexDownloadReplace('', '/content-store/a b', '"')).toBe(
        `${AUTHORING_CONTENT_BASE}${encodeURIComponent('/content-store/a b')}"`,
      )
    })
  })

  describe('customStepper', () => {
    it('locks the cursor on step 1', () => {
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
      expect(component.currentStep).toBe(2)
    })

    it('moves to any other step', () => {
      component.customStepper(3)
      expect(component.currentStep).toBe(3)
    })
  })

  describe('createInAnotherLanguage', () => {
    it('adds the translation and seeds a blank layout', () => {
      component.createInAnotherLanguage('hi')
      expect(component.contents.length).toBe(1)
      expect(component.isNew['do_2']).toBe(true)
      expect(storeService.updatedContent['do_2']).toEqual({ rendered: true })
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
    })

    it('reports that the translation already exists', () => {
      contentService.createInAnotherLanguage.mockReturnValue(of(true))
      component.createInAnotherLanguage('hi')
      expect(lastNotify()).toBe(Notify.DATA_PRESENT)
      expect(component.contents.length).toBe(0)
    })

    it('opens the error parser on a 409 conflict', () => {
      contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.createInAnotherLanguage('hi')
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 500 })))
      component.createInAnotherLanguage('hi')
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  it('changeContent activates the chosen page', () => {
    jest.spyOn(changeActiveCont, 'next')
    component.changeContent(meta({ identifier: 'do_9' }))
    expect(contentService.currentContent).toBe('do_9')
    expect(changeActiveCont.next).toHaveBeenCalledWith('do_9')
  })

  describe('save', () => {
    it('reports an up-to-date page when nothing changed', () => {
      component.save()
      expect(editorService.updateContent).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.UP_TO_DATE)
    })

    it('persists a metadata change', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.save()
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(component.isChanged).toBe(true)
      expect(lastNotify()).toBe(Notify.SAVE_SUCCESS)
    })

    it('persists a layout change by uploading the page JSON first', () => {
      storeService.updatedContent = { do_1: { widgets: [] } }
      component.save()
      expect(uploadService.encodedUpload).toHaveBeenCalled()
      expect(editorService.updateContent).toHaveBeenCalled()
      const meta1 = editorService.updateContent.mock.calls[0][0].nodesModified.do_1.metadata
      expect(meta1.artifactUrl).toBe('new.json')
      expect(meta1.lastUpdatedOn).toMatch(/\+0000$/)
    })

    it('opens the error parser on a 409 conflict', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.save()
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SAVE_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.save()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('validationCheck', () => {
    it('passes for a valid page with an artifact', () => {
      expect(component.validationCheck).toBe(true)
    })

    it('fails when mandatory fields are missing', () => {
      contentService.isValid.mockReturnValue(false)
      expect(component.validationCheck).toBe(false)
    })

    it('fails when the page has never been saved', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ artifactUrl: '' }))
      expect(component.validationCheck).toBe(false)
      expect(lastNotify()).toBe(Notify.CREATE_CONTENT)
    })
  })

  describe('takeAction', () => {
    it('reports an up-to-date live page with no pending change', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Live' }))
      component.takeAction()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.UP_TO_DATE)
    })

    it('collects a comment before acting', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      const spy = jest.spyOn(component, 'finalCall').mockImplementation(() => {})
      component.takeAction()
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(null)
      expect(spy).toHaveBeenCalled()
    })

    it('does not open the dialog when validation fails', () => {
      contentService.isValid.mockReturnValue(false)
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.takeAction()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    const commentsForm = (action = 'accept') =>
      new FormGroup({
        comments: new FormControl('looks good'),
        action: new FormControl(action),
      })

    beforeEach(() => {
      contentService.upDatedContent = { do_1: { name: 'New', status: 'Draft' } }
    })

    it('does nothing without a comments form', () => {
      component.finalCall(null as any)
      expect(editorService.forwardBackward).not.toHaveBeenCalled()
    })

    it('forwards the page and returns to the author home', () => {
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward).toHaveBeenCalledWith({ comment: 'looks good', operation: 1 }, 'do_1', 'Draft')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
      expect(lastNotify()).toBe(Notify.SEND_FOR_REVIEW_SUCCESS)
    })

    it('sends operation -1 when the reviewer rejects an in-review page', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      component.finalCall(commentsForm('reject'))
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(-1)
    })

    it('skips the save when nothing is pending', () => {
      contentService.upDatedContent = { do_1: {} }
      storeService.updatedContent = {}
      component.finalCall(commentsForm())
      expect(editorService.updateContent).not.toHaveBeenCalled()
      expect(editorService.forwardBackward).toHaveBeenCalled()
    })

    it('opens the error parser on a 409 conflict', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.finalCall(commentsForm())
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SEND_FOR_REVIEW_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalCall(commentsForm())
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('preview', () => {
    it('enters preview mode', () => {
      component.preview()
      expect(component.previewMode).toBe(true)
      expect(component.mimeTypeRoute).toBe('channel')
    })

    it('saves pending changes before previewing', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      component.preview()
      expect(editorService.updateContent).toHaveBeenCalled()
      expect(component.previewMode).toBe(true)
    })

    it('opens the error parser on a 409 conflict', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.preview()
      expect(dialog.open).toHaveBeenCalled()
      expect(component.previewMode).toBe(false)
    })

    it('only notifies on a non-conflict failure', () => {
      contentService.upDatedContent = { do_1: { name: 'New' } }
      editorService.updateContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.preview()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SAVE_FAIL)
    })

    it('closePreview leaves preview mode', () => {
      component.previewMode = true
      component.closePreview()
      expect(component.previewMode).toBe(false)
    })
  })

  it('toggleSettingButtons flips the settings panel', () => {
    component.showSettingButtons = false
    component.toggleSettingButtons()
    expect(component.showSettingButtons).toBe(true)
  })

  describe('getMessage', () => {
    const cases: Array<[string, string, string]> = [
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_SUCCESS, Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
      ['Review', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
    ]

    cases.forEach(([status, success, failure]) => {
      it(`maps ${status} to its success and failure messages`, () => {
        contentService.originalContent = { do_1: meta({ status }) }
        expect(component.getMessage('success')).toBe(success)
        expect(component.getMessage('failure')).toBe(failure)
      })
    })

    it('returns an empty message for an unknown status', () => {
      contentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })
  })

  describe('getAction', () => {
    it('offers review for draft and live pages', () => {
      expect(component.getAction()).toBe('sendForReview')
      contentService.originalContent = { do_1: meta({ status: 'Live' }) }
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers review actions while under review', () => {
      contentService.originalContent = { do_1: meta({ status: 'InReview' }) }
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed', () => {
      contentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      expect(component.getAction()).toBe('publish')
      contentService.originalContent = { do_1: meta({ status: 'Review' }) }
      expect(component.getAction()).toBe('publish')
    })

    it('defaults to review for an unknown status', () => {
      contentService.originalContent = { do_1: meta({ status: 'Nope' }) }
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  describe('action', () => {
    it('next advances the stepper', () => {
      component.currentStep = 1
      component.action('next')
      expect(component.currentStep).toBe(2)
    })

    it('preview and save delegate to their handlers', () => {
      const preview = jest.spyOn(component, 'preview').mockImplementation(() => {})
      const save = jest.spyOn(component, 'save').mockImplementation(() => {})
      component.action('preview')
      expect(preview).toHaveBeenCalled()
      component.action('save')
      expect(save).toHaveBeenCalled()
    })

    it('push confirms before publishing', () => {
      contentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('push does nothing when the publish confirmation is dismissed', () => {
      contentService.originalContent = { do_1: meta({ status: 'Reviewed' }) }
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      afterClosed.next(false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('push acts immediately when the page is not publishable', () => {
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalled()
    })

    it('editorChange toggles between the basic and advanced editors', () => {
      component.action('editorChange')
      expect(component.mode).toBe('Advanced')
      expect(storeService.editMode).toBe('Advanced')
      component.action('editorChange')
      expect(component.mode).toBe('Basic')
      expect(changeDetector.detectChanges).toHaveBeenCalled()
    })

    it('delete confirms before deleting', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.action('delete')
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('delete does nothing when dismissed', () => {
      const spy = jest.spyOn(component, 'delete').mockImplementation(() => {})
      component.action('delete')
      afterClosed.next(false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('close returns to the author home', () => {
      component.action('close')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('ignores an unknown action', () => {
      component.currentStep = 2
      component.action('nope')
      expect(component.currentStep).toBe(2)
    })
  })

  describe('delete', () => {
    it('removes the page and returns home', () => {
      component.contents = [meta()]
      component.isNew = { do_1: true }
      component.delete()
      expect(editorService.deleteContent).toHaveBeenCalledWith('do_1')
      expect(component.contents).toEqual([])
      expect(component.isNew.do_1).toBeUndefined()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('activates the next page when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta(), meta({ identifier: 'do_2' })]
      component.delete()
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('opens the error parser on a 409 conflict', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.delete()
      expect(dialog.open).toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.delete()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })

  describe('triggerFileSave', () => {
    it('uploads the rendered page JSON', () => {
      component.triggerFileSave().subscribe()
      expect(storeService.getUpdatedJSON).toHaveBeenCalled()
      expect(channelResolver.renderToJSON).toHaveBeenCalled()
      expect(uploadService.encodedUpload).toHaveBeenCalled()
      expect(storeService.resetContent).toHaveBeenCalled()
    })
  })

  describe('fullScreenToggle', () => {
    let el: HTMLElement

    beforeEach(() => {
      el = document.createElement('div')
      el.id = 'upload-container'
      document.body.appendChild(el)
    })

    afterEach(() => el.remove())

    it('requests fullscreen when nothing is fullscreen yet', () => {
      const requestFullscreen = jest.fn()
      ;(el as any).requestFullscreen = requestFullscreen
      ;(document as any).fullscreenElement = null
      component.fullScreenToggle()
      expect(requestFullscreen).toHaveBeenCalled()
    })

    it('exits fullscreen when already fullscreen', () => {
      ;(el as any).requestFullscreen = jest.fn()
      ;(document as any).fullscreenElement = el
      ;(document as any).exitFullscreen = jest.fn()
      component.fullScreenToggle()
      expect((document as any).exitFullscreen).toHaveBeenCalled()
      ;(document as any).fullscreenElement = null
    })

    it('falls back to the webkit API', () => {
      const webkitRequestFullscreen = jest.fn()
      ;(el as any).webkitRequestFullscreen = webkitRequestFullscreen
      component.fullScreenToggle()
      expect(webkitRequestFullscreen).toHaveBeenCalled()
    })
  })
})
