import { FormBuilder } from '@angular/forms'

import { EMPTY, of } from 'rxjs'

import { IMAGE_MAX_SIZE } from '../../../../../constants/upload'
import { ImageCropComponent } from '../../../../../../../../../../library/ws-widget/utils/src/public-api'
import { CreateCourseComponent } from './create-course.component'

// CreateCourseComponent has a large template and 20 injected collaborators. We
// instantiate it directly with mocks and exercise its form setup and the
// deterministic helper/validation logic, avoiding brittle full TestBed rendering.
describe('CreateCourseComponent', () => {
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
      editorService: { getAllEntities: jest.fn().mockReturnValue(of({ result: { response: [] } })) },
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

  it('should create', () => {
    const { component } = build()
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('builds the course and self-assessment forms with required validators', () => {
      const { component } = build()
      component.ngOnInit()
      expect(component.createCourseForm.get('courseName')).toBeTruthy()
      expect(component.createCourseForm.get('courseDescription')).toBeTruthy()
      expect(component.createCourseForm.valid).toBe(false)
      component.createCourseForm.patchValue({ courseName: 'A', courseDescription: 'B' })
      expect(component.createCourseForm.valid).toBe(true)
    })

    it('flags self-assessment mode from the status query param', () => {
      const { component } = build({ route: { queryParams: of({ status: 'selfAssessment' }) } })
      component.ngOnInit()
      expect(component.isSelfAssessment).toBe(true)
    })

    it('separates the resource entity from the other creation entities', () => {
      const { component } = build({
        authInitService: {
          creationEntity: [
            { id: 'course', parent: false, available: true, contentType: 'Course' },
            { id: 'resource', parent: false, available: true },
            { id: 'skipped', parent: true, available: true },
          ],
        },
      })
      component.ngOnInit()
      expect(component.resourceEntity.id).toBe('resource')
      expect(component.entity).toHaveLength(1)
      expect(component.entity[0].id).toBe('course')
    })
  })

  describe('search', () => {
    beforeEach(() => {})

    it('returns all options when the filter is empty', () => {
      const { component } = build()
      component.searchComp = [{ name: 'Angular' }, { name: 'React' }]
      expect(component.search('')).toEqual(component.searchComp)
    })

    it('filters by name (case-insensitive)', () => {
      const { component } = build()
      const list = [{ name: 'Angular' }, { name: 'React' }]
      component.searchComp = list
      component.proficiencyList = list
      expect(component.search('ang')).toEqual([{ name: 'Angular' }])
    })

    it('also matches the additionalProperties Code', () => {
      const { component } = build()
      const list = [{ name: 'Angular', additionalProperties: { Code: 'NG' } }, { name: 'React' }]
      component.searchComp = list
      component.proficiencyList = list
      expect(component.search('ng')).toEqual([list[0]])
    })
  })

  describe('helpers', () => {
    it('onKey delegates to search', () => {
      const { component } = build()
      const spy = jest.spyOn(component, 'search').mockReturnValue(['x'])
      component.onKey('a')
      expect(spy).toHaveBeenCalledWith('a')
      expect(component.proficiencyList).toEqual(['x'])
    })

    it('eventSelection stores the proficiency', () => {
      const { component } = build()
      component.eventSelection({ id: 5 })
      expect(component.proficiency).toEqual({ id: 5 })
    })

    it('langSelected stores the selected language', () => {
      const { component } = build()
      component.langSelected('hi')
      expect(component.lang).toBe('hi')
    })

    it('createForm builds a minimal name form', () => {
      const { component } = build()
      component.createForm()
      expect(component.createCourseForm.get('name')).toBeTruthy()
    })

    it('changeToDefaultImg uses the instance default content logo', () => {
      const { component } = build()
      const event = { target: { src: '' } }
      component.changeToDefaultImg(event)
      expect(event.target.src).toBe('default.png')
    })

    it('changeToDefaultImg falls back to empty when no instance config', () => {
      const { component } = build({ configSvc: { instanceConfig: null } })
      const event = { target: { src: 'x' } }
      component.changeToDefaultImg(event)
      expect(event.target.src).toBe('')
    })

    it('generateUrl returns the original url when it already targets the bucket', () => {
      ;(window as any).env = { azureBucket: 'mybucket' }
      const { component } = build()
      expect(component.generateUrl('https://host/mybucket/file.jpg')).toBe('https://host/mybucket/file.jpg')
    })
  })

  describe('uploadAppIcon', () => {
    it('rejects an unsupported file type with a snackbar and no dialog', () => {
      const { component, mocks } = build()
      component.uploadAppIcon({ name: 'notes.txt', size: 10 } as File)
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an oversized image with a snackbar and no dialog', () => {
      const { component, mocks } = build()
      component.uploadAppIcon({ name: 'pic.png', size: IMAGE_MAX_SIZE + 1 } as File)
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('opens the image crop dialog for a valid image', () => {
      const { component, mocks } = build()
      component.uploadAppIcon({ name: 'pic.png', size: 100 } as File)
      expect(mocks.dialog.open).toHaveBeenCalledWith(ImageCropComponent, expect.objectContaining({ width: '70%' }))
    })
  })

  describe('ipr / info toggles', () => {
    it('iprChecked toggles acceptance', () => {
      const { component } = build()
      expect(component.iprAccepted).toBe(false)
      component.iprChecked()
      expect(component.iprAccepted).toBe(true)
      component.iprChecked()
      expect(component.iprAccepted).toBe(false)
    })

    it('showInfo toggles the active info type', () => {
      const { component } = build()
      component.showInfo('thumbnail')
      expect(component.infoType).toBe('thumbnail')
      component.showInfo('thumbnail')
      expect(component.infoType).toBe('')
    })

    it('showIpr stores the dialog result', () => {
      const { component } = build({ dialog: { open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }) } })
      component.showIpr()
      expect(component.iprAccepted).toBe(true)
    })
  })

  describe('navigateTo', () => {
    it('navigates to features', () => {
      const router = { navigate: jest.fn(), navigateByUrl: jest.fn() }
      const { component } = build({ router })
      component.navigateTo('features')
      expect(router.navigate).toHaveBeenCalledWith(['/app/features'])
    })

    it('does nothing for an unknown param', () => {
      const router = { navigate: jest.fn(), navigateByUrl: jest.fn() }
      const { component } = build({ router })
      component.navigateTo('other')
      expect(router.navigate).not.toHaveBeenCalled()
    })
  })

  describe('triggerNext', () => {
    it('is a no-op in self-assessment mode', () => {
      const { component } = build()
      component.isSelfAssessment = true
      const spy = jest.spyOn(component, 'onSubmit')
      component.triggerNext()
      expect(spy).not.toHaveBeenCalled()
    })

    it('warns and blocks when the form is invalid or IPR not accepted', () => {
      const { component, mocks } = build()
      component.ngOnInit()
      const spy = jest.spyOn(component, 'onSubmit')
      component.triggerNext()
      expect(mocks.snackBar.open).toHaveBeenCalled()
      expect(component.createCourseForm.touched).toBe(true)
      expect(spy).not.toHaveBeenCalled()
    })

    it('submits when the form is valid and IPR accepted', () => {
      const { component } = build()
      component.ngOnInit()
      component.createCourseForm.patchValue({ courseName: 'A', courseDescription: 'B' })
      component.iprAccepted = true
      const spy = jest.spyOn(component, 'onSubmit').mockImplementation(() => {})
      component.triggerNext()
      expect(spy).toHaveBeenCalledWith(component.createCourseForm)
    })
  })

  describe('onSubmit / createSelfAssessment', () => {
    it('onSubmit stores the form value and delegates to contentClicked', () => {
      const { component } = build()
      const spy = jest.spyOn(component, 'contentClicked').mockImplementation(() => {})
      component.onSubmit({ value: { courseName: 'X' } })
      expect(component.courseData).toEqual({ courseName: 'X' })
      expect(spy).toHaveBeenCalled()
    })

    it('createSelfAssessment stores the form value and delegates', () => {
      const { component } = build()
      const spy = jest.spyOn(component, 'createSelfAssessmentCourse').mockImplementation(() => {})
      component.createSelfAssessment({ value: { proficiency: 'p' } })
      expect(component.courseData).toEqual({ proficiency: 'p' })
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('getChildrenCount', () => {
    it('counts quiz/json leaves at top and nested levels, ignoring CourseUnit', () => {
      const { component } = build()
      component.courseData = {
        children: [
          { contentType: 'Resource', mimeType: 'application/quiz' },
          { contentType: 'CourseUnit', mimeType: 'application/json' },
          {
            contentType: 'Collection',
            mimeType: 'application/vnd',
            children: [
              { contentType: 'Resource', mimeType: 'application/json' },
              { contentType: 'CourseUnit', mimeType: 'application/quiz' },
            ],
          },
        ],
      }
      expect(component.getChildrenCount()).toBe(2)
    })

    it('returns 0 when there are no children', () => {
      const { component } = build()
      component.courseData = {}
      expect(component.getChildrenCount()).toBe(0)
    })
  })

  describe('contentClicked', () => {
    it('does nothing without content or a course name', () => {
      const svc = { createV2: jest.fn() }
      const { component } = build({ svc })
      component.content = null
      component.courseData = {}
      component.contentClicked()
      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('creates the course, a forum, and navigates to the editor', async () => {
      const svc = {
        createV2: jest.fn().mockReturnValue(of({ identifier: 'id1', versionKey: 'v1' })),
        createForum: jest.fn().mockReturnValue(of({})),
      }
      const editorService = {
        getAllEntities: jest.fn().mockReturnValue(of({ result: { response: [] } })),
        updateNewContentV3: jest.fn().mockReturnValue(of({})),
      }
      const progressSvc = { addComment: jest.fn().mockReturnValue(of({})) }
      const { component, mocks } = build({ svc, editorService, progressSvc })
      component.content = { contentType: 'Course', mimeType: 'm', primaryCategory: 'Course' }
      component.courseData = { courseName: 'My Course' }

      component.contentClicked()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(svc.createV2).toHaveBeenCalled()
      expect(svc.createForum).toHaveBeenCalled()
      expect(mocks.router.navigateByUrl).toHaveBeenCalledWith('/author/editor/id1')
    })
  })
})
