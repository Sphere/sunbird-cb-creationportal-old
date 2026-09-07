import { TestBed } from '@angular/core/testing'
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

/**
 * Covers the interaction paths the sibling course-settings.component.spec.ts leaves
 * out: showError, the employee/contact autocomplete, the ordinal filter helpers,
 * copyData, the catalog selector, and onSubmit.
 */
describe('CourseSettingsComponent (interactions)', () => {
  let component: CourseSettingsComponent
  let fb: FormBuilder

  let editorService: any
  let contentService: any
  let configSvc: any
  let ref: any
  let loader: any
  let authInitService: any
  let accessService: any
  let http: any
  let router: any
  let storeService: any
  let snackBar: any
  let dialog: any
  let uploadService: any

  const fullOrdinals = () => ({
    audience: ['Employee', 'Manager'],
    jobProfile: ['Engineer', 'Analyst'],
    complexityLevel: ['easy'],
    resourceType: ['R1'],
    categoryType: ['C1'],
    region: ['North', 'South'],
    accessPaths: ['pathA', 'pathB'],
    'Offering Mode': ['Online'],
  })

  const build = () => {
    editorService = {
      getAllEntities: jest.fn(() => of({ result: { entity: [] } })),
      readcontentV3: jest.fn(() => of({ duration: 0, identifier: 'id', name: 'n' })),
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
    ref = { detach: jest.fn(), detectChanges: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    authInitService = {
      ordinals: fullOrdinals(),
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      authConfig: {},
      isEditMetaPageAction: jest.fn(),
      uploadData: jest.fn(),
    }
    accessService = { rootOrg: 'other', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } }
    http = { post: jest.fn(() => of({ result: { identifier: 'newId' } })) }
    router = { url: '/author/editor/abc/collection', navigate: jest.fn(() => Promise.resolve(true)), events: of() }
    storeService = { parentData: null }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(false) })) }
    uploadService = { upload: jest.fn(() => of({})) }

    return new CourseSettingsComponent(
      fb,
      uploadService,
      snackBar,
      dialog,
      editorService,
      contentService,
      configSvc,
      ref,
      loader,
      authInitService,
      accessService,
      http,
      router,
      storeService,
    )
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    TestBed.configureTestingModule({ imports: [ReactiveFormsModule] })
    fb = TestBed.inject(FormBuilder)
    component = build()
  })

  afterEach(() => {
    if (component && component.timer) {
      clearInterval(component.timer)
    }
    jest.restoreAllMocks()
  })

  describe('showError', () => {
    beforeEach(() => {
      component.createForm()
      component.contentMeta = { identifier: 'id' } as any
    })

    it('is false when the field is not required', () => {
      contentService.checkCondition.mockReturnValue(false)
      expect(component.showError('name')).toBe(false)
    })

    it('is false when the required field is already filled', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(true)
      expect(component.showError('name')).toBe(false)
    })

    it('is true for a missing required field once submit was pressed', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = true
      expect(component.showError('name')).toBe(true)
    })

    it('is true for a missing required field the user has touched', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = false
      component.contentForm.controls.name.markAsTouched()
      expect(component.showError('name')).toBe(true)
    })

    it('stays quiet for an untouched field before submit', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = false
      expect(component.showError('name')).toBe(false)
    })

    it('stays quiet for a field that is not on the form', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = false
      expect(component.showError('notAControl')).toBe(false)
    })
  })

  describe('removeEmployee', () => {
    it('drops the employee from the field value', () => {
      component.createForm()
      const a = { id: '1', name: 'A' }
      const b = { id: '2', name: 'B' }
      component.contentForm.controls.trackContacts.setValue([a, b])

      component.removeEmployee(a as any, 'trackContacts')

      expect(component.contentForm.controls.trackContacts.value).toEqual([b])
    })
  })

  describe('addEmployee', () => {
    const selectEvent = (value: any): any => ({ option: { value } })

    beforeEach(() => {
      component.createForm()
      component.contentForm.controls.trackContacts.setValue([])
      ;(component as any).trackContactsView = { nativeElement: { value: 'typed' } }
      ;(component as any).trackContactsCtrl = new FormControl('typed')
    })

    it('ignores an option with no id', () => {
      component.addEmployee(selectEvent({ displayName: 'No Id' }), 'trackContacts')
      expect(component.contentForm.controls.trackContacts.value).toEqual([])
      expect(loader.changeLoad.next).not.toHaveBeenCalled()
    })

    it('adds the selected person when no unique check is configured', () => {
      component.addEmployee(selectEvent({ id: '9', displayName: 'Nine' }), 'trackContacts')

      expect(component.contentForm.controls.trackContacts.value).toEqual([{ id: '9', name: 'Nine' }])
      expect(editorService.checkRole).not.toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('clears the typed text and the autocomplete control afterwards', () => {
      component.addEmployee(selectEvent({ id: '9', displayName: 'Nine' }), 'trackContacts')

      expect((component as any).trackContactsView.nativeElement.value).toBe('')
      expect((component as any).trackContactsCtrl.value).toBeNull()
    })

    it('accepts a reviewer for trackContacts when the unique check passes', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(of(['reviewer']))

      component.addEmployee(selectEvent({ id: '9', displayName: 'Nine' }), 'trackContacts')

      expect(editorService.checkRole).toHaveBeenCalledWith('9')
      expect(component.contentForm.controls.trackContacts.value).toEqual([{ id: '9', name: 'Nine' }])
    })

    it('rejects a person without a suitable role', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(of(['learner']))

      component.addEmployee(selectEvent({ id: '9', displayName: 'Nine' }), 'trackContacts')

      expect(component.contentForm.controls.trackContacts.value).toEqual([])
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('accepts a publisher for publisherDetails', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(of(['publisher']))
      component.contentForm.controls.publisherDetails.setValue([])
      ;(component as any).publisherDetailsView = { nativeElement: { value: '' } }
      ;(component as any).publisherDetailsCtrl = new FormControl(null)

      component.addEmployee(selectEvent({ id: '9', displayName: 'Nine' }), 'publisherDetails')

      expect(component.contentForm.controls.publisherDetails.value).toEqual([{ id: '9', name: 'Nine' }])
    })

    it('lets the current user add themselves as publisher', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(of(['learner']))
      component.contentForm.controls.publisherDetails.setValue([])
      ;(component as any).publisherDetailsView = { nativeElement: { value: '' } }
      ;(component as any).publisherDetailsCtrl = new FormControl(null)

      component.addEmployee(selectEvent({ id: 'u1', displayName: 'Me' }), 'publisherDetails')

      expect(component.contentForm.controls.publisherDetails.value).toEqual([{ id: 'u1', name: 'Me' }])
    })

    it('reports a failure when the role lookup errors', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(throwError(() => new Error('api down')))

      component.addEmployee(selectEvent({ id: '9', displayName: 'Nine' }), 'trackContacts')

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.contentForm.controls.trackContacts.value).toEqual([])
    })
  })

  describe('removeField', () => {
    it('clears the chip input', () => {
      const input = { value: 'typed' }
      component.removeField({ input } as any)
      expect(input.value).toBe('')
    })

    it('tolerates an event with no input element', () => {
      expect(() => component.removeField({} as any)).not.toThrow()
    })
  })

  describe('ordinal filter helpers', () => {
    // ngOnInit normally copies these across from AuthInitService.
    beforeEach(() => {
      component.ordinals = fullOrdinals()
    })

    it('fetchAudience returns the whole list when nothing is typed', () => {
      component.audienceCtrl = new FormControl('')
      ;(component as any).fetchAudience()
      expect(component.audienceList).toEqual(['Employee', 'Manager'])
    })

    it('fetchAudience filters case-insensitively', () => {
      component.audienceCtrl = new FormControl('man')
      ;(component as any).fetchAudience()
      expect(component.audienceList).toEqual(['Manager'])
    })

    it('fetchJobProfile returns the whole list when nothing is typed', () => {
      component.jobProfileCtrl = new FormControl('  ')
      ;(component as any).fetchJobProfile()
      expect(component.jobProfileList).toEqual(['Engineer', 'Analyst'])
    })

    it('fetchJobProfile filters by substring', () => {
      component.jobProfileCtrl = new FormControl('analy')
      ;(component as any).fetchJobProfile()
      expect(component.jobProfileList).toEqual(['Analyst'])
    })

    it('fetchRegion filters when text is typed', () => {
      component.regionCtrl = new FormControl('sou')
      ;(component as any).fetchRegion()
      expect(component.regionList).toEqual(['South'])
    })

    it('fetchRegion shows nothing until the user types', () => {
      component.regionCtrl = new FormControl('')
      ;(component as any).fetchRegion()
      expect(component.regionList).toEqual([])
    })

    it('fetchAccessRestrictions matches on prefix only', () => {
      component.accessPathsCtrl = new FormControl('path')
      ;(component as any).fetchAccessRestrictions()
      expect(component.accessPathList).toEqual(['pathA', 'pathB'])

      component.accessPathsCtrl = new FormControl('athA')
      ;(component as any).fetchAccessRestrictions()
      expect(component.accessPathList).toEqual([])
    })

    it('fetchAccessRestrictions returns everything when nothing is typed', () => {
      component.accessPathsCtrl = new FormControl('')
      ;(component as any).fetchAccessRestrictions()
      expect(component.accessPathList).toEqual(['pathA', 'pathB'])
    })

    it('fetchRolesMapped is currently a no-op', () => {
      expect(() => (component as any).fetchRolesMapped()).not.toThrow()
    })
  })

  describe('openCatalogSelector', () => {
    it('opens the selector seeded with the Common-prefixed catalogs', () => {
      component.createForm()
      component.contentForm.controls.catalogPaths.setValue(['A', 'Common>B'])

      component.openCatalogSelector()

      expect(dialog.open).toHaveBeenCalled()
      expect(dialog.open.mock.calls[0][1].data).toEqual(['Common>A', 'Common>B'])
    })

    it('writes the dialog result back onto the form', () => {
      component.createForm()
      component.contentForm.controls.catalogPaths.setValue([])
      dialog.open.mockReturnValue({ afterClosed: () => of(['Common>X']) })

      component.openCatalogSelector()

      expect(component.contentForm.controls.catalogPaths.value).toEqual(['Common>X'])
    })
  })

  describe('removeSkill', () => {
    it('removes the named skill', () => {
      component.selectedSkills = ['a', 'b', 'c']
      component.removeSkill('b')
      expect(component.selectedSkills).toEqual(['a', 'c'])
    })

    // Documents current behaviour: indexOf returns -1 for an unknown skill and
    // splice(-1, 1) then drops the LAST entry. Pinned so the day this is fixed the
    // test fails loudly rather than the behaviour changing unnoticed.
    it('currently drops the last entry when asked to remove an unknown skill', () => {
      component.selectedSkills = ['a', 'b']
      component.removeSkill('zzz')
      expect(component.selectedSkills).toEqual(['a'])
    })
  })

  describe('copyData', () => {
    beforeEach(() => {
      component.createForm()
      component.contentMeta = { identifier: 'content1' } as any
      ;(document as any).execCommand = jest.fn()
    })

    it('copies the keywords and confirms with a snackbar', () => {
      component.contentForm.controls.keywords.setValue('alpha,beta')

      component.copyData('keyword')

      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(document.querySelector('textarea')).toBeNull()
    })

    it('copies a preview url carrying the collection context', () => {
      component.contentForm.controls.mimeType.setValue('application/pdf')
      const appendSpy = jest.spyOn(document.body, 'appendChild')

      component.copyData('previewUrl')

      const box: any = appendSpy.mock.calls[0][0]
      expect(box.value).toContain('/author/viewer/')
      expect(box.value).toContain('content1')
      expect(box.value).toContain('collectionId=parent1')
      expect(box.value).toContain('collectionType=Course')
    })
  })

  describe('onSubmit', () => {
    it('hands the course data to the store and announces the submit', async () => {
      const emitted: boolean[] = []
      component.courseEditFormSubmit.subscribe(v => emitted.push(v))
      component.courseData = { identifier: 'course1' } as any

      await component.onSubmit()

      expect(storeService.parentData).toEqual({ identifier: 'course1' })
      expect(emitted).toEqual([true])
    })
  })

  describe('parseJsonData', () => {
    it('parses valid JSON', () => {
      expect(component.parseJsonData('{"a":1}')).toEqual({ a: 1 })
    })

    it('falls back to an empty list for invalid JSON', () => {
      expect(component.parseJsonData('nope')).toEqual([])
    })
  })

  describe('updateReviewer', () => {
    it('is currently a no-op', () => {
      expect(() => component.updateReviewer()).not.toThrow()
    })
  })
})
