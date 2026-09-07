import { Subject, of, throwError } from 'rxjs'

import { UploadComponent } from './upload.component'

/**
 * Covers createInAnotherLanguage, delete and the permission helpers the sibling
 * upload.component.spec.ts leaves out.
 */
describe('UploadComponent (translation + permissions)', () => {
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

  const cid = 'content-1'

  const build = () =>
    new UploadComponent(
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

  beforeEach(() => {
    authInitService = { ordinals: { subTitles: [{ srclang: 'en' }], canTransCode: [true] } }
    contentService = {
      changeActiveCont: new Subject<string>(),
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
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }) }
    router = { navigateByUrl: jest.fn() }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = {
      rootOrg: 'other',
      userId: 'u1',
      authoringConfig: { isMultiStepFlow: false },
      hasRole: jest.fn().mockReturnValue(true),
    }
    notificationSvc = { triggerPushPullNotification: jest.fn().mockReturnValue(of({})) }

    component = build()
    component.currentContent = cid
    component.contents = []
  })

  afterEach(() => jest.restoreAllMocks())

  describe('createInAnotherLanguage', () => {
    it('adds the new translation and activates it', () => {
      const spy = jest.spyOn(contentService.changeActiveCont, 'next')

      component.createInAnotherLanguage('hi')

      expect(contentService.createInAnotherLanguage).toHaveBeenCalledWith('hi', { artifactUrl: '' })
      expect(component.contents).toHaveLength(1)
      expect(spy).toHaveBeenCalledWith('content-2')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('reports that the translation already exists', () => {
      contentService.createInAnotherLanguage.mockReturnValue(of(true))

      component.createInAnotherLanguage('hi')

      expect(component.contents).toHaveLength(0)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('reports a plain failure', () => {
      contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 500 })))

      component.createInAnotherLanguage('hi')

      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('opens the error parser on a 409 conflict', () => {
      contentService.createInAnotherLanguage.mockReturnValue(throwError(() => ({ status: 409, error: { detail: 'dup' } })))

      component.createInAnotherLanguage('hi')

      expect(dialog.open).toHaveBeenCalled()
      expect(dialog.open.mock.calls[0][1].data.errorFromBackendData).toEqual({ detail: 'dup' })
    })
  })

  describe('getAction', () => {
    it('publishes directly for a client1 single-step flow', () => {
      accessService.rootOrg = 'client1'
      expect(component.getAction()).toBe('publish')
    })

    it('publishes a Knowledge Artifact regardless of status', () => {
      contentService.originalContent[cid].contentType = 'Knowledge Artifact'
      expect(component.getAction()).toBe('publish')
    })

    it('offers review for a draft or live resource', () => {
      expect(component.getAction()).toBe('sendForReview')
      contentService.originalContent[cid].status = 'Live'
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers the review action while under review', () => {
      contentService.originalContent[cid].status = 'InReview'
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed', () => {
      contentService.originalContent[cid].status = 'Reviewed'
      expect(component.getAction()).toBe('publish')
    })

    it('defaults to review for an unknown status', () => {
      contentService.originalContent[cid].status = 'Weird'
      expect(component.getAction()).toBe('sendForReview')
    })
  })

  describe('isPublisherSame / isDirectPublish', () => {
    it('matches the signed-in publisher', () => {
      expect(component.isPublisherSame()).toBe(true)
    })

    it('is false for another publisher', () => {
      contentService.getUpdatedMeta.mockReturnValue({ publisherDetails: [{ id: 'someone-else' }] })
      expect(component.isPublisherSame()).toBe(false)
    })

    it('tolerates content with no publisher list', () => {
      contentService.getUpdatedMeta.mockReturnValue({})
      expect(component.isPublisherSame()).toBe(false)
    })

    it('allows direct publish for a draft owned by the publisher', () => {
      expect(component.isDirectPublish()).toBe(true)
    })

    it('refuses direct publish once under review', () => {
      contentService.originalContent[cid].status = 'InReview'
      expect(component.isDirectPublish()).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('allows an editor or admin', () => {
      accessService.hasRole.mockReturnValue(true)
      expect(component.canDelete()).toBeTruthy()
    })

    it('allows the creator of a draft', () => {
      accessService.hasRole.mockReturnValue(false)
      expect(component.canDelete()).toBeTruthy()
    })

    it('refuses another author', () => {
      accessService.hasRole.mockReturnValue(false)
      contentService.originalContent[cid].creatorContacts = [{ id: 'someone-else' }]
      expect(component.canDelete()).toBeFalsy()
    })

    it('refuses once the content is under review', () => {
      accessService.hasRole.mockReturnValue(false)
      contentService.originalContent[cid].status = 'InReview'
      expect(component.canDelete()).toBeFalsy()
    })
  })

  describe('changeContent', () => {
    it('activates the chosen content', () => {
      const spy = jest.spyOn(contentService.changeActiveCont, 'next')
      component.changeContent({ identifier: 'content-9' } as any)
      expect(spy).toHaveBeenCalledWith('content-9')
    })
  })
})
