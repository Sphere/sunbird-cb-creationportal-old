import { TestBed } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { BehaviorSubject, of } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

/**
 * Wave 18 — the `content` setter (the stringified-contact normalisation and the
 * expiry rule) and `initializeForm`'s competency restore in CourseSettingsComponent.
 */
describe('CourseSettingsComponent (content loading)', () => {
  let component: CourseSettingsComponent
  let fb: FormBuilder
  let editorService: any
  let contentService: any
  let configSvc: any
  let authInitService: any
  let accessService: any

  const build = () => {
    editorService = {
      getAllEntities: jest.fn(() => of({ result: { entity: [] } })),
      readcontentV3: jest.fn(() => of({ duration: 0, identifier: 'id', name: 'n', children: [] })),
      rolesMapped: jest.fn(() => of([])),
      sourceNames: jest.fn(() => of([])),
      fetchEmployeeList: jest.fn(() => of([])),
      updateNewContentV3: jest.fn(() => of({})),
      checkRole: jest.fn(() => of(['admin'])),
    }
    contentService = {
      parentUpdatedMeta: jest.fn(() => ({ identifier: 'parent1' })),
      getUpdatedMeta: jest.fn(() => ({ identifier: 'id' })),
      getOriginalMeta: jest.fn(() => undefined),
      setUpdatedMeta: jest.fn(),
      hasAccess: jest.fn(() => true),
      checkCondition: jest.fn(() => true),
      isPresent: jest.fn(() => false),
      changeActiveCont: new BehaviorSubject<string>('id'),
      currentContentID: '',
      currentContentData: null,
      parentContent: 'parent1',
    }
    configSvc = {
      userProfile: { userId: 'u1', givenName: 'User One' },
      instanceConfig: { authoring: { urlPatternMatching: [] }, logos: { defaultContent: 'default.png' } },
      activeLocale: { locals: ['en'] },
    }
    authInitService = {
      ordinals: {
        audience: ['Employee'],
        jobProfile: ['Engineer'],
        complexityLevel: ['easy'],
        resourceType: ['R1'],
        categoryType: ['C1'],
        region: ['North'],
        accessPaths: ['pathA'],
        'Offering Mode': ['Online'],
      },
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      authConfig: {},
      isEditMetaPageAction: jest.fn(),
      uploadData: jest.fn(),
    }
    accessService = { rootOrg: 'other', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } }

    return new CourseSettingsComponent(
      fb,
      { upload: jest.fn(() => of({})) } as any,
      { open: jest.fn(), openFromComponent: jest.fn() } as any,
      { open: jest.fn(() => ({ afterClosed: () => of(false) })) } as any,
      editorService,
      contentService,
      configSvc,
      { detach: jest.fn(), detectChanges: jest.fn() } as any,
      { changeLoad: { next: jest.fn() } } as any,
      authInitService,
      accessService,
      { post: jest.fn(() => of({})) } as any,
      { url: '/author/editor/abc/collection', navigate: jest.fn(() => Promise.resolve(true)), events: of() } as any,
      { parentData: null } as any,
    )
  }

  const meta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'A course',
      contentType: 'Course',
      createdBy: 'u1',
      expiryDate: '99991231T235959+0000',
      ...over,
    }) as any

  /** Assigns through the private `content` setter. */
  const setContent = (value: any) => {
    ;(component as any).content = value
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    TestBed.configureTestingModule({ imports: [ReactiveFormsModule] })
    fb = TestBed.inject(FormBuilder)
    component = build()
    // ngOnInit normally seeds these; the tests below drive the setter directly.
    component.ordinals = authInitService.ordinals
    component.createForm()
  })

  afterEach(() => {
    if (component && component.timer) {
      clearInterval(component.timer)
    }
    jest.restoreAllMocks()
  })

  // ------------------------------------------------------------- content --

  describe('content setter', () => {
    it('marks the signed-in author as the creator', () => {
      setContent(meta())
      expect(component.isEditEnabled).toBe(true)
    })

    it('does not treat another author as the creator', () => {
      setContent(meta({ createdBy: 'someone-else' }))
      expect(component.isEditEnabled).toBe(false)
    })

    it('blanks out the placeholder title', () => {
      setContent(meta({ name: 'Untitled Content' }))
      expect(component.contentMeta.name).toBe('')
    })

    it('keeps a real title', () => {
      setContent(meta({ name: 'A real course' }))
      expect(component.contentMeta.name).toBe('A real course')
    })

    it('parses a stringified author list', () => {
      setContent(meta({ creatorContacts: '[{"id":"c1"}]' }))
      expect(component.contentMeta.creatorContacts).toEqual([{ id: 'c1' }])
    })

    it('leaves an already-parsed author list alone', () => {
      setContent(meta({ creatorContacts: [{ id: 'c1' }] }))
      expect(component.contentMeta.creatorContacts).toEqual([{ id: 'c1' }])
    })

    it('parses a stringified reviewer list into the track contacts', () => {
      setContent(meta({ reviewer: '[{"id":"r1"}]' }))
      expect(component.contentMeta.trackContacts).toEqual([{ id: 'r1' }])
    })

    it('leaves an already-parsed reviewer list alone', () => {
      setContent(meta({ reviewer: [{ id: 'r1' }] }))
      expect(component.contentMeta.trackContacts).toBeUndefined()
    })

    it('wraps a stringified author detail in a list', () => {
      setContent(meta({ creatorDetails: '{"id":"cd1","name":"Ada"}' }))
      expect(component.contentMeta.creatorDetails).toEqual([{ id: 'cd1', name: 'Ada' }])
    })

    it('seeds the signed-in user as the default author', () => {
      setContent(meta({ creatorDetails: [] }))
      expect(component.contentMeta.creatorDetails).toEqual([{ id: component.userId, name: component.givenName }])
    })

    it('seeds the default author when the field is absent', () => {
      setContent(meta())
      expect(component.contentMeta.creatorDetails).toHaveLength(1)
    })

    it('keeps an existing author list', () => {
      setContent(meta({ creatorDetails: [{ id: 'cd1', name: 'Ada' }] }))
      expect(component.contentMeta.creatorDetails).toEqual([{ id: 'cd1', name: 'Ada' }])
    })

    it('parses a stringified publisher list', () => {
      setContent(meta({ publisherDetails: '[{"id":"p1"}]' }))
      expect(component.contentMeta.publisherDetails).toEqual([{ id: 'p1' }])
    })

    it('treats the sentinel date as no expiry', () => {
      setContent(meta())
      expect(component.canExpiry).toBe(false)
    })

    it('treats any other date as a real expiry', () => {
      setContent(meta({ expiryDate: '20261231T235959+0000' }))
      expect(component.canExpiry).toBe(true)
      expect(component.contentMeta.expiryDate).toBeTruthy()
    })

    it('blanks a malformed expiry date', () => {
      setContent(meta({ expiryDate: 'not-a-date' }))
      expect(component.canExpiry).toBe(true)
      expect(component.contentMeta.expiryDate).toBe('')
    })

    it('remembers the content it is editing', () => {
      setContent(meta())
      expect(contentService.currentContentID).toBe('do_1')
      expect(contentService.currentContentData).toBe(component.contentMeta)
    })
  })

  // ------------------------------------------------------------ isJsonString --

  describe('isJsonString', () => {
    it('recognises parseable json', () => {
      expect(component.isJsonString('{"a":1}')).toBe(true)
    })

    it('rejects anything else', () => {
      expect(component.isJsonString('nope')).toBe(false)
    })
  })

  // ---------------------------------------------------------- initializeForm --

  describe('initializeForm', () => {
    const competency = { entityId: 42, name: 'Immunisation' }

    beforeEach(() => {
      component.proficiencyList = [competency] as any
    })

    it('does nothing for content with no stored competency', () => {
      component.contentMeta = meta()
      component.initializeForm()
      expect(component.competencies_v1).toBeFalsy()
    })

    it('restores the competency from a stringified list', () => {
      component.contentMeta = meta({ competencies_v1: '[{"competencyId":"42"}]' })
      component.initializeForm()
      expect(component.competencies_v1).toBe(competency)
      expect(component.competencySearchCtrl.value).toBe(competency)
      expect(component.contentForm.controls.competencies_v1.value).toBe(competency)
    })

    it('restores the competency from a stringified single object', () => {
      component.contentMeta = meta({ competencies_v1: '{"competencyId":"42"}' })
      component.initializeForm()
      expect(component.competencies_v1).toBe(competency)
    })

    it('restores the competency from an already-parsed list', () => {
      component.contentMeta = meta({ competencies_v1: [{ competencyId: 42 }] })
      component.initializeForm()
      expect(component.competencies_v1).toBe(competency)
    })

    it('restores the competency from a single parsed object', () => {
      component.contentMeta = meta({ competencies_v1: { competencyId: 42 } })
      component.initializeForm()
      expect(component.competencies_v1).toBe(competency)
    })

    it('does nothing when the stored entry carries no competency id', () => {
      component.contentMeta = meta({ competencies_v1: [{ competencyName: 'Immunisation' }] })
      component.initializeForm()
      expect(component.competencies_v1).toBeFalsy()
    })

    it('does nothing when the stored competency is not in the list', () => {
      component.contentMeta = meta({ competencies_v1: [{ competencyId: '99' }] })
      component.initializeForm()
      expect(component.competencies_v1).toBeFalsy()
    })

    it('reports rather than throws on a malformed stored competency', () => {
      component.contentMeta = meta({ competencies_v1: '{not json' })
      expect(() => component.initializeForm()).not.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })
})
