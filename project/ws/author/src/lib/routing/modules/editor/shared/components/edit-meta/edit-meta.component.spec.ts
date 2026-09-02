import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { EditMetaComponent } from './edit-meta.component'
import { MAX_INSTRUCTIONS_BYTES } from '@ws/author/src/lib/modules/shared/validators/byte-length.validator'

/**
 * EditMetaComponent is a very heavy component (many injected collaborators, a large
 * template). Per the project testing convention it is instantiated directly with
 * mocked collaborators and exercised as a plain class — TestBed rendering of this
 * component is brittle under jsdom.
 */
describe('EditMetaComponent', () => {
  let component: EditMetaComponent
  let formBuilder: FormBuilder
  let uploadService: any
  let snackBar: any
  let dialog: any
  let editorService: any
  let contentService: any
  let configSvc: any
  let ref: any
  let loader: any
  let authInitService: any
  let accessService: any
  let http: any
  let router: any
  let changeActiveCont: Subject<any>
  let afterClosed: Subject<any>

  // The component logs whole FormGroup instances on every createForm()/storeData().
  // Serialising those floods the reporter, so keep console output out of the run.
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

  const readResponse = (over: any = {}) => ({
    identifier: 'do_1',
    name: 'Course A',
    appIcon: 'icon.png',
    instructions: 'do this',
    lang: 'en',
    subTitle: 'sub',
    sourceName: 'src',
    gatingEnabled: false,
    courseVisibility: true,
    selfAssessment: false,
    versionKey: 'vk1',
    children: [],
    ...over,
  })

  beforeEach(() => {
    changeActiveCont = new Subject<any>()
    afterClosed = new Subject<any>()
    formBuilder = new FormBuilder()
    uploadService = { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'a/b.png' })) }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    editorService = {
      languageList: jest.fn().mockReturnValue(of([])),
      fetchEmployeeList: jest.fn().mockReturnValue(of([])),
      readcontentV3: jest.fn().mockReturnValue(of(readResponse())),
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
    configSvc = {
      userProfile: { userId: 'u1' },
      instanceConfig: { logos: { defaultContent: 'default.png' }, authoring: {} },
      activeLocale: { locals: ['en'] },
    }
    ref = { detach: jest.fn(), detectChanges: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    authInitService = {
      ordinals: ordinals(),
      authConfig: {},
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      uploadData: jest.fn(),
    }
    accessService = {
      rootOrg: 'sunbird',
      userId: 'u1',
      userName: 'User One',
      authoringConfig: { doUniqueCheck: false },
    }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) }
    router = { url: '/author/editor/do_1/details' }
    // generateUrl() reads the storage bucket off the runtime window config.
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new EditMetaComponent(
      formBuilder,
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
    )
  })

  afterEach(() => {
    clearInterval((component as any).timer)
    jest.clearAllMocks()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('seeds ordinal-backed lists and builds the autocomplete controls', () => {
      component.ngOnInit()
      expect(component.audienceList).toEqual(['Beginner', 'Advanced'])
      expect(component.jobProfileList).toEqual(['Engineer', 'Manager'])
      expect(component.creatorContactsCtrl).toBeDefined()
      expect(component.keywordsCtrl.value).toBe('')
      expect(component.accessPathsCtrl.disabled).toBe(true)
    })

    it('flags a Siemens root org case-insensitively', () => {
      accessService.rootOrg = 'SIEMENS'
      component.ngOnInit()
      expect(component.isSiemens).toBe(true)
    })

    it('leaves isSiemens false for other orgs', () => {
      component.ngOnInit()
      expect(component.isSiemens).toBe(false)
    })

    it('replaces the language list when the service returns entries', () => {
      editorService.languageList.mockReturnValue(of([{ name: 'Tamil', value: 'ta' }]))
      component.ngOnInit()
      expect(component.languageList).toEqual([{ name: 'Tamil', value: 'ta' }])
    })

    it('keeps the built-in language list when the service returns none', () => {
      component.ngOnInit()
      expect(component.languageList.length).toBe(5)
    })

    it('re-reads the content when the active content changes', () => {
      component.ngOnInit()
      changeActiveCont.next('changed')
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_1')
      expect(component.contentMeta).toBeDefined()
    })

    it('marks self competency selected when the re-read reports one', () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ selfAssessment: { value: true } })))
      component.ngOnInit()
      changeActiveCont.next('changed')
      expect(component.selectedSelfCompetency).toBe(true)
    })

    it('stores current data before re-reading when an editable meta is loaded', () => {
      component.ngOnInit()
      component.contentMeta = { identifier: 'do_1' } as any
      component.canUpdate = true
      const storeData = jest.spyOn(component, 'storeData')
      changeActiveCont.next('changed')
      expect(storeData).toHaveBeenCalled()
    })
  })

  describe('lifecycle hooks', () => {
    it('ngAfterViewInit detaches change detection and starts the redraw timer', () => {
      jest.useFakeTimers()
      component.ngAfterViewInit()
      expect(ref.detach).toHaveBeenCalled()
      jest.advanceTimersByTime(250)
      expect(ref.detectChanges).toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('ngOnChanges submits when triggerNext flips to true', () => {
      component.createForm()
      const clickedNext = jest.spyOn(component, 'clickedNext')
      component.ngOnChanges({ triggerNext: { currentValue: true } } as any)
      expect(component.isSubmitPressed).toBe(true)
      expect(clickedNext).toHaveBeenCalled()
    })

    it('ngOnChanges ignores unrelated changes', () => {
      const clickedNext = jest.spyOn(component, 'clickedNext')
      component.ngOnChanges({ stage: { currentValue: 2 } } as any)
      expect(clickedNext).not.toHaveBeenCalled()
    })

    it('ngOnDestroy tears down subscriptions, the loader and the timer', () => {
      component.ngOnInit()
      component.ngAfterViewInit()
      component.routerSubscription = { unsubscribe: jest.fn() } as any
      component.ngOnDestroy()
      expect(component.routerSubscription.unsubscribe).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(ref.detach).toHaveBeenCalled()
    })

    it('ngOnDestroy is safe with no subscriptions present', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('createForm', () => {
    beforeEach(() => component.createForm())

    it('builds the content form with the mandatory controls', () => {
      expect(component.contentForm.controls.name).toBeDefined()
      expect(component.contentForm.controls.subTitle).toBeDefined()
      expect(component.contentForm.controls.instructions).toBeDefined()
      expect(component.contentForm.controls.lang).toBeDefined()
    })

    it('starts invalid because the mandatory fields are empty', () => {
      expect(component.contentForm.valid).toBe(false)
    })

    it('emits validity to the parent on every status change', () => {
      const emitted: boolean[] = []
      component.validityChange.subscribe(v => emitted.push(v))
      component.contentForm.controls.subTitle.setValue('sub')
      component.contentForm.controls.instructions.setValue('body')
      component.contentForm.controls.appIcon.setValue('icon')
      component.contentForm.controls.thumbnail.setValue('thumb')
      component.contentForm.controls.duration.setValue('60')
      component.contentForm.controls.lang.setValue('en')
      expect(emitted[emitted.length - 1]).toBe(true)
    })

    it('mirrors contentType into category and refreshes the dependent lists', () => {
      component.ordinals = ordinals()
      component.contentForm.controls.contentType.setValue('Course')
      expect(component.contentForm.controls.category.value).toBe('Course')
      expect(component.contentForm.controls.mimeType.value).toBe('application/vnd.ekstep.content-collection')
    })

    it('mirrors resourceType into categoryType', () => {
      component.contentForm.controls.resourceType.setValue('Video')
      expect(component.contentForm.controls.categoryType.value).toBe('Video')
    })

    it('mirrors resourceCategory into customClassifiers', () => {
      component.contentForm.controls.resourceCategory.setValue(['a'])
      expect(component.contentForm.controls.customClassifiers.value).toEqual(['a'])
    })

    it('copies creator contacts into publisher details while on stage 1', () => {
      component.stage = 1
      component.createForm()
      component.contentForm.controls.creatorContacts.setValue([{ id: 'u1', name: 'One' }])
      expect(component.contentForm.controls.publisherDetails.value).toEqual([{ id: 'u1', name: 'One' }])
    })

    it('does not mirror creator contacts on later stages', () => {
      component.stage = 2
      component.createForm()
      component.contentForm.controls.creatorContacts.setValue([{ id: 'u1', name: 'One' }])
      expect(component.contentForm.controls.publisherDetails.value).toBeNull()
    })
  })

  describe('clickedNext', () => {
    beforeEach(() => {
      component.createForm()
      component.contentForm.controls.subTitle.setValue('  sub  ')
      component.contentForm.controls.instructions.setValue('  body  ')
      component.contentForm.controls.appIcon.setValue('icon')
      component.contentForm.controls.thumbnail.setValue('thumb')
      component.contentForm.controls.duration.setValue('60')
      component.contentForm.controls.lang.setValue('en')
    })

    it('records the current page action', () => {
      component.clickedNext()
      expect(authInitService.currentPageAction).toHaveBeenCalledWith('courseDetailsPage')
    })

    it('trims the subtitle and description before validating', () => {
      component.clickedNext()
      expect(component.contentForm.controls.subTitle.value).toBe('sub')
      expect(component.contentForm.controls.instructions.value).toBe('body')
    })

    it('saves and advances when the form is valid without self assessment', () => {
      component.clickedNext()
      expect(component.isFormValid).toBe(true)
      expect(authInitService.saveData).toHaveBeenCalledWith('saved')
      expect(component.clickedBtnNext).toBe(true)
    })

    it('advances when self assessment is on and a competency is attached', () => {
      component.selectedSelfCompetency = true
      component.competencies = [{ competencyId: 'c1' }]
      component.clickedNext()
      expect(component.isFormValid).toBe(true)
      expect(component.clickedBtnNext).toBe(true)
    })

    it('blocks when self assessment is on but no competency is attached', () => {
      component.selectedSelfCompetency = true
      component.competencies = []
      component.clickedNext()
      expect(component.isFormValid).toBe(false)
      expect(authInitService.saveData).not.toHaveBeenCalled()
    })

    it('marks every control touched when the form is invalid', () => {
      component.contentForm.controls.lang.setValue('')
      component.clickedNext()
      expect(component.isFormValid).toBe(false)
      expect(component.contentForm.controls.lang.touched).toBe(true)
    })
  })

  describe('checkMandatoryFields', () => {
    beforeEach(() => {
      component.createForm()
      component.contentForm.controls.subTitle.setValue('sub')
      component.contentForm.controls.instructions.setValue('body')
      component.contentForm.controls.appIcon.setValue('icon')
      component.contentForm.controls.lang.setValue('en')
    })

    it('reports satisfied (false) when all fields are filled and self assessment is off', () => {
      expect(component.checkMandatoryFields()).toBe(false)
    })

    it('reports missing (true) when a mandatory field is blank', () => {
      component.contentForm.controls.lang.setValue('')
      expect(component.checkMandatoryFields()).toBe(true)
    })

    it('reports missing when self assessment is on without a competency', () => {
      component.selectedSelfCompetency = true
      component.competencies = []
      expect(component.checkMandatoryFields()).toBe(true)
    })

    it('reports satisfied when self assessment is on with a competency', () => {
      component.selectedSelfCompetency = true
      component.competencies = [{ competencyId: 'c1' }]
      expect(component.checkMandatoryFields()).toBe(false)
    })
  })

  describe('competency handling', () => {
    it('addSelfCompetency(true) notifies and selects', () => {
      component.addSelfCompetency(true)
      expect(component.selectedSelfCompetency).toBe(true)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('addSelfCompetency(false) notifies and deselects', () => {
      component.selectedSelfCompetency = true
      component.addSelfCompetency(false)
      expect(component.selectedSelfCompetency).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('addCompetency refreshes the list only when a competency was added', () => {
      component.parentContent = 'do_1'
      editorService.readcontentV3.mockReturnValue(of(readResponse({ competencies_v1: JSON.stringify([{ competencyId: 'c1' }]) })))
      component.addCompetency()
      afterClosed.next(true)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(component.competencies).toEqual([{ competencyId: 'c1' }])
    })

    it('addCompetency does nothing when the dialog is cancelled', () => {
      component.addCompetency()
      afterClosed.next(false)
      expect(loader.changeLoad.next).not.toHaveBeenCalledWith(true)
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('loadCompetancy parses the stored competencies', async () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ competencies_v1: JSON.stringify([{ competencyId: 'c2' }]) })))
      component.loadCompetancy()
      // The handler awaits the parse, so the assignment lands a microtask later.
      await Promise.resolve()
      expect(component.competencies).toEqual([{ competencyId: 'c2' }])
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('loadCompetancy falls back to an empty list when none are stored', () => {
      component.loadCompetancy()
      expect(component.competencies).toEqual([])
    })

    it('deleteCompetancy does nothing when the confirm dialog is dismissed', () => {
      component.deleteCompetancy({ competencyId: 'c1' })
      afterClosed.next(false)
      expect(editorService.checkReadAPI).not.toHaveBeenCalled()
    })

    it('deleteCompetancy seeds empty metadata when no competencySearch exists', done => {
      editorService.checkReadAPI.mockReturnValue(of({ result: { content: { versionKey: 'vk1' } } }))
      component.deleteCompetancy({ competencyId: 'c1' })
      afterClosed.next(true)
      setTimeout(() => {
        expect(editorService.updateNewContentV3).toHaveBeenCalledWith(
          { request: { content: { versionKey: 'vk1', competencySearch: [], competency: false, competencies_v1: [] } } },
          '',
        )
        done()
      })
    })

    it('deleteCompetancy removes the matching competency and its search key', done => {
      editorService.checkReadAPI.mockReturnValue(
        of({
          result: {
            content: {
              versionKey: 'vk1',
              competencySearch: ['c1-2', 'c9-1'],
              competencies_v1: JSON.stringify([
                { competencyName: 'A', competencyId: 'c1', level: 2 },
                { competencyName: 'B', competencyId: 'c9', level: 1 },
              ]),
            },
          },
        }),
      )
      component.deleteCompetancy({ competencyName: 'A', competencyId: 'c1', level: 2 })
      afterClosed.next(true)
      setTimeout(() => {
        const body = editorService.updateNewContentV3.mock.calls[0][0]
        expect(body.request.content.competencySearch).toEqual(['c9-1'])
        expect(body.request.content.competencies_v1).toEqual([{ competencyName: 'B', competencyId: 'c9', level: 1 }])
        done()
      })
    })

    it('getAllEntity merges proficiency codes into the added competencies', () => {
      editorService.getAllEntities.mockReturnValue(of({ result: { entity: [{ entityId: 'c1', code: 'CODE1' }] } }))
      component.competencies = [{ competencyId: 'c1', competencyName: 'A' }]
      component.getAllEntity()
      expect(component.addedCompetency).toEqual([{ competencyId: 'c1', competencyName: 'A', code: 'CODE1' }])
    })

    it('getAllEntity yields an empty result when there are no competencies', () => {
      component.getAllEntity()
      expect(component.addedCompetency).toBe('')
      expect(editorService.getAllEntities).toHaveBeenCalledWith('en')
    })
  })

  describe('form field helpers', () => {
    beforeEach(() => component.createForm())

    it('optionSelected appends a new keyword', () => {
      component.keywordsCtrl = formBuilder.control('') as any
      component.contentForm.controls.keywords.setValue([])
      component.optionSelected('angular')
      expect(component.contentForm.controls.keywords.value).toEqual(['angular'])
    })

    it('optionSelected ignores a duplicate keyword', () => {
      component.keywordsCtrl = formBuilder.control('') as any
      component.contentForm.controls.keywords.setValue(['angular'])
      component.optionSelected('angular')
      expect(component.contentForm.controls.keywords.value).toEqual(['angular'])
    })

    it('optionSelected ignores an empty keyword', () => {
      component.keywordsCtrl = formBuilder.control('') as any
      component.contentForm.controls.keywords.setValue([])
      component.optionSelected('')
      expect(component.contentForm.controls.keywords.value).toEqual([])
    })

    it('addKeyword splits a comma separated chip entry', () => {
      component.keywordsCtrl = formBuilder.control('') as any
      component.contentForm.controls.keywords.setValue([])
      const input = { value: 'a, b ,c' } as HTMLInputElement
      component.addKeyword({ input, value: 'a, b ,c' } as any)
      expect(component.contentForm.controls.keywords.value).toEqual(['a', 'b', 'c'])
      expect(input.value).toBe('')
    })

    it('removeKeyword drops the given keyword', () => {
      component.contentForm.controls.keywords.setValue(['a', 'b'])
      component.removeKeyword('a')
      expect(component.contentForm.controls.keywords.value).toEqual(['b'])
    })

    it('addReferences appends a reference row', () => {
      component.contentForm.controls.references.setValue([])
      const input = { value: 'http://x' } as HTMLInputElement
      component.addReferences({ input, value: 'http://x' } as any)
      expect(component.contentForm.controls.references.value).toEqual([{ title: '', url: 'http://x' }])
      expect(input.value).toBe('')
    })

    it('addReferences ignores a blank value', () => {
      component.contentForm.controls.references.setValue([])
      component.addReferences({ input: null, value: '   ' } as any)
      expect(component.contentForm.controls.references.value).toEqual([])
    })

    it('removeReferences drops the row at the index', () => {
      component.contentForm.controls.references.setValue([{ url: 'a' }, { url: 'b' }])
      component.removeReferences(0)
      expect(component.contentForm.controls.references.value).toEqual([{ url: 'b' }])
    })

    it('addCreatorDetails appends a trimmed creator name', () => {
      component.contentForm.controls.creatorDetails.setValue([])
      const input = { value: ' Jane ' } as HTMLInputElement
      component.addCreatorDetails({ input, value: ' Jane ' } as any)
      expect(component.contentForm.controls.creatorDetails.value).toEqual([{ id: '', name: 'Jane' }])
      expect(input.value).toBe('')
    })

    it('addCreatorDetails ignores a blank name', () => {
      component.contentForm.controls.creatorDetails.setValue([])
      component.addCreatorDetails({ input: null, value: '  ' } as any)
      expect(component.contentForm.controls.creatorDetails.value).toEqual([])
    })

    it('removeCreatorDetails drops the given entry', () => {
      const entry = { id: '', name: 'Jane' }
      component.contentForm.controls.creatorDetails.setValue([entry])
      component.removeCreatorDetails(entry)
      expect(component.contentForm.controls.creatorDetails.value).toEqual([])
    })

    it('addToFormControl appends the selected option and clears the input', () => {
      component.ngOnInit()
      component.audienceView = { nativeElement: { value: 'x' } } as any
      component.contentForm.controls.audience.setValue([])
      component.addToFormControl({ option: { value: 'Beginner' } } as any, 'audience')
      expect(component.contentForm.controls.audience.value).toEqual(['Beginner'])
      expect(component.audienceView.nativeElement.value).toBe('')
      expect(component.audienceCtrl.value).toBeNull()
    })

    it('addToFormControl ignores a duplicate option', () => {
      component.ngOnInit()
      component.audienceView = { nativeElement: { value: '' } } as any
      component.contentForm.controls.audience.setValue(['Beginner'])
      component.addToFormControl({ option: { value: 'Beginner' } } as any, 'audience')
      expect(component.contentForm.controls.audience.value).toEqual(['Beginner'])
    })

    it('removeFromFormControl drops the value from the named control', () => {
      component.contentForm.controls.audience.setValue(['Beginner', 'Advanced'])
      component.removeFromFormControl('Beginner', 'audience')
      expect(component.contentForm.controls.audience.value).toEqual(['Advanced'])
    })

    it('removeEmployee drops the employee from the named control', () => {
      const emp = { id: 'u1', name: 'One' }
      component.contentForm.controls.creatorContacts.setValue([emp])
      component.removeEmployee(emp as any, 'creatorContacts')
      expect(component.contentForm.controls.creatorContacts.value).toEqual([])
    })

    it('removeField clears the chip input', () => {
      const input = { value: 'x' } as HTMLInputElement
      component.removeField({ input } as any)
      expect(input.value).toBe('')
    })

    it('removeField tolerates a missing input', () => {
      expect(() => component.removeField({ input: null } as any)).not.toThrow()
    })

    it('updateContentService writes through to the content store', () => {
      component.contentMeta = { identifier: 'do_1' } as any
      component.updateContentService('name', 'New name')
      expect(component.contentForm.controls.name.value).toBe('New name')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith({ name: 'New name' }, 'do_1')
    })

    it('setPurposeValue trims into the purpose control', () => {
      component.setPurposeValue('  goal  ')
      expect(component.contentForm.controls.purpose.value).toBe('goal')
    })

    it('timeToSeconds folds hours/minutes/seconds into the duration control', () => {
      component.hours = 1
      component.minutes = 2
      component.seconds = 3
      component.timeToSeconds()
      expect(component.contentForm.controls.duration.value).toBe(3723)
    })

    it('timeToSeconds clamps out-of-range minutes and seconds', () => {
      component.hours = 0
      component.minutes = 90
      component.seconds = 90
      component.timeToSeconds()
      expect(component.contentForm.controls.duration.value).toBe(59 * 60 + 59)
    })

    it('assignExpiryDate toggles between a real date and the never-expires sentinel', () => {
      component.canExpiry = true
      component.assignExpiryDate()
      expect(component.canExpiry).toBe(false)
      expect(component.contentForm.controls.expiryDate.value).toBe('99991231T235959+0000')
      component.assignExpiryDate()
      expect(component.canExpiry).toBe(true)
      expect(component.contentForm.controls.expiryDate.value instanceof Date).toBe(true)
    })
  })

  describe('mime type and resource type', () => {
    beforeEach(() => {
      component.createForm()
      component.ordinals = ordinals()
    })

    it('uses the collection mime type for a Course', () => {
      component.contentForm.controls.contentType.setValue('Course')
      component.changeMimeType()
      expect(component.contentForm.controls.mimeType.value).toBe('application/vnd.ekstep.content-collection')
    })

    it('falls back to html for other content types', () => {
      component.contentForm.controls.contentType.setValue('Resource')
      component.changeMimeType()
      expect(component.contentForm.controls.mimeType.value).toBe('application/html')
    })

    it('detects a YouTube artifact URL from the instance url patterns', () => {
      configSvc.instanceConfig.authoring = {
        urlPatternMatching: [{ pattern: 'youtube', allowIframe: true, source: 'youtube' }],
      }
      component.contentForm.controls.contentType.setValue('Resource')
      component.contentForm.controls.artifactUrl.setValue('http://youtube.com/watch')
      component.changeMimeType()
      expect(component.contentForm.controls.mimeType.value).toBe('video/x-youtube')
    })

    it('lists resource types for a Resource', () => {
      component.contentForm.controls.contentType.setValue('Resource')
      component.changeResourceType()
      expect(component.resourceTypes).toEqual(['Video', 'PDF'])
    })

    it('lists offering modes for other content types', () => {
      component.contentForm.controls.contentType.setValue('Course')
      component.changeResourceType()
      expect(component.resourceTypes).toEqual(['Online', 'Offline'])
    })

    it('clears the resource type when the current category is not offered', () => {
      component.contentForm.controls.contentType.setValue('Resource')
      // resourceType mirrors into categoryType, so set the category last to make it
      // the one that falls outside the offered list.
      component.contentForm.controls.resourceType.setValue('Video')
      component.contentForm.controls.categoryType.setValue('Unknown')
      component.changeResourceType()
      expect(component.contentForm.controls.resourceType.value).toBe('')
    })
  })

  describe('filterOrdinals', () => {
    beforeEach(() => component.createForm())

    it('accepts plain string complexity levels', () => {
      component.ordinals = { complexityLevel: ['Easy', 'Hard'] }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual(['Easy', 'Hard'])
    })

    it('accepts object complexity levels without conditions', () => {
      component.ordinals = { complexityLevel: [{ value: 'Easy' }] }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual(['Easy'])
    })

    it('includes a conditional level when showFor matches the form value', () => {
      component.contentMeta = {} as any
      component.contentForm.controls.contentType.setValue('Course')
      component.ordinals = {
        complexityLevel: [{ value: 'Easy', condition: { showFor: [{ contentType: ['Course'] }] } }],
      }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual(['Easy'])
    })

    it('excludes a conditional level when showFor does not match', () => {
      component.contentMeta = {} as any
      component.contentForm.controls.contentType.setValue('Resource')
      component.ordinals = {
        complexityLevel: [{ value: 'Easy', condition: { showFor: [{ contentType: ['Course'] }] } }],
      }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual([])
    })
  })

  describe('storeData', () => {
    beforeEach(() => {
      component.createForm()
      component.contentMeta = { identifier: 'do_1' } as any
      component.isEditEnabled = true
      component.canExpiry = false
    })

    it('does nothing when there is no original meta to diff against', () => {
      contentService.getOriginalMeta.mockReturnValue(undefined)
      component.storeData()
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('does nothing when editing is disabled', () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_1' })
      component.isEditEnabled = false
      component.storeData()
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('sends only the changed fields to the content store', () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_1',
        name: 'Old',
        mimeType: 'application/html',
        versionKey: 'vk1',
      })
      component.contentForm.controls.name.setValue('New')
      component.storeData()
      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.name).toBe('New')
      expect(meta.versionKey).toBe('vk1')
      expect(contentService.setUpdatedMeta.mock.calls[0][1]).toBe('do_1')
    })

    it('preserves the original artifact for exempt mime types', () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_1',
        mimeType: 'application/quiz',
        artifactUrl: 'orig.json',
        versionKey: 'vk1',
      })
      // The form carries a stale/blank artifact; for an exempt mime type the original
      // wins, so neither field ends up in the delta sent to the store.
      component.contentForm.controls.artifactUrl.setValue('stale.json')
      component.contentForm.controls.mimeType.setValue('application/html')
      component.type = 'quiz'
      component.storeData()
      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.artifactUrl).toBeUndefined()
      expect(meta.mimeType).toBeUndefined()
    })

    it('drops the artifact URL from stage 1 of an untyped editor', () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_1',
        mimeType: 'application/quiz',
        artifactUrl: 'orig.json',
        versionKey: 'vk1',
      })
      component.stage = 1
      component.type = ''
      component.storeData()
      expect(contentService.setUpdatedMeta.mock.calls[0][0].artifactUrl).toBeUndefined()
    })

    it('inherits blank draft fields from the parent content', () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_1',
        versionKey: 'vk1',
        mimeType: 'application/html',
      })
      contentService.parentUpdatedMeta.mockReturnValue({
        identifier: 'parent_1',
        subTitle: 'Parent sub',
        body: 'Parent body',
        instructions: 'Parent inst',
        categoryType: 'Cat',
        resourceType: 'Video',
        sourceName: 'Src',
        lang: 'en',
      })
      component.contentForm.controls.status.setValue('Draft')
      component.contentForm.controls.subTitle.setValue('')
      component.storeData()
      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.subTitle).toBe('Parent sub')
      expect(meta.purpose).toBe('Parent sub')
      expect(meta.lang).toBe('en')
    })

    it('serialises the expiry date when expiry is enabled', () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_1',
        versionKey: 'vk1',
        mimeType: 'application/html',
      })
      component.canExpiry = true
      component.contentForm.controls.expiryDate.setValue(new Date('2030-01-02T03:04:05.000Z'))
      component.storeData()
      expect(contentService.setUpdatedMeta.mock.calls[0][0].expiryDate).toBe('20300102T030405+0000')
    })

    it('warns the author when the content meta is not yet available', () => {
      component.contentMeta = undefined as any
      component.storeData()
      expect(snackBar.open).toHaveBeenCalledWith('Please Save Parent first and refresh page.')
    })
  })

  describe('assignFields', () => {
    beforeEach(() => {
      component.ordinals = ordinals()
      component.contentMeta = { identifier: 'do_1', contentType: 'Course' } as any
    })

    it('creates the form when one does not exist yet', () => {
      component.assignFields()
      expect(component.contentForm).toBeDefined()
    })

    it('populates the form from the fresh read and reveals the gated fields', () => {
      component.assignFields()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_1')
      expect(component.contentForm.controls.name.value).toBe('Course A')
      expect(component.contentForm.controls.lang.value).toBe('en')
      expect(component.metaLoaded).toBe(true)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('marks self competency when the read reports it', () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ selfAssessment: true })))
      component.assignFields()
      expect(component.selectedSelfCompetency).toBe(true)
    })

    it('parses stored competencies from the read response', () => {
      editorService.readcontentV3.mockReturnValue(of(readResponse({ competencies_v1: JSON.stringify([{ competencyId: 'c1' }]) })))
      component.assignFields()
      expect(component.competencies).toEqual([{ competencyId: 'c1' }])
    })

    it('sums child durations and pushes the corrected total upstream', () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          readResponse({
            children: [{ duration: '60' }, { duration: '30', children: [{ duration: '10' }] }],
          }),
        ),
      )
      component.assignFields()
      expect(component.sumDuration).toBe(100)
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
      expect(component.minutes).toBe(1)
      expect(component.seconds).toBe(40)
    })

    it('still reveals the fields when the read fails', () => {
      editorService.readcontentV3.mockReturnValue(throwError(() => 'boom'))
      component.assignFields()
      expect(component.metaLoaded).toBe(true)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('marks controls dirty when a submit has already been attempted', () => {
      component.isSubmitPressed = true
      component.assignFields()
      expect(component.contentForm.dirty).toBe(true)
      expect(component.contentForm.touched).toBe(true)
    })

    it('leaves controls pristine before the first submit', () => {
      component.isSubmitPressed = false
      component.assignFields()
      expect(component.contentForm.dirty).toBe(false)
    })
  })

  describe('content setter', () => {
    beforeEach(() => {
      component.ordinals = ordinals()
      component.createForm()
      // The setter delegates to assignFields(), whose fresh read would overwrite
      // contentMeta. Hold that read open so the setter's own mapping is observable.
      editorService.readcontentV3.mockReturnValue(new Subject())
    })

    it('blanks the placeholder "Untitled Content" name', () => {
      ;(component as any).content = { identifier: 'do_1', name: 'Untitled Content' }
      expect(component.contentMeta.name).toBe('')
    })

    it('keeps a real content name', () => {
      ;(component as any).content = { identifier: 'do_1', name: 'Real name' }
      expect(component.contentMeta.name).toBe('Real name')
    })

    it('parses the stringified people fields', () => {
      ;(component as any).content = {
        identifier: 'do_1',
        name: 'n',
        creatorContacts: JSON.stringify([{ id: 'u1' }]),
        reviewer: JSON.stringify([{ id: 'u2' }]),
        creatorDetails: JSON.stringify([{ id: 'u3' }]),
        publisherDetails: JSON.stringify([{ id: 'u4' }]),
      }
      expect(component.contentMeta.creatorContacts).toEqual([{ id: 'u1' }])
      expect(component.contentMeta.trackContacts).toEqual([{ id: 'u2' }])
      expect(component.contentMeta.creatorDetails).toEqual([{ id: 'u3' }])
      expect(component.contentMeta.publisherDetails).toEqual([{ id: 'u4' }])
    })

    it('treats the sentinel expiry date as never-expires', () => {
      ;(component as any).content = {
        identifier: 'do_1',
        name: 'n',
        expiryDate: '99991231T235959+0000',
      }
      expect(component.canExpiry).toBe(false)
    })

    it('enables editing only for the creator with access', () => {
      contentService.hasAccess.mockReturnValue(true)
      configSvc.userProfile = { userId: 'u1' }
      ;(component as any).content = { identifier: 'do_1', name: 'n', createdBy: 'u1' }
      expect(component.isEditEnabled).toBe(true)
    })

    it('disables editing for a non-creator', () => {
      contentService.hasAccess.mockReturnValue(true)
      configSvc.userProfile = { userId: 'u1' }
      ;(component as any).content = { identifier: 'do_1', name: 'n', createdBy: 'someone-else' }
      expect(component.isEditEnabled).toBe(false)
    })

    it('publishes the content into the shared content service', () => {
      ;(component as any).content = { identifier: 'do_1', name: 'n' }
      expect(contentService.currentContentID).toBe('do_1')
      expect(contentService.currentContentData).toBe(component.contentMeta)
    })

    it('converts a real expiry date into a Date instance', () => {
      ;(component as any).content = {
        identifier: 'do_1',
        name: 'n',
        expiryDate: '20301231T235959+0000',
      }
      expect(component.canExpiry).toBe(true)
      expect(component.contentMeta.expiryDate instanceof Date).toBe(true)
    })
  })

  describe('uploads', () => {
    const file = (name: string, size = 100) => {
      const f = new File(['x'], name, { type: 'image/png' })
      Object.defineProperty(f, 'size', { value: size })
      return f
    }

    beforeEach(() => component.createForm())

    it('uploadAppIcon rejects an unsupported extension', () => {
      component.uploadAppIcon(file('bad.gif'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('uploadAppIcon rejects an oversized image', () => {
      component.uploadAppIcon(file('big.png', 5 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('uploadSourceIcon rejects an unsupported extension', () => {
      component.uploadSourceIcon(file('bad.gif'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('uploadSourceIcon rejects an oversized image', () => {
      component.uploadSourceIcon(file('big.png', 5 * 1024 * 1024))
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('uploadSourceIcon writes the creator logo fields on success', () => {
      uploadService.upload.mockReturnValue(of({ result: { artifactUrl: 'logo.png' } }))
      component.contentMeta = { identifier: 'do_1' } as any
      component.uploadSourceIcon(file('logo.png'))
      afterClosed.next(file('logo.png'))
      expect(component.contentForm.controls.creatorLogo.value).toBe('logo.png')
      expect(component.contentForm.controls.creatorThumbnail.value).toBe('logo.png')
      expect(component.contentForm.controls.creatorPosterImage.value).toBe('logo.png')
    })

    it('uploadSourceIcon does nothing when the crop dialog is cancelled', () => {
      component.contentMeta = { identifier: 'do_1' } as any
      component.uploadSourceIcon(file('logo.png'))
      afterClosed.next(null)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('uploadSourceIcon reports an upload failure', () => {
      uploadService.upload.mockReturnValue(throwError(() => 'nope'))
      component.contentMeta = { identifier: 'do_1' } as any
      component.uploadSourceIcon(file('logo.png'))
      afterClosed.next(file('logo.png'))
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('openThumbnailCropDialog creates the asset then stores the uploaded icon', () => {
      component.contentMeta = { identifier: 'do_1' } as any
      ;(component as any).openThumbnailCropDialog(file('icon.png'), 'icon.png', new FormData())
      afterClosed.next(file('icon.png'))
      expect(http.post).toHaveBeenCalled()
      expect(component.contentForm.controls.appIcon.value).toBe('a/b.png')
      expect(component.contentForm.controls.thumbnail.value).toBe('a/b.png')
      expect(authInitService.uploadData).toHaveBeenCalledWith('thumbnail')
    })

    it('openThumbnailCropDialog surfaces a service-reported error', () => {
      uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'too big' }))
      component.contentMeta = { identifier: 'do_1' } as any
      ;(component as any).openThumbnailCropDialog(file('icon.png'), 'icon.png', new FormData())
      afterClosed.next(file('icon.png'))
      expect(snackBar.open).toHaveBeenCalledWith('too big', undefined, { duration: 2000 })
    })
  })

  describe('misc helpers', () => {
    beforeEach(() => component.createForm())

    it('enableClick / onFocusOutName toggle the inline edit flag', () => {
      component.enableClick()
      expect(component.fieldActive).toBe(true)
      component.onFocusOutName()
      expect(component.fieldActive).toBe(false)
    })

    it('trackByIndex returns the index', () => {
      expect(component.trackByIndex(4)).toBe(4)
    })

    it('changeCertificate toggles the certificate section', () => {
      component.changeCertificate('Yes')
      expect(component.isAddCerticate).toBe(true)
      component.changeCertificate('No')
      expect(component.isAddCerticate).toBe(false)
    })

    it('conceptToggle flips the concepts panel', () => {
      component.conceptToggle()
      expect(component.addConcepts).toBe(true)
    })

    it('formNext records the selected step', () => {
      component.formNext(3)
      expect(component.selectedIndex).toBe(3)
    })

    it('showInfo toggles the info panel for a field', () => {
      component.showInfo('lang')
      expect(component.infoType).toBe('lang')
      component.showInfo('lang')
      expect(component.infoType).toBe('')
    })

    it('compareSkillFn matches on identifier', () => {
      expect(component.compareSkillFn({ identifier: 'a' }, { identifier: 'a' })).toBe(true)
      expect(component.compareSkillFn({ identifier: 'a' }, { identifier: 'b' })).toBe(false)
      expect(component.compareSkillFn(null as any, null as any)).toBe(true)
    })

    it('removeSkill drops the skill from the selection', () => {
      component.selectedSkills = ['a', 'b']
      component.removeSkill('a')
      expect(component.selectedSkills).toEqual(['b'])
    })

    it('convertToISODate parses the Sunbird date format', () => {
      const d = component.convertToISODate('20301231T235959+0000')
      expect(d.getUTCFullYear()).toBe(2030)
      expect(d.getUTCMonth()).toBe(11)
    })

    it('addCommonToCatalog prefixes only the paths that need it', () => {
      expect(component.addCommonToCatalog(['Health', 'Common>Finance'])).toEqual(['Common>Health', 'Common>Finance'])
    })

    it('parseJsonData returns the parsed value', () => {
      expect(component.parseJsonData('[1,2]')).toEqual([1, 2])
    })

    it('parseJsonData returns an empty list for malformed input', () => {
      expect(component.parseJsonData('not json')).toEqual([])
    })

    it('onSubmit emits the form submit event', () => {
      const spy = jest.fn()
      component.courseEditFormSubmit.subscribe(spy)
      component.onSubmit()
      expect(spy).toHaveBeenCalledWith(true)
    })

    it('moduleCreate switches the module form into save mode', () => {
      component.moduleCreate('Module 1')
      expect(component.moduleName).toBe('Module 1')
      expect(component.isSaveModuleFormEnable).toBe(true)
      expect(component.moduleButtonName).toBe('Save')
    })

    it('changeToDefaultImg swaps in the configured fallback logo', () => {
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('default.png')
    })

    it('changeToDefaultImg blanks the source when no instance config exists', () => {
      configSvc.instanceConfig = null
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('')
    })

    it('generateUrl returns the URL unchanged', () => {
      ;(window as any).env = { azureBucket: 'bucket' }
      expect(component.generateUrl('http://host/bucket/x.png')).toBe('http://host/bucket/x.png')
      expect(component.generateUrl('http://host/other/x.png')).toBe('http://host/other/x.png')
    })

    it('exposes the description byte budget and live byte length', () => {
      expect(component.maxInstructionsBytes).toBe(MAX_INSTRUCTIONS_BYTES)
      component.contentForm.controls.instructions.setValue('héllo')
      expect(component.instructionsByteLength).toBe(6)
    })

    it('reports a zero byte length before the form exists', () => {
      component.contentForm = undefined as any
      expect(component.instructionsByteLength).toBe(0)
    })

    it('updateReviewer is a no-op retained for the template binding', () => {
      expect(() => component.updateReviewer()).not.toThrow()
    })
  })

  describe('checkCondition and showError', () => {
    beforeEach(() => {
      component.createForm()
      component.contentMeta = { identifier: 'do_1' } as any
    })

    it('always reports disabled while editing is off', () => {
      component.isEditEnabled = false
      expect(component.checkCondition('name', 'disabled')).toBe(true)
      expect(contentService.checkCondition).not.toHaveBeenCalled()
    })

    it('delegates other conditions to the content service', () => {
      component.isEditEnabled = true
      contentService.checkCondition.mockReturnValue(true)
      expect(component.checkCondition('name', 'required')).toBe(true)
      expect(contentService.checkCondition).toHaveBeenCalledWith('do_1', 'name', 'required')
    })

    it('showError is false when the field is not required', () => {
      contentService.checkCondition.mockReturnValue(false)
      expect(component.showError('name')).toBe(false)
    })

    it('showError is true for a missing required field after submit', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = true
      expect(component.showError('name')).toBe(true)
    })

    it('showError is true for a missing required field once touched', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = false
      component.contentForm.controls.name.markAsTouched()
      expect(component.showError('name')).toBe(true)
    })

    it('showError is false for an untouched field before submit', () => {
      contentService.checkCondition.mockReturnValue(true)
      contentService.isPresent.mockReturnValue(false)
      component.isSubmitPressed = false
      expect(component.showError('name')).toBe(false)
    })
  })

  describe('addEmployee', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.createForm()
      component.trackContactsView = { nativeElement: { value: 'x' } } as any
      component.contentForm.controls.trackContacts.setValue([])
    })

    it('ignores a selection without an id', () => {
      component.addEmployee({ option: { value: {} } } as any, 'trackContacts')
      expect(component.contentForm.controls.trackContacts.value).toEqual([])
    })

    it('adds the employee when no unique role check is configured', () => {
      component.addEmployee({ option: { value: { id: 'u2', displayName: 'Two' } } } as any, 'trackContacts')
      expect(component.contentForm.controls.trackContacts.value).toEqual([{ id: 'u2', name: 'Two' }])
      expect(component.trackContactsView.nativeElement.value).toBe('')
    })

    it('adds a reviewer that holds the reviewer role', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(of(['reviewer']))
      component.addEmployee({ option: { value: { id: 'u2', displayName: 'Two' } } } as any, 'trackContacts')
      expect(component.contentForm.controls.trackContacts.value).toEqual([{ id: 'u2', name: 'Two' }])
    })

    it('rejects a reviewer without a qualifying role', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(of(['learner']))
      component.addEmployee({ option: { value: { id: 'u2', displayName: 'Two' } } } as any, 'trackContacts')
      expect(component.contentForm.controls.trackContacts.value).toEqual([])
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('reports a failed role lookup', () => {
      accessService.authoringConfig.doUniqueCheck = true
      editorService.checkRole.mockReturnValue(throwError(() => 'boom'))
      component.addEmployee({ option: { value: { id: 'u2', displayName: 'Two' } } } as any, 'trackContacts')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('catalog and clipboard', () => {
    beforeEach(() => {
      component.createForm()
      component.contentMeta = { identifier: 'do_1' } as any
      ;(document as any).execCommand = jest.fn()
    })

    it('openCatalogSelector writes the dialog result back to the form', () => {
      component.contentForm.controls.catalogPaths.setValue(['Health'])
      component.openCatalogSelector()
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(['Common>Health', 'Common>Finance'])
      expect(component.contentForm.controls.catalogPaths.value).toEqual(['Common>Health', 'Common>Finance'])
    })

    it('copyData copies the keyword list', () => {
      component.contentForm.controls.keywords.setValue(['a', 'b'])
      component.copyData('keyword')
      expect(document.execCommand).toHaveBeenCalledWith('copy')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('copyData copies a preview URL that carries the parent collection id', () => {
      component.contentForm.controls.mimeType.setValue('application/html')
      component.copyData('previewUrl')
      expect(document.execCommand).toHaveBeenCalledWith('copy')
    })
  })

  describe('autocomplete filtering', () => {
    beforeEach(() => component.ngOnInit())

    it('filters the audience list by the typed value', () => {
      component.audienceCtrl.setValue('adv')
      ;(component as any).fetchAudience()
      expect(component.audienceList).toEqual(['Advanced'])
    })

    it('restores the full audience list when the input is blank', () => {
      component.audienceCtrl.setValue('   ')
      ;(component as any).fetchAudience()
      expect(component.audienceList).toEqual(['Beginner', 'Advanced'])
    })

    it('filters the job profile list', () => {
      component.jobProfileCtrl.setValue('eng')
      ;(component as any).fetchJobProfile()
      expect(component.jobProfileList).toEqual(['Engineer'])
    })

    it('restores the full job profile list when blank', () => {
      component.jobProfileCtrl.setValue('')
      ;(component as any).fetchJobProfile()
      expect(component.jobProfileList).toEqual(['Engineer', 'Manager'])
    })

    it('filters the region list', () => {
      component.regionCtrl.setValue('nor')
      ;(component as any).fetchRegion()
      expect(component.regionList).toEqual(['North'])
    })

    it('empties the region list when the input is blank', () => {
      component.regionCtrl.setValue('')
      ;(component as any).fetchRegion()
      expect(component.regionList).toEqual([])
    })

    it('filters access paths by prefix', () => {
      component.accessPathsCtrl.setValue('pathA')
      ;(component as any).fetchAccessRestrictions()
      expect(component.accessPathList).toEqual(['pathA'])
    })

    it('restores the full access path list when blank', () => {
      component.accessPathsCtrl.setValue('  ')
      ;(component as any).fetchAccessRestrictions()
      expect(component.accessPathList).toEqual(['pathA', 'pathB'])
    })
  })
})
