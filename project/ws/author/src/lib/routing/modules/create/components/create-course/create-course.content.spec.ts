import { FormBuilder } from '@angular/forms'
import { EMPTY, of, throwError } from 'rxjs'

import { CreateCourseComponent } from './create-course.component'

/**
 * Covers the content-creation paths the sibling create-course.component.spec.ts
 * leaves out: langSelected, the contentClicked failure branches, and setContentType.
 */
describe('CreateCourseComponent (content creation)', () => {
  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const fb = new FormBuilder()
    const mocks: any = {
      snackBar: { openFromComponent: jest.fn(), open: jest.fn() },
      svc: {},
      router: { navigateByUrl: jest.fn() },
      loaderService: { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue({ afterClosed: () => EMPTY }) },
      authInitService: { creationEntity: [] },
      accessControlSvc: { locale: 'en', userId: 'u1', userName: 'User One' },
      editorService: { getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })) },
      configSvc: { instanceConfig: { logos: { defaultContent: 'default.png' } }, userProfile: { userId: 'u1', userName: 'User One' } },
      loader: { changeLoad: { next: jest.fn() } },
      http: { post: jest.fn().mockReturnValue(EMPTY) },
      route: { queryParams: of({}) },
      uploadService: { upload: jest.fn().mockReturnValue(EMPTY) },
      storeService: { parentNode: [] },
      editorStore: {},
      resolverService: {},
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
    return { component, mocks }
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('langSelected', () => {
    it('reloads the proficiency list for the chosen language', () => {
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [{ entityId: '1', name: 'Comp' }] } })),
      }
      const { component } = build({ editorService })
      component.ngOnInit()

      component.langSelected('hi')

      expect(component.lang).toBe('hi')
      expect(component.proficiency).toBeNull()
      expect(editorService.getAllEntities).toHaveBeenLastCalledWith('hi')
      expect(component.proficiencyList).toEqual([{ entityId: '1', name: 'Comp' }])
      expect(component.searchComp).toEqual([{ entityId: '1', name: 'Comp' }])
    })

    it('clears the proficiency control so the autocomplete text resets', () => {
      const { component } = build()
      component.ngOnInit()
      component.createSelfAssessmentForm.controls['proficiency'].setValue('stale')

      component.langSelected('en')

      expect(component.createSelfAssessmentForm.controls['proficiency'].value).toBe('')
    })
  })

  describe('contentClicked failure handling', () => {
    const readyComponent = (svc: any, extra: any = {}) => {
      const { component, mocks } = build({ svc, ...extra })
      component.content = { contentType: 'Course', mimeType: 'm', primaryCategory: 'Course' }
      component.courseData = { courseName: 'My Course' }
      return { component, mocks }
    }

    it('does nothing when there is no content selected', () => {
      const svc = { createV2: jest.fn() }
      const { component } = build({ svc })
      component.content = null
      component.courseData = { courseName: 'X' }
      component.contentClicked()
      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('does nothing when the course has no name', () => {
      const svc = { createV2: jest.fn() }
      const { component } = build({ svc })
      component.content = { contentType: 'Course' }
      component.courseData = {}
      component.contentClicked()
      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('notifies and clears the loader when creation fails', () => {
      const svc = { createV2: jest.fn().mockReturnValue(throwError(() => ({ status: 500 }))), createForum: jest.fn() }
      const { component, mocks } = readyComponent(svc)

      component.contentClicked()

      expect(mocks.dialog.open).not.toHaveBeenCalled()
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('opens the error parser on a 409 conflict', () => {
      const svc = {
        createV2: jest.fn().mockReturnValue(throwError(() => ({ status: 409, error: { detail: 'dup' } }))),
        createForum: jest.fn(),
      }
      const { component, mocks } = readyComponent(svc)

      component.contentClicked()

      expect(mocks.dialog.open).toHaveBeenCalled()
      expect(mocks.dialog.open.mock.calls[0][1].data.errorFromBackendData).toEqual({ detail: 'dup' })
    })

    it('sends the extra metadata declared on the content type', () => {
      const svc = {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'id1', versionKey: 'v1' })),
        createForum: jest.fn().mockReturnValue(EMPTY),
      }
      const { component } = readyComponent(svc)
      component.content = { contentType: 'Course', mimeType: 'm', primaryCategory: 'Course', additionalMeta: { extra: true } }

      component.contentClicked()

      expect(svc.createV2.mock.calls[0][0].extra).toBe(true)
    })

    it('carries on when the follow-up content update fails', async () => {
      const svc = {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'id1', versionKey: 'v1' })),
        createForum: jest.fn().mockReturnValue(of({})),
      }
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        updateNewContentV3: jest.fn().mockReturnValue(throwError(() => new Error('nope'))),
      }
      const progressSvc = { addComment: jest.fn().mockReturnValue(of({})) }
      const { component, mocks } = readyComponent(svc, { editorService, progressSvc })

      component.contentClicked()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/id1')
    })

    it('carries on when the activity comment fails', async () => {
      const svc = {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'id1', versionKey: 'v1' })),
        createForum: jest.fn().mockReturnValue(of({})),
      }
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        updateNewContentV3: jest.fn().mockReturnValue(of({})),
      }
      const progressSvc = { addComment: jest.fn().mockReturnValue(throwError(() => new Error('nope'))) }
      const { component, mocks } = readyComponent(svc, { editorService, progressSvc })

      component.contentClicked()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/id1')
    })

    it('records the creator against the new course', async () => {
      const svc = {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'id1', versionKey: 'v1' })),
        createForum: jest.fn().mockReturnValue(of({})),
      }
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        updateNewContentV3: jest.fn().mockReturnValue(of({})),
      }
      const progressSvc = { addComment: jest.fn().mockReturnValue(of({})) }
      const { component } = readyComponent(svc, { editorService, progressSvc })

      component.contentClicked()
      await new Promise(resolve => setTimeout(resolve, 0))

      const comment = progressSvc.addComment.mock.calls[0][0]
      expect(comment.userId).toBe('u1')
      expect(comment.courseId).toBe('id1')
      expect(comment.role).toBe('creator')
      expect(comment.nextStatus).toBe('Draft')
    })

    it('carries on when the forum creation fails', async () => {
      // Sunbird Spark has no Kong route for the forum API, so this 404s. The forum is
      // ancillary -- the author must still reach the editor for the new course.
      const svc = {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'id1', versionKey: 'v1' })),
        createForum: jest.fn().mockReturnValue(throwError(() => ({ status: 404 }))),
      }
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        updateNewContentV3: jest.fn().mockReturnValue(of({})),
      }
      const progressSvc = { addComment: jest.fn().mockReturnValue(of({})) }
      const { component, mocks } = readyComponent(svc, { editorService, progressSvc })

      component.contentClicked()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(svc.createForum).toHaveBeenCalled()
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/id1')
      expect(mocks.snackBar.openFromComponent.mock.calls[0][1].data.type).toBe('CONTENT_CREATE_SUCCESS')
    })
  })

  describe('setContentType', () => {
    const wire = (over: any = {}) => {
      const storeService = {
        parentNode: ['course1'],
        currentParentNode: 1,
        currentSelectedNode: 1,
        lexIdMap: new Map<string, number[]>([['newLex', [7]]]),
        selectedNodeChange: { next: jest.fn() },
        uploadFileType: { next: jest.fn() },
        createChildOrSibling: jest.fn().mockResolvedValue(true),
        getNewTreeHierarchys: jest.fn().mockReturnValue({ course1: { root: true, children: [] } }),
        parentData: null,
        ...over.storeService,
      }
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'course1', children: [] })),
        updateContentV4: jest.fn().mockReturnValue(of({ identifier: 'course1', children: [] })),
        newCreatedLexid: 'newLex',
        resourseID: 'res1',
        ...over.editorService,
      }
      const editorStore = { parentContent: 'course1', getNodeModifyData: jest.fn().mockReturnValue({}), currentContent: '' }
      const { component, mocks } = build({ storeService, editorService, editorStore })
      component.courseData = { identifier: 'course1', children: [] }
      return { component, mocks, storeService, editorService, editorStore }
    }

    it('creates the child and refreshes the course tree', async () => {
      const { component, storeService, editorService } = wire()

      await component.setContentType('upload', { level: 1, name: 'Res' })

      expect(component.resourseSelected).toBe('upload')
      expect(storeService.createChildOrSibling).toHaveBeenCalled()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('course1')
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('publishes the chosen upload file type', async () => {
      const { component, storeService } = wire()

      await component.setContentType('upload', { level: 1 }, 'application/pdf')

      expect(storeService.uploadFileType.next).toHaveBeenCalledWith('application/pdf')
    })

    it('names the new node from the level and falls back to Resource', async () => {
      const { component, storeService } = wire()

      await component.setContentType('upload', { level: 2 })

      const newData = storeService.createChildOrSibling.mock.calls[0][4]
      expect(newData.topicName).toBe('Level 2 : Resource')
      expect(newData.topicDescription).toBe('')
      expect(newData.isAssessment).toBe(true)
    })

    it('uses the level name and description when present', async () => {
      const { component, storeService } = wire()

      await component.setContentType('upload', { level: 3, name: 'Intro', description: 'About' })

      const newData = storeService.createChildOrSibling.mock.calls[0][4]
      expect(newData.topicName).toBe('Level 3 : Intro')
      expect(newData.topicDescription).toBe('About')
    })

    it('marks a web resource as a link', async () => {
      const { component, storeService } = wire()

      await component.setContentType('web', { level: 1 })

      expect(storeService.createChildOrSibling.mock.calls[0][5]).toBe('link')
    })

    it('seeds the store parent data for a collection', async () => {
      const { component, storeService } = wire()

      await component.setContentType({ type: 'collection' }, { level: 1 })

      expect(storeService.parentData).toEqual({ identifier: 'course1', children: [] })
    })

    it('grafts the new resource into the hierarchy under the course', async () => {
      const { component, editorService } = wire()

      await component.setContentType('upload', { level: 1 })

      const hierarchy = editorService.updateContentV4.mock.calls[0][0].request.data.hierarchy
      expect(hierarchy.res1).toEqual({ root: false, name: 'Resource 1', children: [] })
      expect(hierarchy.course1.children).toContain('res1')
    })

    it('names an assessment node accordingly', async () => {
      const { component, editorService } = wire()

      await component.setContentType('assessment', { level: 1 })

      expect(editorService.updateContentV4.mock.calls[0][0].request.data.hierarchy.res1.name).toBe('Assessment')
    })

    it('selects the freshly created node', async () => {
      const { component, storeService, editorStore } = wire()

      await component.setContentType('upload', { level: 1 })

      expect(storeService.currentSelectedNode).toBe(7)
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(7)
      expect(component.currentContent).toBe('newLex')
      expect(editorStore.currentContent).toBe('newLex')
    })

    it('does nothing further when the child could not be created', async () => {
      const { component, editorService } = wire({ storeService: { createChildOrSibling: jest.fn().mockResolvedValue(false) } })

      await component.setContentType('upload', { level: 1 })

      expect(editorService.updateContentV4).not.toHaveBeenCalled()
    })

    it('swallows an error from the create call', async () => {
      const { component } = wire({ storeService: { createChildOrSibling: jest.fn().mockRejectedValue(new Error('boom')) } })

      await expect(component.setContentType('upload', { level: 1 })).resolves.toBeUndefined()
    })
  })
})
