import { TestBed } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { BehaviorSubject, of } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

/**
 * The publisher is assigned a fixed account rather than picked by the author.
 * It used to be chosen from `window.location.origin`, which stamped a stage-only
 * id onto content and left those courses invisible in the publisher's queue once
 * production accounts were migrated onto the environment.
 */
describe('CourseSettingsComponent (publisher assignment)', () => {
  const PUBLISHER_ID = 'b4509d72-87cc-4317-9012-d4b03e307fa5'

  let component: CourseSettingsComponent
  let fb: FormBuilder

  const build = () => {
    const editorService = {
      getAllEntities: jest.fn(() => of({ result: { entity: [] } })),
      readcontentV3: jest.fn(() => of({ duration: 0, identifier: 'id', name: 'n', children: [] })),
      rolesMapped: jest.fn(() => of([])),
      sourceNames: jest.fn(() => of([])),
      fetchEmployeeList: jest.fn(() => of([])),
      updateNewContentV3: jest.fn(() => of({})),
      checkRole: jest.fn(() => of(['admin'])),
    }
    const contentService = {
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
    const configSvc = {
      userProfile: { userId: 'u1', givenName: 'User One' },
      instanceConfig: { authoring: { urlPatternMatching: [] }, logos: { defaultContent: 'default.png' } },
      activeLocale: { locals: ['en'] },
    }
    const authInitService = {
      ordinals: {
        audience: [],
        jobProfile: [],
        complexityLevel: [],
        resourceType: [],
        categoryType: [],
        region: [],
        accessPaths: [],
        'Offering Mode': [],
      },
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      authConfig: {},
      isEditMetaPageAction: jest.fn(),
      uploadData: jest.fn(),
    }

    return new CourseSettingsComponent(
      fb,
      { upload: jest.fn(() => of({})) } as any,
      { open: jest.fn(), openFromComponent: jest.fn() } as any,
      { open: jest.fn(() => ({ afterClosed: () => of(undefined) })) } as any,
      editorService as any,
      contentService as any,
      configSvc as any,
      { detach: jest.fn(), detectChanges: jest.fn() } as any,
      { changeLoad: { next: jest.fn() } } as any,
      authInitService as any,
      { rootOrg: 'other', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } } as any,
      { post: jest.fn(() => of({})) } as any,
      { url: '/author/editor/abc/collection', navigate: jest.fn(), events: of() } as any,
      { parentData: null } as any,
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

  it('assigns the publisher as a single-element array', () => {
    component.createForm()

    expect(component.contentForm.controls.publisherDetails.value).toEqual([{ id: PUBLISHER_ID, name: 'Publisher Aastrika' }])
  })

  it('assigns the same publisher id whatever host the portal is served from', () => {
    const hosts = ['https://cbp-staging.aastrika.org', 'https://cbp-sphere.aastrika.org', 'http://localhost:3000']

    hosts.forEach(origin => {
      const fresh = build()
      jest.spyOn(window, 'location', 'get').mockReturnValue({ origin } as any)

      fresh.createForm()

      expect(fresh.contentForm.controls.publisherDetails.value).toEqual([{ id: PUBLISHER_ID, name: 'Publisher Aastrika' }])
      if (fresh.timer) {
        clearInterval(fresh.timer)
      }
    })
  })
})
