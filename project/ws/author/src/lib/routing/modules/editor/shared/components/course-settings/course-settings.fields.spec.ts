import { TestBed } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { BehaviorSubject, of } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

/**
 * Wave 18 — `assignFields`: how each form control is seeded from the stored
 * metadata, from the configured default, or from the expiry rule, and how the
 * submitted state drives the dirty/pristine marking.
 */
describe('CourseSettingsComponent (field assignment)', () => {
  let component: CourseSettingsComponent
  let fb: FormBuilder
  let contentService: any
  let authInitService: any

  /** Answers for any field name, so every control finds a config entry. */
  const authConfigFor = (type: string) => new Proxy({}, { get: () => ({ type, defaultValue: { Course: [{ value: 'the-default' }] } }) })

  const build = () => {
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
      authConfig: authConfigFor('string'),
      isEditMetaPageAction: jest.fn(),
      uploadData: jest.fn(),
    }

    return new CourseSettingsComponent(
      fb,
      { upload: jest.fn(() => of({})) } as any,
      { open: jest.fn(), openFromComponent: jest.fn() } as any,
      { open: jest.fn(() => ({ afterClosed: () => of(false) })) } as any,
      {
        getAllEntities: jest.fn(() => of({ result: { entity: [] } })),
        readcontentV3: jest.fn(() => of({ duration: 0, identifier: 'id', name: 'n', children: [] })),
        rolesMapped: jest.fn(() => of([])),
        sourceNames: jest.fn(() => of([])),
        fetchEmployeeList: jest.fn(() => of([])),
        updateNewContentV3: jest.fn(() => of({})),
        checkRole: jest.fn(() => of(['admin'])),
      } as any,
      contentService,
      {
        userProfile: { userId: 'u1', givenName: 'User One' },
        instanceConfig: { authoring: { urlPatternMatching: [] }, logos: { defaultContent: 'default.png' } },
        activeLocale: { locals: ['en'] },
      } as any,
      { detach: jest.fn(), detectChanges: jest.fn() } as any,
      { changeLoad: { next: jest.fn() } } as any,
      authInitService,
      { rootOrg: 'other', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } } as any,
      { post: jest.fn(() => of({ result: { identifier: 'newId' } })) } as any,
      { url: '/author/editor/abc/collection', navigate: jest.fn(() => Promise.resolve(true)), events: of() } as any,
      { parentData: null } as any,
    )
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    TestBed.configureTestingModule({ imports: [ReactiveFormsModule] })
    fb = TestBed.inject(FormBuilder)
    component = build()
    component.ordinals = authInitService.ordinals
    component.createForm()
    jest.spyOn(component, 'storeData').mockImplementation(() => undefined)
  })

  afterEach(() => {
    if (component && component.timer) {
      clearInterval(component.timer)
    }
    jest.restoreAllMocks()
  })

  const withMeta = (over: any = {}) => {
    component.contentMeta = { identifier: 'do_1', contentType: 'Course', ...over } as any
  }

  describe('seeding from the stored metadata', () => {
    it('takes a field the content already carries', () => {
      withMeta({ name: 'A real course' })
      component.assignFields()
      expect(component.contentForm.controls.name.value).toBe('A real course')
    })

    it('takes a false boolean rather than treating it as absent', () => {
      authInitService.authConfig = authConfigFor('boolean')
      withMeta({ isIframeSupported: false })
      component.assignFields()
      expect(component.contentForm.controls.isIframeSupported.value).toBe(false)
    })

    it('falls back to the configured default for an absent field', () => {
      withMeta({})
      component.assignFields()
      expect(component.contentForm.controls.name.value).toBe('the-default')
    })

    it('copies the source name across', () => {
      withMeta({ sourceName: 'NHM' })
      component.assignFields()
      expect(component.contentForm.controls.sourceName.value).toBe('NHM')
    })

    it('re-enables editing once the fields are seeded', () => {
      withMeta({})
      component.assignFields()
      expect(component.canUpdate).toBe(true)
      expect(component.storeData).toHaveBeenCalled()
    })

    it('marks a competency course as a self assessment', () => {
      withMeta({ competency: true })
      component.assignFields()
      expect(component.isSelfAssessment).toBe(true)
    })

    it('restores the stored competency once the list has loaded', () => {
      const initializeForm = jest.spyOn(component, 'initializeForm').mockImplementation(() => undefined)
      component.proficiencyList = [{ entityId: 1, name: 'Comp' }] as any
      withMeta({ competency: true })
      component.assignFields()
      expect(initializeForm).toHaveBeenCalled()
    })

    it('waits for the competency list before restoring', () => {
      const initializeForm = jest.spyOn(component, 'initializeForm').mockImplementation(() => undefined)
      component.proficiencyList = [] as any
      withMeta({ competency: true })
      component.assignFields()
      expect(initializeForm).not.toHaveBeenCalled()
    })

    it('builds the form first when there is none yet', () => {
      component.contentForm = undefined as any
      withMeta({})
      component.assignFields()
      expect(component.contentForm).toBeTruthy()
    })
  })

  describe('the submitted state', () => {
    it('shows the validation errors once submit was pressed', () => {
      component.isSubmitPressed = true
      withMeta({})
      component.assignFields()
      expect(component.contentForm.dirty).toBe(true)
      expect(component.contentForm.touched).toBe(true)
    })

    it('leaves the form untouched before submit', () => {
      component.isSubmitPressed = false
      withMeta({})
      component.assignFields()
      expect(component.contentForm.dirty).toBe(false)
      expect(component.contentForm.touched).toBe(false)
    })
  })
})
