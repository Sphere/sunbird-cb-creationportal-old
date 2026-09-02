import { TestBed, fakeAsync, tick } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

/**
 * Wave 18 — the contact autocompletes wired up in the constructor, the
 * competency/language selection (`eventSelection`), the creator-logo upload and the
 * remaining form-wiring branches of CourseSettingsComponent.
 */
describe('CourseSettingsComponent (autocomplete, competency and logo upload)', () => {
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
  let afterClosed: BehaviorSubject<any>

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
    afterClosed = new BehaviorSubject<any>(undefined)
    editorService = {
      getAllEntities: jest.fn(() => of({ result: { entity: [] } })),
      readcontentV3: jest.fn(() => of({ duration: 0, identifier: 'id', name: 'n', children: [] })),
      rolesMapped: jest.fn(() => of([])),
      sourceNames: jest.fn(() => of([])),
      fetchEmployeeList: jest.fn(() => of([{ id: 'u9', name: 'Someone' }])),
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
    dialog = { open: jest.fn(() => ({ afterClosed: () => afterClosed.asObservable() })) }
    uploadService = { upload: jest.fn(() => of({ result: { artifactUrl: 'https://cdn/logo.png' } })) }

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

  // -------------------------------------------------- contact autocompletes --

  describe('contact autocompletes', () => {
    // The autocomplete controls are created in ngOnInit.
    beforeEach(() => component.ngOnInit())

    /** Each control debounces 500ms before hitting the employee search. */
    const type = (control: any, value: any) => {
      control.setValue(value)
      tick(600)
    }

    it('searches all employees for a creator contact', fakeAsync(() => {
      type(component.creatorContactsCtrl, 'som')
      expect(editorService.fetchEmployeeList).toHaveBeenCalledWith('som')
      expect(component.employeeList).toEqual([{ id: 'u9', name: 'Someone' }])
      expect(component.fetchTagsStatus).toBe('done')
    }))

    it('searches reviewers for a track contact', fakeAsync(() => {
      type(component.trackContactsCtrl, 'som')
      expect(editorService.fetchEmployeeList).toHaveBeenCalledWith('som', 'CONTENT_REVIEWER')
    }))

    it('searches publishers for a publisher contact', fakeAsync(() => {
      type(component.publisherDetailsCtrl, 'som')
      expect(editorService.fetchEmployeeList).toHaveBeenCalledWith('som', 'CONTENT_PUBLISHER')
    }))

    it('searches all employees for an editor', fakeAsync(() => {
      type(component.editorsCtrl, 'som')
      expect(editorService.fetchEmployeeList).toHaveBeenCalledWith('som')
    }))

    it('searches any role for a creator detail', fakeAsync(() => {
      type(component.creatorDetailsCtrl, 'som')
      expect(editorService.fetchEmployeeList).toHaveBeenCalledWith('som', 'ANY_ROLE')
    }))

    it('does not search on an empty string', fakeAsync(() => {
      type(component.creatorContactsCtrl, '')
      expect(editorService.fetchEmployeeList).not.toHaveBeenCalled()
      expect(component.employeeList).toEqual([])
    }))

    it('ignores a selected object rather than a typed string', fakeAsync(() => {
      type(component.creatorContactsCtrl, { id: 'u9' })
      expect(editorService.fetchEmployeeList).not.toHaveBeenCalled()
    }))

    it('falls back to an empty list when the search returns nothing', fakeAsync(() => {
      editorService.fetchEmployeeList.mockReturnValue(of(null))
      type(component.creatorContactsCtrl, 'som')
      expect(component.employeeList).toEqual([])
      expect(component.fetchTagsStatus).toBe('done')
    }))

    it('stops fetching when the search fails', fakeAsync(() => {
      editorService.fetchEmployeeList.mockReturnValue(throwError(() => new Error('down')))
      type(component.trackContactsCtrl, 'som')
      expect(component.fetchTagsStatus).toBe('done')
    }))
  })

  // ------------------------------------------------------- ordinal pickers --

  describe('ordinal pickers', () => {
    beforeEach(() => component.ngOnInit())

    it('filters the audience list as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchAudience')
      component.audienceCtrl.setValue('Emp')
      tick(600)
      expect(fetch).toHaveBeenCalled()
    }))

    it('filters the roles list as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchRolesMapped')
      component.rolesMappedCtrl.setValue('Man')
      tick(600)
      expect(fetch).toHaveBeenCalled()
    }))

    it('filters the job profile list as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchJobProfile')
      component.jobProfileCtrl.setValue('Eng')
      tick(600)
      expect(fetch).toHaveBeenCalled()
    }))

    it('filters the region list as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchRegion')
      component.regionCtrl.setValue('Nor')
      tick(600)
      expect(fetch).toHaveBeenCalled()
    }))

    it('ignores an emptied region box', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchRegion')
      component.regionCtrl.setValue('')
      tick(600)
      expect(fetch).not.toHaveBeenCalled()
    }))

    it('filters the access paths as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchAccessRestrictions')
      component.accessPathsCtrl.setValue('path')
      tick(600)
      expect(fetch).toHaveBeenCalled()
    }))

    it('ignores an emptied access path box', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchAccessRestrictions')
      component.accessPathsCtrl.setValue('')
      tick(600)
      expect(fetch).not.toHaveBeenCalled()
    }))
  })

  // ------------------------------------------------------ active content --

  describe('active content changes', () => {
    beforeEach(() => component.ngOnInit())

    it('saves the open form before switching content', () => {
      const store = jest.spyOn(component, 'storeData').mockImplementation(() => undefined)
      component.contentMeta = { identifier: 'id' } as any
      component.canUpdate = true
      contentService.changeActiveCont.next('do_2')
      expect(store).toHaveBeenCalled()
      expect(contentService.getUpdatedMeta).toHaveBeenCalledWith('do_2')
    })
  })

  // -------------------------------------------------------- eventSelection --

  describe('eventSelection', () => {
    const competency = (over: any = {}) => ({
      name: 'Immunisation',
      description: 'About immunisation',
      entityId: 42,
      levels: [
        { levelNumber: 1, levelName: 'Basic', description: 'Level one' },
        { levelNumber: 2, levelName: 'Advanced', description: 'Level two' },
      ],
      ...over,
    })

    beforeEach(() => {
      component.contentMeta = {
        identifier: 'do_course',
        children: [
          { identifier: 'do_m1', versionKey: 'vk1' },
          { identifier: 'do_m2', versionKey: 'vk2' },
        ],
      } as any
      component.courseData = { name: '', description: '' } as any
    })

    it('does nothing for a competency with no levels', async () => {
      await component.eventSelection('en', competency({ levels: [] }))
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('does nothing when the competency has no levels at all', async () => {
      await component.eventSelection('en', {})
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('renames each module after the competency level and reloads', async () => {
      await component.eventSelection('en', competency())
      const calls = editorService.updateNewContentV3.mock.calls
      expect(calls[0][0].request.content.name).toBe('Level 1 : Basic')
      expect(calls[0][1]).toBe('do_m1')
      expect(calls[1][0].request.content.name).toBe('Level 2 : Advanced')
      expect(calls[2][0].request.content).toEqual(
        expect.objectContaining({
          name: 'Immunisation',
          description: 'About immunisation',
          lang: 'en',
          competencies_v1: [{ competencyName: 'Immunisation', competencyId: '42' }],
        }),
      )
      expect(router.navigate).toHaveBeenCalledWith(['/author/editor/do_course/collection'])
    })

    it('falls back to a generic level name and the level number', async () => {
      await component.eventSelection('en', competency({ levels: [{ level: 3, description: '' }] }))
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.name).toBe('Level 3 : Resource')
      expect(body.request.content.description).toBe('')
    })

    it('prefers the Hindi wording for a Hindi course', async () => {
      await component.eventSelection('hi', competency({ 'lang-hi-name': 'टीकाकरण', 'lang-hi-description': 'टीकाकरण के बारे में' }))
      const courseCall = editorService.updateNewContentV3.mock.calls.at(-1)
      expect(courseCall[0].request.content).toEqual(
        expect.objectContaining({
          name: 'टीकाकरण',
          description: 'टीकाकरण के बारे में',
          lang: 'hi',
          competencies_v1: [{ competencyName: 'टीकाकरण', competencyId: '42' }],
        }),
      )
    })

    it('falls back to the default wording when no Hindi text exists', async () => {
      await component.eventSelection('hi', competency())
      const courseCall = editorService.updateNewContentV3.mock.calls.at(-1)
      expect(courseCall[0].request.content.name).toBe('Immunisation')
    })

    it('survives a level rename failure', async () => {
      editorService.updateNewContentV3.mockReturnValue(throwError(() => new Error('boom')))
      await expect(component.eventSelection('en', competency())).resolves.toBeUndefined()
    })
  })

  // ----------------------------------------------------- uploadCreatorLogo --

  describe('creator logo upload', () => {
    const imageFile = (name = 'logo.png', size = 1000) => ({ name, size }) as File
    const cropped = () => new File(['bytes'], 'logo.png', { type: 'image/png' })

    beforeEach(() => {
      component.createForm()
      component.contentMeta = { identifier: 'do_course' } as any
    })

    it('rejects a file that is not an image', () => {
      component.uploadSourceIcon(imageFile('notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.uploadSourceIcon(imageFile('logo.png', 100 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('stores the cropped logo on the form', () => {
      const store = jest.spyOn(component, 'storeData').mockImplementation(() => undefined)
      component.uploadSourceIcon(imageFile())
      afterClosed.next(cropped())
      expect(uploadService.upload).toHaveBeenCalled()
      expect(component.contentForm.controls.creatorLogo.value).toBe('https://cdn/logo.png')
      expect(component.contentForm.controls.creatorThumbnail.value).toBe('https://cdn/logo.png')
      expect(component.contentForm.controls.creatorPosterImage.value).toBe('https://cdn/logo.png')
      expect(component.canUpdate).toBe(true)
      expect(store).toHaveBeenCalled()
    })

    it('does nothing when the crop is cancelled', () => {
      component.uploadSourceIcon(imageFile())
      afterClosed.next(undefined)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('ignores an upload that returns no result', () => {
      uploadService.upload.mockReturnValue(of({}))
      component.uploadSourceIcon(imageFile())
      afterClosed.next(cropped())
      expect(component.contentForm.controls.creatorLogo.value).toBeFalsy()
    })

    it('reports a failed upload', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('network')))
      component.uploadSourceIcon(imageFile())
      afterClosed.next(cropped())
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })

  // --------------------------------------------------------- form wiring --

  describe('form wiring', () => {
    beforeEach(() => {
      component.createForm()
    })

    it('filters the competency list as the author types', () => {
      const onKey = jest.spyOn(component, 'onKey').mockImplementation(() => undefined)
      component.competencySearchCtrl.setValue('imm')
      expect(onKey).toHaveBeenCalledWith('imm')
    })

    it('clears the stored competency when the box is emptied', () => {
      jest.spyOn(component, 'onKey').mockImplementation(() => undefined)
      component.competencies_v1 = { name: 'x' } as any
      component.competencySearchCtrl.setValue('')
      expect(component.competencies_v1).toBeNull()
      expect(component.contentForm.controls.competencies_v1.value).toBeNull()
    })

    it('ignores a selected competency object', () => {
      const onKey = jest.spyOn(component, 'onKey').mockImplementation(() => undefined)
      component.competencySearchCtrl.setValue({ name: 'Immunisation' })
      expect(onKey).not.toHaveBeenCalled()
    })

    it('re-derives the resource fields when the content type changes', () => {
      const changeResourceType = jest.spyOn(component, 'changeResourceType').mockImplementation(() => undefined)
      const filterOrdinals = jest.spyOn(component, 'filterOrdinals').mockImplementation(() => undefined)
      const changeMimeType = jest.spyOn(component, 'changeMimeType').mockImplementation(() => undefined)
      component.contentForm.controls.contentType.setValue('Course')
      expect(changeResourceType).toHaveBeenCalled()
      expect(filterOrdinals).toHaveBeenCalled()
      expect(changeMimeType).toHaveBeenCalled()
      expect(component.contentForm.controls.category.value).toBe('Course')
    })

    it('mirrors the resource type into the category type', () => {
      component.contentForm.controls.resourceType.setValue('R1')
      expect(component.contentForm.controls.categoryType.value).toBe('R1')
    })

    it('mirrors the resource category into the custom classifiers', () => {
      component.contentForm.controls.resourceCategory.setValue('C1')
      expect(component.contentForm.controls.customClassifiers.value).toBe('C1')
    })

    it('copies the creators into the publishers on the first stage', () => {
      component.stage = 1
      component.createForm()
      component.contentForm.controls.creatorContacts.setValue([{ id: 'u1' }])
      expect(component.contentForm.controls.publisherDetails.value).toEqual([{ id: 'u1' }])
    })

    it('seeds a default publisher', () => {
      expect(component.contentForm.controls.publisherDetails.value).toEqual(expect.objectContaining({ name: 'Publisher Aastrika' }))
    })

    it('sets the purpose from a chosen subtitle', () => {
      component.setPurposeValue('Some purpose')
      expect(component.contentForm.controls.purpose.value).toBe('Some purpose')
    })
  })
})
