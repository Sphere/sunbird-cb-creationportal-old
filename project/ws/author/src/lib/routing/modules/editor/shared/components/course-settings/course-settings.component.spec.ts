import { TestBed } from '@angular/core/testing'
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms'
import { of, BehaviorSubject } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

// These are LARGE components. Per the house rule we do NOT full-render them; we
// instantiate the class directly with mocked collaborators and exercise the public
// method / getter / branch logic. FormBuilder is a real instance (pulled from the
// injector) so the reactive form behaves for real.
describe('CourseSettingsComponent (direct instantiation)', () => {
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
    complexityLevel: ['easy', { value: 'med' }],
    resourceType: ['R1', 'R2'],
    categoryType: ['C1'],
    region: ['North', 'South'],
    accessPaths: ['pathA', 'pathB'],
    'Offering Mode': ['Online'],
  })

  const build = () => {
    editorService = {
      getAllEntities: jest.fn(() => of({ result: { entity: [{ entityId: '10', name: 'Comp A', code: 'C1' }] } })),
      readcontentV3: jest.fn(() => of({ duration: 3661, identifier: 'id', name: 'n' })),
      rolesMapped: jest.fn(() => of([{ roleA: 1 }])),
      sourceNames: jest.fn(() => of(['SourceOne'])),
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
    accessService = {
      rootOrg: 'other',
      userId: 'u1',
      userName: 'User One',
      authoringConfig: { doUniqueCheck: false },
    }
    http = { post: jest.fn(() => of({ result: { identifier: 'newId' } })) }
    router = {
      url: '/author/editor/abc/collection',
      navigate: jest.fn(() => Promise.resolve(true)),
      events: of(),
    }
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
    TestBed.configureTestingModule({ imports: [ReactiveFormsModule] })
    fb = TestBed.inject(FormBuilder)
    component = build()
  })

  afterEach(() => {
    if (component && component.timer) {
      clearInterval(component.timer)
    }
    jest.clearAllMocks()
  })

  it('should create and populate proficiency list from the constructor entity fetch', () => {
    expect(component).toBeTruthy()
    expect(editorService.getAllEntities).toHaveBeenCalledWith('en')
    expect(component.proficiencyList).toEqual([{ entityId: '10', name: 'Comp A', code: 'C1' }])
    expect(component.userId).toBe('u1')
    expect(component.givenName).toBe('User One')
  })

  describe('displayCompetency', () => {
    it('returns empty string for null / string inputs', () => {
      expect(component.displayCompetency(null)).toBe('')
      expect(component.displayCompetency('typed')).toBe('')
    })
    it('formats "CODE - Name" when a code is present, else name', () => {
      expect(component.displayCompetency({ code: 'C1', name: 'Alpha' })).toBe('C1 - Alpha')
      expect(component.displayCompetency({ name: 'Beta' })).toBe('Beta')
      expect(component.displayCompetency({})).toBe('')
    })
  })

  describe('search / onKey', () => {
    beforeEach(() => {
      component.searchComp = [
        { name: 'Alpha', code: 'A1' },
        { name: 'Beta', code: 'B2' },
      ]
    })
    it('returns the whole list when the filter is empty', () => {
      expect(component.search('')).toBe(component.searchComp)
    })
    it('filters by name or code (case-insensitive)', () => {
      expect(component.search('alpha')).toEqual([{ name: 'Alpha', code: 'A1' }])
      expect(component.search('b2')).toEqual([{ name: 'Beta', code: 'B2' }])
    })
    it('onKey stores the filtered list into proficiencyList', () => {
      component.onKey('alpha')
      expect(component.proficiencyList).toEqual([{ name: 'Alpha', code: 'A1' }])
    })
  })

  it('getFilterData keeps only keys not present in the second array', () => {
    component.getFilterData(['a', 'b', 'c'], ['a:1', 'c:3'])
    expect(component.rolesMappedList).toEqual(['b'])
    expect(component.rolesMappedListData).toEqual(['b'])
  })

  it('enableClick disables the title edit flag', () => {
    component.isEnableTitle = true
    component.enableClick()
    expect(component.isEnableTitle).toBe(false)
  })

  it('clickedNext triggers a save on the init service', () => {
    component.clickedNext()
    expect(authInitService.saveData).toHaveBeenCalledWith('saved')
  })

  it('trackByIndex returns the index', () => {
    expect(component.trackByIndex(7)).toBe(7)
  })

  it('changeCertificate toggles isAddCerticate', () => {
    component.changeCertificate('Yes')
    expect(component.isAddCerticate).toBe(true)
    component.changeCertificate('No')
    expect(component.isAddCerticate).toBe(false)
  })

  it('getKeys returns the object keys at the given index', () => {
    component.rolesMappedListData = [{ roleX: 1 }, { roleY: 2 }]
    expect(component.getKeys(1)).toEqual(['roleY'])
  })

  it('isJsonString distinguishes valid from invalid JSON', () => {
    expect(component.isJsonString('{"a":1}')).toBe(true)
    expect(component.isJsonString('not-json')).toBe(false)
  })

  it('convertToISODate parses an expiry date string into a Date', () => {
    const d = component.convertToISODate('20250101T120000+0000')
    expect(d instanceof Date).toBe(true)
  })

  it('setDuration splits seconds into h/m/s', () => {
    ;(component as any).setDuration(3661)
    expect(component.hours).toBe(1)
    expect(component.minutes).toBe(1)
    expect(component.seconds).toBe(1)
  })

  it('showInfo toggles the info type', () => {
    component.showInfo('reviewers')
    expect(component.infoType).toBe('reviewers')
    component.showInfo('reviewers')
    expect(component.infoType).toBe('')
  })

  describe('rolesArray helpers', () => {
    beforeEach(() => {
      component.rolesArray = [{ a: 1 }, { b: 2 }]
    })
    it('getValueByKey returns the value for a found key, else null', () => {
      expect(component.getValueByKey('b')).toBe(2)
      expect(component.getValueByKey('zzz')).toBeNull()
    })
    it('getValuesForKeys maps keys to "key:value" pairs', () => {
      expect(component.getValuesForKeys(['a:x'])).toEqual(['a:1'])
    })
    it('getKeyByValue and getRole return null (no match semantics)', () => {
      expect(component.getKeyByValue(1)).toBeNull()
      expect(component.getRole(1)).toBeNull()
    })
  })

  it('formNext sets the selected index', () => {
    component.formNext(4)
    expect(component.selectedIndex).toBe(4)
  })

  it('conceptToggle flips addConcepts', () => {
    component.conceptToggle()
    expect(component.addConcepts).toBe(true)
  })

  it('compareSkillFn compares by identifier', () => {
    expect(component.compareSkillFn({ identifier: 'x' }, { identifier: 'x' })).toBe(true)
    expect(component.compareSkillFn({ identifier: 'x' }, { identifier: 'y' })).toBe(false)
  })

  it('addCommonToCatalog prefixes uncommon catalogs', () => {
    expect(component.addCommonToCatalog(['A', 'Common>B'])).toEqual(['Common>A', 'Common>B'])
  })

  it('parseJsonData is not present on course-settings — moduleCreate updates module UI state', () => {
    component.moduleCreate('My Module')
    expect(component.moduleName).toBe('My Module')
    expect(component.isSaveModuleFormEnable).toBe(true)
    expect(component.moduleButtonName).toBe('Save')
  })

  it('setPurposeValue writes to the purpose control', () => {
    component.createForm()
    component.setPurposeValue('a purpose')
    expect(component.contentForm.controls.purpose.value).toBe('a purpose')
  })

  it('changeToDefaultImg falls back to the instance default logo', () => {
    const evt = { target: { src: '' } }
    component.changeToDefaultImg(evt)
    expect(evt.target.src).toBe('default.png')
  })

  it('generateUrl returns the original url when it already contains the bucket', () => {
    ;(window as any)['env'] = { azureBucket: 'mybucket' }
    expect(component.generateUrl('https://x/mybucket/file.png')).toBe('https://x/mybucket/file.png')
  })

  // The caller assigns this straight to the appIcon and thumbnail controls, so
  // returning undefined here blanked both fields for any image hosted outside the
  // bucket. It used to fall off the end of the method.
  it('generateUrl returns the original url when it does NOT contain the bucket', () => {
    ;(window as any)['env'] = { azureBucket: 'mybucket' }
    expect(component.generateUrl('https://cdn.example.com/other/file.png')).toBe('https://cdn.example.com/other/file.png')
  })

  it('generateUrl never returns undefined, whatever the url', () => {
    ;(window as any)['env'] = { azureBucket: 'mybucket' }
    for (const url of ['https://a/b.png', 'https://x/mybucket/c.png', '/relative/d.png']) {
      expect(component.generateUrl(url)).toBeDefined()
    }
  })

  it('ngOnChanges on triggerNext emits a save and marks submit pressed', () => {
    const emit = jest.spyOn(component.data, 'emit')
    component.ngOnChanges({ triggerNext: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } })
    expect(component.isSubmitPressed).toBe(true)
    expect(emit).toHaveBeenCalledWith('save')
  })

  it('ngOnDestroy unsubscribes and detaches change detection', () => {
    component.rolesSubscription = { unsubscribe: jest.fn() } as any
    component.routerSubscription = { unsubscribe: jest.fn() } as any
    component.ngOnDestroy()
    expect((component.rolesSubscription as any).unsubscribe).toHaveBeenCalled()
    expect((component.routerSubscription as any).unsubscribe).toHaveBeenCalled()
    expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    expect(ref.detach).toHaveBeenCalled()
  })

  it('ngAfterViewInit reads content and computes the main course duration', async () => {
    await component.ngAfterViewInit()
    expect(editorService.readcontentV3).toHaveBeenCalled()
    expect(component.mainCourseDuration).toBe('1:1:1')
    expect(ref.detach).toHaveBeenCalled()
  })

  it('storeData swallows errors and shows a snackbar when contentMeta is missing', () => {
    component.contentMeta = undefined as any
    expect(() => component.storeData()).not.toThrow()
    expect(snackBar.open).toHaveBeenCalledWith('Please Save Parent first and refresh page.')
  })

  describe('form-dependent methods (createForm first)', () => {
    beforeEach(() => {
      component.ordinals = fullOrdinals()
      component.contentMeta = { identifier: 'id' } as any
      component.keywordsCtrl = new FormControl('')
      component.createForm()
    })

    it('createForm builds a form with the mandatory controls', () => {
      expect(component.contentForm).toBeTruthy()
      expect(component.contentForm.controls.publisherDetails).toBeTruthy()
      expect(component.contentForm.controls.sourceName).toBeTruthy()
      expect(component.contentForm.controls.trackContacts).toBeTruthy()
    })

    it('optionSelected adds a unique keyword', () => {
      component.optionSelected('kw1')
      expect(component.contentForm.controls.keywords.value).toContain('kw1')
      // duplicate is ignored
      component.optionSelected('kw1')
      expect(component.contentForm.controls.keywords.value.filter((k: string) => k === 'kw1').length).toBe(1)
    })

    it('addKeyword splits comma-separated input into keywords', () => {
      const input: any = { value: 'x' }
      component.addKeyword({ input, value: 'one,two' } as any)
      expect(component.contentForm.controls.keywords.value).toEqual(expect.arrayContaining(['one', 'two']))
      expect(input.value).toBe('')
    })

    it('removeKeyword removes an existing keyword', () => {
      component.contentForm.controls.keywords.setValue(['a', 'b'])
      component.removeKeyword('a')
      expect(component.contentForm.controls.keywords.value).toEqual(['b'])
    })

    it('addReferences / removeReferences manage the references array', () => {
      component.addReferences({ input: { value: '' }, value: 'http://ref' } as any)
      expect(component.contentForm.controls.references.value).toEqual([{ title: '', url: 'http://ref' }])
      component.removeReferences(0)
      expect(component.contentForm.controls.references.value).toEqual([])
    })

    it('addCreatorDetails / removeCreatorDetails manage the creatorDetails array', () => {
      component.contentForm.controls.creatorDetails.setValue([])
      component.addCreatorDetails({ input: { value: '' }, value: 'Jane' } as any)
      expect(component.contentForm.controls.creatorDetails.value).toEqual([{ id: '', name: 'Jane' }])
      component.removeCreatorDetails({ id: '', name: 'Jane' })
      expect(component.contentForm.controls.creatorDetails.value).toEqual([])
    })

    it('addToFormControl / removeFromFormControl manage a generic list control', () => {
      component.audienceView = { nativeElement: { value: 'typed', blur: jest.fn() } } as any
      component.audienceCtrl = new FormControl()
      component.contentForm.controls.audience.setValue([])
      component.addToFormControl({ option: { value: 'aud1' } } as any, 'audience')
      expect(component.contentForm.controls.audience.value).toContain('aud1')
      expect(component.audienceView.nativeElement.value).toBe('')
      component.removeFromFormControl('aud1', 'audience')
      expect(component.contentForm.controls.audience.value).toEqual([])
    })

    it('changeMimeType sets the collection mime type for a Course', () => {
      component.contentForm.controls.contentType.setValue('Course')
      component.changeMimeType()
      expect(component.contentForm.controls.mimeType.value).toBe('application/vnd.ekstep.content-collection')
    })

    it('changeMimeType sets html mime type for non-Course', () => {
      component.contentForm.controls.contentType.setValue('Resource')
      component.changeMimeType()
      expect(component.contentForm.controls.mimeType.value).toBe('application/html')
    })

    it('changeResourceType uses ordinals.resourceType for Resource content', () => {
      component.contentForm.controls.contentType.setValue('Resource')
      component.changeResourceType()
      expect(component.resourceTypes).toEqual(['R1', 'R2'])
    })

    it('assignExpiryDate toggles canExpiry and writes the sentinel date when disabled', () => {
      component.canExpiry = true
      component.assignExpiryDate()
      expect(component.canExpiry).toBe(false)
      expect(component.contentForm.controls.expiryDate.value).toBe('99991231T235959+0000')
    })

    it('filterOrdinals builds the complexity list from ordinals', () => {
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual(['easy', 'med'])
    })

    it('timeToSeconds computes the duration control from h/m/s', () => {
      component.hours = 1
      component.minutes = 1
      component.seconds = 1
      component.timeToSeconds()
      expect(component.contentForm.controls.duration.value).toBe(3661)
    })

    it('updateContentService updates the control and the content store', () => {
      component.updateContentService('name', 'New Name')
      expect(component.contentForm.controls.name.value).toBe('New Name')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith({ name: 'New Name' }, 'id')
    })

    it('checkCondition short-circuits to true for disabled when not editable', () => {
      component.isEditEnabled = false
      expect(component.checkCondition('name', 'disabled')).toBe(true)
    })

    it('checkCondition delegates to the content service otherwise', () => {
      component.isEditEnabled = true
      expect(component.checkCondition('name', 'show')).toBe(true)
      expect(contentService.checkCondition).toHaveBeenCalled()
    })

    it('onCompetencySelected syncs the competency selection', () => {
      const comp = { entityId: 10, name: 'A', description: 'd', levels: [] }
      component.onCompetencySelected('en', comp)
      expect(component.competencies_v1).toBe(comp)
      expect(component.contentForm.controls['competencies_v1'].value).toBe(comp)
    })

    it('initializeForm restores a saved competency matched by entityId', () => {
      component.proficiencyList = [{ entityId: '10', name: 'Comp A', code: 'C1' }]
      component.contentMeta = { identifier: 'id', competencies_v1: JSON.stringify([{ competencyId: '10' }]) } as any
      component.initializeForm()
      expect(component.competencies_v1).toEqual({ entityId: '10', name: 'Comp A', code: 'C1' })
    })

    it('initializeForm returns early when there is no saved competency', () => {
      component.competencies_v1 = 'unchanged'
      component.contentMeta = { identifier: 'id' } as any
      component.initializeForm()
      expect(component.competencies_v1).toBe('unchanged')
    })

    it('assignFields populates the form and re-enables updates', () => {
      component.contentMeta = { identifier: 'id', contentType: 'Course', competency: false } as any
      expect(() => component.assignFields()).not.toThrow()
      expect(component.canUpdate).toBe(true)
    })
  })

  describe('ngOnInit', () => {
    it('wires up the observables, ordinals and form controls', () => {
      component.ngOnInit()
      expect(authInitService.currentPageAction).toHaveBeenCalledWith('courseSettingsPage')
      expect(editorService.rolesMapped).toHaveBeenCalled()
      expect(editorService.sourceNames).toHaveBeenCalled()
      expect(component.sourceName).toEqual(['SourceOne'])
      expect(component.audienceList).toEqual(fullOrdinals().audience)
      expect(component.creatorContactsCtrl).toBeInstanceOf(FormControl)
    })
  })
})
