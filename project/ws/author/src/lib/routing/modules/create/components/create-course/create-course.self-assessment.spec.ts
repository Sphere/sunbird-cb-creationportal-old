import { FormBuilder } from '@angular/forms'
import { EMPTY, of, throwError } from 'rxjs'

import { CreateCourseComponent } from './create-course.component'

/**
 * Wave 18 — `createSelfAssessmentCourse` (the competency-driven course creation)
 * and the app-icon upload of CreateCourseComponent.
 */
describe('CreateCourseComponent (self assessment and icon upload)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const fb = new FormBuilder()
    const afterClosed = { subscribe: jest.fn() }
    const mocks: any = {
      snackBar: { openFromComponent: jest.fn(), open: jest.fn() },
      svc: {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'do_new', versionKey: 'vk1' })),
        createForum: jest.fn().mockReturnValue(of({ ok: true })),
      },
      router: { navigateByUrl: jest.fn() },
      loaderService: { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue({ afterClosed: () => EMPTY }) },
      authInitService: { creationEntity: [], uploadData: jest.fn() },
      accessControlSvc: { locale: 'en', userId: 'u1', userName: 'User One' },
      editorService: {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
        readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_new', children: [] })),
      },
      configSvc: {
        instanceConfig: { logos: { defaultContent: 'default.png' } },
        userProfile: { userId: 'u1', userName: 'User One' },
      },
      loader: { changeLoad: { next: jest.fn() } },
      http: { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) },
      route: { queryParams: of({}) },
      uploadService: { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'https://cdn/bucket/i.png' })) },
      storeService: {
        parentNode: [],
        flatNodeMap: new Map(),
        uniqueIdMap: new Map(),
        lexIdMap: new Map([['do_new', [1]]]),
        currentParentNode: 0,
        currentSelectedNode: 0,
      },
      editorStore: { parentContent: '', setOriginalMeta: jest.fn() },
      resolverService: { buildTreeAndMap: jest.fn() },
      progressSvc: {},
      cdr: { detectChanges: jest.fn() },
      ...overrides,
    }
    const component = new CreateCourseComponent(
      fb,
      mocks.snackBar,
      mocks.svc,
      mocks.router,
      mocks.loaderService,
      mocks.dialog,
      mocks.authInitService,
      mocks.accessControlSvc,
      mocks.editorService,
      fb,
      mocks.configSvc,
      mocks.loader,
      mocks.http,
      mocks.route,
      mocks.uploadService,
      mocks.storeService,
      mocks.editorStore,
      mocks.resolverService,
      mocks.progressSvc,
      mocks.cdr,
    )
    ;(window as any).env = { azureBucket: 'bucket' }
    return { component, mocks, afterClosed }
  }

  /** A competency entity as the proficiency picker yields it. */
  const competency = (over: any = {}) => ({
    name: 'Immunisation',
    description: 'About immunisation',
    'lang-hi-name': 'टीकाकरण',
    'lang-hi-description': 'टीकाकरण के बारे में',
    entityId: 42,
    levels: [{ levelNumber: 1, levelName: 'Basic', description: 'Level one' }],
    ...over,
  })

  const ready = (component: CreateCourseComponent, over: any = {}) => {
    component.content = { contentType: 'Course', mimeType: 'application/vnd.ekstep.content-collection', primaryCategory: 'Course' } as any
    component.courseData = { proficiency: competency(), lang: 'en', ...over } as any
  }

  /** Lets the nested async callbacks settle. */
  const settle = async () => {
    for (let i = 0; i < 10; i = i + 1) {
      await Promise.resolve()
    }
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  // ------------------------------------------------ createSelfAssessmentCourse --

  describe('createSelfAssessmentCourse', () => {
    it('names the course after the competency', async () => {
      const { component, mocks } = build()
      ready(component)
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.createSelfAssessmentCourse()
      await settle()
      // courseData is replaced by the refreshed course, so read the creation payload.
      const created = mocks.svc.createV2.mock.calls[0][0].name
      expect(created.courseName).toBe('Immunisation')
      expect(created.courseDescription).toBe('About immunisation')
      expect(mocks.svc.createForum).toHaveBeenCalledWith({
        category: { context: [{ type: 'course', identifier: 'do_new' }] },
      })
    })

    it('uses the Hindi wording for a Hindi course', async () => {
      const { component, mocks } = build()
      ready(component, { lang: 'hi' })
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.createSelfAssessmentCourse()
      await settle()
      const created = mocks.svc.createV2.mock.calls[0][0].name
      expect(created.courseName).toBe('टीकाकरण')
      expect(created.courseDescription).toBe('टीकाकरण के बारे में')
    })

    it('falls back to the default wording when no Hindi text exists', async () => {
      const { component, mocks } = build()
      const bare = competency({ 'lang-hi-name': undefined, 'lang-hi-description': undefined })
      ready(component, { lang: 'hi' })
      component.courseData.proficiency = bare as any
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.createSelfAssessmentCourse()
      await settle()
      expect(mocks.svc.createV2.mock.calls[0][0].name.courseName).toBe('Immunisation')
    })

    it('does nothing without a chosen content type', async () => {
      const { component, mocks } = build()
      ready(component)
      component.content = undefined as any
      component.createSelfAssessmentCourse()
      await settle()
      expect(mocks.svc.createV2).not.toHaveBeenCalled()
    })

    it('does nothing without a named competency', async () => {
      const { component, mocks } = build()
      ready(component)
      component.courseData.proficiency = { name: '', description: '' } as any
      component.createSelfAssessmentCourse()
      await settle()
      expect(mocks.svc.createV2).not.toHaveBeenCalled()
    })

    it('marks the new course as a competency course and seeds its levels', async () => {
      const { component, mocks } = build()
      ready(component)
      const setContentType = jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.createSelfAssessmentCourse()
      await settle()
      const [body, id] = mocks.editorService.updateNewContentV3.mock.calls[0]
      expect(id).toBe('do_new')
      expect(body.request.content).toEqual(
        expect.objectContaining({
          competency: true,
          lang: 'en',
          versionKey: 'vk1',
          competencies_v1: [{ competencyName: 'Immunisation', competencyId: '42' }],
        }),
      )
      expect(setContentType).toHaveBeenCalledWith(
        'assessment',
        expect.objectContaining({ level: 1, name: 'Basic', description: 'Level one' }),
        '',
      )
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_new/collection', expect.anything())
    })

    it('skips the level seeding for a competency with no levels', async () => {
      const { component, mocks } = build()
      ready(component)
      component.courseData.proficiency = competency({ levels: [] }) as any
      const setContentType = jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.createSelfAssessmentCourse()
      await settle()
      expect(setContentType).not.toHaveBeenCalled()
      expect(mocks.router.navigateByUrl).toHaveBeenCalled()
    })

    it('defaults the language to English', async () => {
      const { component, mocks } = build()
      ready(component, { lang: undefined })
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.createSelfAssessmentCourse()
      await settle()
      const [body] = mocks.editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.lang).toBe('en')
    })

    it('stops when the competency update fails', async () => {
      const { component, mocks } = build()
      ready(component)
      mocks.editorService.updateNewContentV3.mockReturnValue(throwError(() => new Error('boom')))
      component.createSelfAssessmentCourse()
      await settle()
      expect(mocks.router.navigateByUrl).not.toHaveBeenCalled()
    })

    it('shows the error parser when creation conflicts', async () => {
      const { component, mocks } = build()
      ready(component)
      mocks.svc.createV2.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.createSelfAssessmentCourse()
      await settle()
      expect(mocks.dialog.open).toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('only notifies on a non-conflict creation failure', async () => {
      const { component, mocks } = build()
      ready(component)
      mocks.svc.createV2.mockReturnValue(throwError(() => ({ status: 500 })))
      component.createSelfAssessmentCourse()
      await settle()
      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('still opens the new course when the forum creation fails', async () => {
      // Sunbird Spark has no Kong route for the forum API, so this 404s. The forum is
      // ancillary -- the competency course itself is already created.
      const { component, mocks } = build()
      ready(component)
      mocks.svc.createForum.mockReturnValue(throwError(() => ({ status: 404 })))
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)

      component.createSelfAssessmentCourse()
      await settle()

      expect(mocks.svc.createForum).toHaveBeenCalled()
      expect(mocks.editorService.updateNewContentV3).toHaveBeenCalled()
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_new/collection', expect.anything())
    })
  })
})
