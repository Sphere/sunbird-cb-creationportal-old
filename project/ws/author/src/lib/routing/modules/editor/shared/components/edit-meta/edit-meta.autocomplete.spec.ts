import { fakeAsync, tick } from '@angular/core/testing'
import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { EditMetaComponent } from './edit-meta.component'

/**
 * Wave 18 — the contact autocompletes and ordinal pickers that EditMetaComponent
 * wires up in ngOnInit. Direct instantiation, as with the sibling spec.
 */
describe('EditMetaComponent (autocompletes)', () => {
  let component: EditMetaComponent
  let editorService: any
  let contentService: any
  let changeActiveCont: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const ordinals = () => ({
    audience: ['Beginner', 'Advanced'],
    jobProfile: ['Engineer', 'Manager'],
    region: ['North', 'South'],
    accessPaths: ['pathA', 'pathB'],
    resourceType: ['Video', 'PDF'],
    categoryType: ['Cat1'],
    'Offering Mode': ['Online', 'Offline'],
    complexityLevel: ['Easy', 'Hard'],
  })

  beforeEach(() => {
    changeActiveCont = new Subject<any>()
    editorService = {
      languageList: jest.fn().mockReturnValue(of([{ name: 'English', value: 'en' }])),
      fetchEmployeeList: jest.fn().mockReturnValue(of([{ id: 'u9', name: 'Someone' }])),
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_1', children: [] })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      checkReadAPI: jest.fn().mockReturnValue(of({ result: { content: {} } })),
      getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
      checkRole: jest.fn().mockReturnValue(of([])),
    }
    contentService = {
      changeActiveCont,
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
      { changeLoad: { next: jest.fn() } } as any,
      {
        ordinals: ordinals(),
        authConfig: {},
        currentPageAction: jest.fn(),
        saveData: jest.fn(),
        uploadData: jest.fn(),
      } as any,
      { rootOrg: 'sunbird', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } } as any,
      { post: jest.fn().mockReturnValue(of({})) } as any,
      { url: '/author/editor/do_1/details' } as any,
    )
    component.ngOnInit()
  })

  afterEach(() => {
    clearInterval((component as any).timer)
    jest.clearAllMocks()
  })

  /** Each contact control debounces 500ms before hitting the employee search. */
  const type = (control: any, value: any) => {
    control.setValue(value)
    tick(600)
  }

  describe('contact autocompletes', () => {
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
      type(component.publisherDetailsCtrl, { id: 'u9' })
      expect(editorService.fetchEmployeeList).not.toHaveBeenCalled()
    }))

    it('falls back to an empty list when the search returns nothing', fakeAsync(() => {
      editorService.fetchEmployeeList.mockReturnValue(of(null))
      type(component.editorsCtrl, 'som')
      expect(component.employeeList).toEqual([])
      expect(component.fetchTagsStatus).toBe('done')
    }))

    it('stops fetching when the search fails', fakeAsync(() => {
      editorService.fetchEmployeeList.mockReturnValue(throwError(() => new Error('down')))
      type(component.creatorDetailsCtrl, 'som')
      expect(component.fetchTagsStatus).toBe('done')
    }))
  })

  describe('ordinal pickers', () => {
    it('filters the audience list as the author types', () => {
      const fetch = jest.spyOn(component, 'fetchAudience')
      component.audienceCtrl.setValue('Beg')
      expect(fetch).toHaveBeenCalled()
    })

    it('filters the job profile list as the author types', () => {
      const fetch = jest.spyOn(component, 'fetchJobProfile')
      component.jobProfileCtrl.setValue('Eng')
      expect(fetch).toHaveBeenCalled()
    })

    it('filters the region list as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchRegion')
      component.regionCtrl.setValue('Nor')
      tick(500)
      expect(fetch).toHaveBeenCalled()
    }))

    it('ignores an emptied region box', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchRegion')
      component.regionCtrl.setValue('')
      tick(500)
      expect(fetch).not.toHaveBeenCalled()
    }))

    it('filters the access paths as the author types', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchAccessRestrictions')
      component.accessPathsCtrl.setValue('path')
      tick(500)
      expect(fetch).toHaveBeenCalled()
    }))

    it('ignores an emptied access path box', fakeAsync(() => {
      const fetch = jest.spyOn(component, 'fetchAccessRestrictions')
      component.accessPathsCtrl.setValue('')
      tick(500)
      expect(fetch).not.toHaveBeenCalled()
    }))
  })

  describe('language list', () => {
    it('stores the languages it was given', () => {
      expect(component.languageList).toEqual([{ name: 'English', value: 'en' }])
    })
  })
})
