import { FormControl, FormGroup } from '@angular/forms'
import { Subject, of, throwError } from 'rxjs'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { WebModuleEditorComponent } from './web-module-editor.component'
import { ModuleObj, Page, WebModuleData } from '../web-module.class'

/**
 * Covers the save / review workflow the sibling web-module-editor.component.spec.ts
 * leaves out: wrapperForTriggerSave, validationCheck, takeAction, finalCall and the
 * preview branches.
 */
describe('WebModuleEditorComponent (save + review workflow)', () => {
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

  const currentId = 'lex-1'

  const build = () =>
    new WebModuleEditorComponent(
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

  const seedUserData = () => {
    component.userData[currentId] = new WebModuleData({
      pageJson: [new ModuleObj({ URL: '/assets/index1.html', title: 'p1' })],
      pages: [new Page({ fileIndex: 1, body: '<p>hi</p>' })],
    })
    component.currentId = currentId
    component.selectedPage = 0
  }

  beforeEach(() => {
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    snackBar = { openFromComponent: jest.fn() }
    router = { url: '/author/web/lex-1/page', navigateByUrl: jest.fn() }
    activateRoute = { parent: { parent: {} } }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    metaContentService = {
      changeActiveCont: new Subject<string>(),
      upDatedContent: {},
      originalContent: { [currentId]: { status: 'Draft', creatorContacts: [{ id: 'u1' }] } },
      getUpdatedMeta: jest.fn().mockReturnValue({ locale: 'en', status: 'Draft', mimeType: 'application/web-module' }),
      getOriginalMeta: jest.fn().mockReturnValue({ status: 'Draft' }),
      isValid: jest.fn().mockReturnValue(true),
      resetOriginalMeta: jest.fn(),
      createInAnotherLanguage: jest.fn().mockReturnValue(of({ identifier: 'lex-2' })),
    }
    uploadService = { encodedUpload: jest.fn().mockReturnValue(of({ code: 'ok', authArtifactURL: 'a', downloadURL: 'd' })) }
    editorService = {
      getDataForContent: jest.fn().mockReturnValue(of([{ content: { children: [], artifactUrl: 'x/y/z.json', identifier: currentId } }])),
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

    component = build()
    component.currentId = currentId
    seedUserData()
  })

  afterEach(() => jest.restoreAllMocks())

  describe('wrapperForTriggerSave', () => {
    it('skips the upload when nothing changed', done => {
      component.changedContent = false
      const triggerUpload = jest.spyOn(component, 'triggerUpload')
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)

      component.wrapperForTriggerSave().subscribe(() => {
        expect(triggerUpload).not.toHaveBeenCalled()
        expect(triggerSave).toHaveBeenCalled()
        done()
      })
    })

    it('uploads first and folds the new urls into the meta', done => {
      component.changedContent = true
      jest
        .spyOn(component, 'triggerUpload')
        .mockReturnValue(of({ code: 'ok', authArtifactURL: 'https%2F%2Fh%2Fa.json', downloadURL: 'https%2F%2Fh%2Fd.json' }) as any)
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)

      component.wrapperForTriggerSave().subscribe(() => {
        const meta = triggerSave.mock.calls[0][0] as any
        expect(meta.artifactUrl).toBe('https//h/a.json')
        expect(meta.downloadUrl).toBe('https//h/d.json')
        expect(component.changedContent).toBe(false)
        done()
      })
    })

    it('falls back to artifactURL when no auth url is returned', done => {
      component.changedContent = true
      jest.spyOn(component, 'triggerUpload').mockReturnValue(of({ code: 'ok', artifactURL: 'a.json', downloadURL: 'd.json' }) as any)
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)

      component.wrapperForTriggerSave().subscribe(() => {
        expect((triggerSave.mock.calls[0][0] as any).artifactUrl).toBe('a.json')
        done()
      })
    })

    it('leaves the meta alone when the upload returns no code', done => {
      component.changedContent = true
      jest.spyOn(component, 'triggerUpload').mockReturnValue(of({}) as any)
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)

      component.wrapperForTriggerSave().subscribe(() => {
        expect((triggerSave.mock.calls[0][0] as any).artifactUrl).toBeUndefined()
        expect(component.changedContent).toBe(true)
        done()
      })
    })
  })

  describe('validationCheck', () => {
    it('fails and warns when mandatory metadata is missing', done => {
      metaContentService.isValid.mockReturnValue(false)

      component.validationCheck().subscribe(valid => {
        expect(valid).toBe(false)
        expect(snackBar.openFromComponent).toHaveBeenCalled()
        done()
      })
    })

    it('passes straight through when nothing changed', done => {
      component.changedContent = false
      component.validationCheck().subscribe(valid => {
        expect(valid).toBe(true)
        done()
      })
    })

    it('saves first when the content changed and the pages are valid', done => {
      component.changedContent = true
      jest.spyOn(component, 'checkValidity').mockReturnValue(true)
      const wrapper = jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)

      component.validationCheck().subscribe(valid => {
        expect(valid).toBe(true)
        expect(wrapper).toHaveBeenCalled()
        done()
      })
    })

    it('sends the user back to the page step when a page is invalid', done => {
      component.changedContent = true
      jest.spyOn(component, 'checkValidity').mockReturnValue(false)

      component.validationCheck().subscribe(valid => {
        expect(valid).toBe(false)
        expect(component.currentStep).toBe(2)
        done()
      })
    })
  })

  describe('takeAction', () => {
    it('reports the content is already up to date', () => {
      metaContentService.getUpdatedMeta.mockReturnValue({ status: 'Live' })
      component.changedContent = false
      metaContentService.upDatedContent = {}

      component.takeAction()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the comments dialog once validation passes', () => {
      component.changedContent = true
      jest.spyOn(component, 'validationCheck').mockReturnValue(of(true))
      const finalCall = jest.spyOn(component, 'finalCall').mockImplementation(() => undefined)

      component.takeAction()

      expect(dialog.open).toHaveBeenCalled()
      expect(finalCall).toHaveBeenCalled()
    })

    it('does not open the dialog when validation fails', () => {
      component.changedContent = true
      jest.spyOn(component, 'validationCheck').mockReturnValue(of(false))

      component.takeAction()

      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('warns when the validation stream errors', () => {
      component.changedContent = true
      jest.spyOn(component, 'validationCheck').mockReturnValue(throwError(() => new Error('nope')))

      component.takeAction()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('finalCall', () => {
    const commentsForm = (action = 'accept', comments = 'looks good') =>
      new FormGroup({
        comments: new FormControl(comments),
        action: new FormControl(action),
      })

    it('does nothing without a form', () => {
      component.finalCall(undefined as any)
      expect(editorService.forwardBackward).not.toHaveBeenCalled()
    })

    it('sends the comment and moves the content forward', () => {
      component.allContents = [{ identifier: currentId }] as any

      component.finalCall(commentsForm())

      expect(editorService.forwardBackward).toHaveBeenCalled()
      const body = editorService.forwardBackward.mock.calls[0][0]
      expect(body.comment).toBe('looks good')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('uses the direct-publish operation for a client1 single-step flow', () => {
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(100000)
    })

    it('uses the ordinary forward operation outside client1', () => {
      accessService.rootOrg = 'other'
      component.finalCall(commentsForm())
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(1)
    })

    it('sends the reject operation when rejecting a reviewed item', () => {
      metaContentService.originalContent[currentId].status = 'InReview'
      component.finalCall(commentsForm('reject'))
      expect(editorService.forwardBackward.mock.calls[0][0].operation).toBe(0)
    })

    it('activates the next content when others remain', () => {
      component.allContents = [{ identifier: currentId }, { identifier: 'lex-9' }] as any
      const spy = jest.spyOn(metaContentService.changeActiveCont, 'next')

      component.finalCall(commentsForm())

      expect(spy).toHaveBeenCalledWith('lex-9')
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })

    it('saves any pending metadata before forwarding', () => {
      metaContentService.upDatedContent = { [currentId]: { name: 'Changed' } }
      const triggerSave = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)

      component.finalCall(commentsForm())

      expect(triggerSave).toHaveBeenCalled()
    })

    it('survives a failing notification call', () => {
      notificationSvc.triggerPushPullNotification.mockReturnValue(throwError(() => new Error('mail down')))
      component.allContents = [] as any

      component.finalCall(commentsForm())

      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('reports a plain failure', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 500 })))

      component.finalCall(commentsForm())

      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('opens the error parser on a 409 conflict', () => {
      editorService.forwardBackward.mockReturnValue(throwError(() => ({ status: 409, error: { detail: 'stale' } })))

      component.finalCall(commentsForm())

      expect(dialog.open).toHaveBeenCalled()
      expect(dialog.open.mock.calls[0][1].data.errorFromBackendData).toEqual({ detail: 'stale' })
    })
  })

  describe('preview', () => {
    it('warns when the module has no pages', () => {
      component.userData[currentId] = new WebModuleData({ pageJson: [], pages: [] })

      component.preview()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.previewMode).toBeFalsy()
    })

    it('previews immediately when nothing needs saving', () => {
      component.changedContent = false
      metaContentService.upDatedContent = {}

      component.preview()

      expect(component.previewMode).toBe(true)
      expect(component.mimeTypeRoute).toBeTruthy()
    })

    it('saves before previewing when the content changed', () => {
      component.changedContent = true
      jest.spyOn(component, 'checkValidity').mockReturnValue(true)
      jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)

      component.preview()

      expect(component.previewMode).toBe(true)
    })

    it('stays out of preview when the save fails', () => {
      component.changedContent = true
      jest.spyOn(component, 'checkValidity').mockReturnValue(true)
      jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(throwError(() => new Error('nope')) as any)

      component.preview()

      expect(component.previewMode).toBeFalsy()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('does not preview when a page is invalid', () => {
      component.changedContent = true
      jest.spyOn(component, 'checkValidity').mockReturnValue(false)

      component.preview()

      expect(component.previewMode).toBeFalsy()
    })
  })

  describe('save', () => {
    it('saves a changed module that has pages', () => {
      component.changedContent = true
      const wrapper = jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)
      jest.spyOn(component, 'checkValidity').mockReturnValue(true)

      component.save()

      expect(wrapper).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('saves when only the metadata changed', () => {
      component.changedContent = false
      metaContentService.upDatedContent = { [currentId]: { name: 'Changed' } }
      const wrapper = jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(of({}) as any)
      jest.spyOn(component, 'checkValidity').mockReturnValue(true)

      component.save()

      expect(wrapper).toHaveBeenCalled()
    })

    it('reports a failed save', () => {
      component.changedContent = true
      jest.spyOn(component, 'checkValidity').mockReturnValue(true)
      jest.spyOn(component, 'wrapperForTriggerSave').mockReturnValue(throwError(() => new Error('nope')) as any)

      component.save()

      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('sends the user back to the page step when a page is invalid', () => {
      component.changedContent = true
      component.currentStep = 3
      jest.spyOn(component, 'checkValidity').mockReturnValue(false)
      const wrapper = jest.spyOn(component, 'wrapperForTriggerSave')

      component.save()

      expect(component.currentStep).toBe(2)
      expect(wrapper).not.toHaveBeenCalled()
    })

    it('reports the module is already up to date', () => {
      component.changedContent = false
      metaContentService.upDatedContent = {}

      component.save()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('warns when the module has no pages', () => {
      component.userData[currentId] = new WebModuleData({ pageJson: [], pages: [] })
      component.changedContent = true

      component.save()

      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })
})
