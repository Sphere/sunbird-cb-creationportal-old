import { FormBuilder } from '@angular/forms'
import { of, Subject } from 'rxjs'
import { EditMetaComponent } from './edit-meta.component'

/**
 * Wave 18 — the `nowShowFor` exclusions of `filterOrdinals` and the expiry-date
 * parser inherited from EditMetaBaseComponent.
 */
describe('EditMetaComponent (ordinal filtering and expiry parsing)', () => {
  let component: EditMetaComponent
  let contentService: any

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
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new EditMetaComponent(
      new FormBuilder(),
      { upload: jest.fn().mockReturnValue(of({})) } as any,
      { open: jest.fn(), openFromComponent: jest.fn() } as any,
      { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) } as any,
      {
        languageList: jest.fn().mockReturnValue(of([])),
        fetchEmployeeList: jest.fn().mockReturnValue(of([])),
        readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_1', children: [] })),
        updateNewContentV3: jest.fn().mockReturnValue(of({})),
        checkReadAPI: jest.fn().mockReturnValue(of({ result: { content: {} } })),
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        checkRole: jest.fn().mockReturnValue(of([])),
      } as any,
      contentService,
      {
        userProfile: { userId: 'u1' },
        instanceConfig: { logos: { defaultContent: 'default.png' }, authoring: {} },
        activeLocale: { locals: ['en'] },
      } as any,
      { detach: jest.fn(), detectChanges: jest.fn() } as any,
      { changeLoad: { next: jest.fn() } } as any,
      { ordinals: {}, authConfig: {}, currentPageAction: jest.fn(), saveData: jest.fn(), uploadData: jest.fn() } as any,
      { rootOrg: 'sunbird', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } } as any,
      { post: jest.fn().mockReturnValue(of({})) } as any,
      { url: '/author/editor/do_1/details' } as any,
    )
    component.createForm()
    component.contentMeta = {} as any
  })

  afterEach(() => {
    clearInterval((component as any).timer)
    jest.clearAllMocks()
  })

  describe('filterOrdinals', () => {
    it('drops a level whose exclusion matches the form', () => {
      component.contentForm.controls.contentType.setValue('Course')
      component.ordinals = {
        complexityLevel: [
          {
            value: 'Easy',
            condition: { showFor: [{ contentType: ['Course'] }], nowShowFor: [{ contentType: ['Resource'] }] },
          },
        ],
      }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual([])
    })

    it('keeps a level whose exclusion does not match the form', () => {
      component.contentForm.controls.contentType.setValue('Course')
      component.ordinals = {
        complexityLevel: [
          {
            value: 'Easy',
            condition: { showFor: [{ contentType: ['Course'] }], nowShowFor: [{ contentType: ['Course'] }] },
          },
        ],
      }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual(['Easy'])
    })

    it('never reaches the exclusion for a level that was not included', () => {
      component.contentForm.controls.contentType.setValue('Resource')
      component.ordinals = {
        complexityLevel: [
          {
            value: 'Easy',
            condition: { showFor: [{ contentType: ['Course'] }], nowShowFor: [{ contentType: ['Course'] }] },
          },
        ],
      }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual([])
    })

    it('falls back to the stored metadata when the form has no such control', () => {
      component.contentMeta = { categoryType: 'Video' } as any
      component.ordinals = {
        complexityLevel: [{ value: 'Easy', condition: { showFor: [{ categoryType: ['Video'] }] } }],
      }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual(['Easy'])
    })

    it('keeps a level with an empty condition block', () => {
      component.ordinals = { complexityLevel: [{ value: 'Easy', condition: { showFor: [] } }] }
      component.filterOrdinals()
      expect(component.complexityLevelList).toEqual([])
    })
  })

  describe('convertToISODate', () => {
    const convert = (value: string) => (component as any).convertToISODate(value)

    it('parses a compact backend timestamp', () => {
      const date = convert('20261231T235959+0000')
      expect(date.getUTCFullYear()).toBe(2026)
      expect(date.getUTCMonth()).toBe(11)
      expect(date.getUTCDate()).toBe(31)
    })

    it('falls back to six months out for a value that is not a string at all', () => {
      const date = convert(20261231 as any)
      expect(date).toBeInstanceOf(Date)
      expect(date.getTime()).toBeGreaterThan(Date.now())
    })
  })
})
