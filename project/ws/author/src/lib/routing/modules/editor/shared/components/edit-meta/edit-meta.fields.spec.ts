import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { EditMetaComponent } from './edit-meta.component'

/**
 * Wave 18 — `assignFields` in EditMetaComponent: the fresh read that seeds the
 * form, the course-duration roll-up it derives from the children, and the
 * per-control fallback to the configured default.
 */
describe('EditMetaComponent (field assignment)', () => {
  let component: EditMetaComponent
  let contentService: any
  let authInitService: any
  let editorService: any
  let loader: any

  /** Answers for any field name, so every control finds a config entry. */
  const authConfigFor = (type: string) => new Proxy({}, { get: () => ({ type, defaultValue: { Course: [{ value: 'the-default' }] } }) })

  /** The content as the fresh read returns it. */
  const readResponse = (over: any = {}) => ({
    identifier: 'do_1',
    contentType: 'Course',
    name: 'Course A',
    appIcon: 'icon.png',
    instructions: 'do this',
    lang: 'en',
    subTitle: 'sub',
    sourceName: 'NHM',
    gatingEnabled: false,
    courseVisibility: true,
    selfAssessment: false,
    versionKey: 'vk1',
    duration: '0',
    children: [],
    ...over,
  })

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  beforeEach(() => {
    contentService = {
      changeActiveCont: new Subject<any>(),
      getUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'do_1' }),
      getOriginalMeta: jest.fn().mockReturnValue(undefined),
      hasAccess: jest.fn().mockReturnValue(true),
      setUpdatedMeta: jest.fn(),
      parentUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'parent_1' }),
      checkCondition: jest.fn().mockReturnValue(false),
      isPresent: jest.fn().mockReturnValue(false),
      currentContentData: null,
      currentContentID: null,
    }
    authInitService = {
      ordinals: {
        audience: ['Beginner'],
        jobProfile: ['Engineer'],
        region: ['North'],
        accessPaths: ['pathA'],
        resourceType: ['Video'],
        categoryType: ['Cat1'],
        'Offering Mode': ['Online'],
        complexityLevel: ['Easy'],
      },
      authConfig: authConfigFor('string'),
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      uploadData: jest.fn(),
    }
    editorService = {
      languageList: jest.fn().mockReturnValue(of([])),
      fetchEmployeeList: jest.fn().mockReturnValue(of([])),
      readcontentV3: jest.fn().mockReturnValue(of(readResponse())),
      updateNewContentV3: jest.fn().mockReturnValue(of({})),
      checkReadAPI: jest.fn().mockReturnValue(of({ result: { content: {} } })),
      getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
      checkRole: jest.fn().mockReturnValue(of([])),
    }
    loader = { changeLoad: { next: jest.fn() } }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new EditMetaComponent(
      new FormBuilder(),
      { upload: jest.fn().mockReturnValue(of({})) } as any,
      { open: jest.fn(), openFromComponent: jest.fn() } as any,
      { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) } as any,
      editorService,
      contentService,
      {
        userProfile: { userId: 'u1' },
        instanceConfig: { logos: { defaultContent: 'default.png' }, authoring: {} },
        activeLocale: { locals: ['en'] },
      } as any,
      { detach: jest.fn(), detectChanges: jest.fn() } as any,
      loader,
      authInitService,
      { rootOrg: 'sunbird', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } } as any,
      { post: jest.fn().mockReturnValue(of({})) } as any,
      { url: '/author/editor/do_1/details' } as any,
    )
    component.ordinals = authInitService.ordinals
    component.createForm()
    component.contentMeta = { identifier: 'do_1', contentType: 'Course' } as any
    jest.spyOn(component, 'storeData').mockImplementation(() => undefined)
  })

  afterEach(() => {
    clearInterval((component as any).timer)
    jest.clearAllMocks()
  })

  describe('the fresh read', () => {
    it('seeds the form from the latest server data', () => {
      component.assignFields()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_1')
      expect(component.contentForm.controls.name.value).toBe('Course A')
      expect(component.contentForm.controls.appIcon.value).toBe('icon.png')
      expect(component.contentForm.controls.sourceName.value).toBe('NHM')
      expect(component.metaLoaded).toBe(true)
    })

    it('marks a self assessment competency as selected', () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ selfAssessment: true })))
      component.assignFields()
      expect(component.selectedSelfCompetency).toBe(true)
    })

    it('parses the stored competencies and loads the entity list', () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ competencies_v1: '[{"competencyId":"42"}]' })))
      const getAllEntity = jest.spyOn(component, 'getAllEntity').mockImplementation(() => undefined)
      component.assignFields()
      expect(getAllEntity).toHaveBeenCalled()
      expect(component.competencies).toEqual([{ competencyId: '42' }])
    })

    it('starts from no competencies when the content declares none', () => {
      component.assignFields()
      expect(component.competencies).toEqual([])
    })

    it('still reveals the form when the read fails', () => {
      editorService.readcontentV3.mockReturnValue(throwError(() => new Error('down')))
      component.assignFields()
      expect(component.metaLoaded).toBe(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('the duration roll-up', () => {
    it('sums the durations of every resource and nested resource', () => {
      const setDuration = jest.spyOn(component as any, 'setDuration').mockImplementation(() => undefined)
      editorService.readcontentV3.mockReturnValue(
        of(
          readResponse({
            children: [
              { identifier: 'do_a', duration: '30', children: [{ identifier: 'do_a1', duration: '20' }] },
              { identifier: 'do_b', duration: '10', children: [] },
            ],
          }),
        ),
      )
      component.assignFields()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('60')
      expect(body.request.content.versionKey).toBe('vk1')
      expect(setDuration).toHaveBeenCalledWith(60)
    })

    it('leaves the stored duration alone when it already matches', () => {
      jest.spyOn(component as any, 'setDuration').mockImplementation(() => undefined)
      component.contentMeta = { identifier: 'do_1', contentType: 'Course', duration: '40' } as any
      editorService.readcontentV3.mockReturnValue(
        of(readResponse({ duration: '40', children: [{ identifier: 'do_a', duration: '40', children: [] }] })),
      )
      component.assignFields()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('does nothing for children that declare no duration', () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ children: [{ identifier: 'do_a', children: [] }] })))
      component.assignFields()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('does nothing for a course with no children', () => {
      component.assignFields()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('the per-control fallback', () => {
    it('falls back to the configured default for an absent field', () => {
      component.assignFields()
      expect(component.contentForm.controls.description.value).toBe('the-default')
    })

    it('keeps a value the stored metadata already carries', () => {
      // assignFields replaces contentMeta with the fresh read, so seed it there.
      editorService.readcontentV3.mockReturnValue(of(readResponse({ description: 'Stored' })))
      component.assignFields()
      expect(component.contentForm.controls.description.value).toBe('Stored')
    })

    it('keeps a false boolean rather than treating it as absent', () => {
      authInitService.authConfig = authConfigFor('boolean')
      editorService.readcontentV3.mockReturnValue(of(readResponse({ exclusiveContent: false })))
      component.assignFields()
      expect(component.contentForm.controls.exclusiveContent.value).toBe(false)
    })

    it('re-enables editing once the fields are seeded', () => {
      component.assignFields()
      expect(component.canUpdate).toBe(true)
    })

    it('builds the form first when there is none yet', () => {
      component.contentForm = undefined as any
      component.assignFields()
      expect(component.contentForm).toBeTruthy()
    })

    it('survives a config that describes none of the fields', () => {
      authInitService.authConfig = {}
      expect(() => component.assignFields()).not.toThrow()
    })
  })
})
