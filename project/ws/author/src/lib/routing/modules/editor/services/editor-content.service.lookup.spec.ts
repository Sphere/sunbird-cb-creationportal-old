import { EditorContentService } from './editor-content.service'

/**
 * Wave 18 — the deep child lookup (`getChildData`), the parent-metadata defaults
 * and the workflow-title branches of `checkUniqueCondition`.
 */
describe('EditorContentService (lookup and workflow conditions)', () => {
  let service: EditorContentService
  let accessService: any
  let editorService: any
  let authInitService: any

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    accessService = { hasAccess: jest.fn().mockReturnValue(true) }
    editorService = { createAndReadContent: jest.fn() }
    authInitService = { authConfig: {} }
    service = new EditorContentService(accessService, editorService, authInitService)
  })

  afterEach(() => jest.restoreAllMocks())

  // ----------------------------------------------------------- getChildData --

  describe('getChildData', () => {
    const seedCourse = () => {
      service.setOriginalMeta({
        identifier: 'course1',
        contentType: 'Course',
        children: [
          {
            identifier: 'mod1',
            contentType: 'CourseUnit',
            children: [
              { identifier: 'res1', name: 'Resource one' },
              { identifier: 'res2', name: 'Resource two' },
            ],
          },
          { identifier: 'res3', name: 'Resource three' },
        ],
      } as any)
    }

    it('finds a direct child of the course', () => {
      seedCourse()
      expect(service.getChildData('res3')).toEqual(expect.objectContaining({ name: 'Resource three' }))
    })

    it('finds a resource nested inside a module', () => {
      seedCourse()
      expect(service.getChildData('res2')).toEqual(expect.objectContaining({ name: 'Resource two' }))
    })

    it('returns nothing for an identifier that is not in the tree', () => {
      seedCourse()
      expect(service.getChildData('missing')).toBeUndefined()
    })

    it('returns nothing when nothing has been loaded', () => {
      expect(service.getChildData('res1')).toBeUndefined()
    })

    it('skips a stored content that has no children at all', () => {
      service.setOriginalMeta({ identifier: 'course1', contentType: 'Course' } as any)
      expect(service.getChildData('res1')).toBeUndefined()
    })

    it('falls back to the nested child when reading updated metadata', () => {
      seedCourse()
      expect(service.getUpdatedMeta('res2')).toEqual(expect.objectContaining({ name: 'Resource two' }))
    })

    it('returns an empty object for metadata that does not exist anywhere', () => {
      seedCourse()
      expect(service.getUpdatedMeta('missing')).toEqual({})
    })
  })

  // ---------------------------------------------------- parentUpdatedMeta --

  describe('parentUpdatedMeta', () => {
    it('takes each field from the parent when it has one', () => {
      authInitService.authConfig = { name: { defaultValue: { Course: [{ value: 'fallback' }] } } }
      service.parentContent = 'course1'
      service.setOriginalMeta({ identifier: 'course1', contentType: 'Course', name: 'Real name' } as any)
      expect(service.parentUpdatedMeta().name).toBe('Real name')
    })

    it('falls back to the configured default for a field the parent lacks', () => {
      authInitService.authConfig = { subTitle: { defaultValue: { Course: [{ value: 'Default subtitle' }] } } }
      service.parentContent = 'course1'
      service.setOriginalMeta({ identifier: 'course1', contentType: 'Course' } as any)
      expect(service.parentUpdatedMeta().subTitle).toBe('Default subtitle')
    })
  })

  // ------------------------------------------------------ setOriginalMeta --

  describe('resetOriginalMeta', () => {
    it('stores the merged metadata against the content', () => {
      service.setOriginalMeta({ identifier: 'res1', name: 'Old' } as any)
      service.resetOriginalMeta({ name: 'New' } as any, 'res1')
      expect(service.originalContent.res1.name).toBe('New')
    })

    it('re-seeds from the payload when given nothing to merge', () => {
      service.setOriginalMeta({ identifier: 'res1', name: 'Old' } as any)
      service.resetOriginalMeta({} as any, 'res1')
      expect(service.originalContent.res1).toBeTruthy()
    })
  })

  // ------------------------------------------------- checkUniqueCondition --

  describe('checkUniqueCondition', () => {
    const content = (over: any = {}) => ({ status: 'Draft', reviewStatus: 'Draft', ...over }) as any

    it('passes when every value matches', () => {
      expect(service.checkUniqueCondition(content(), [{ status: ['Draft'] }])).toBe(true)
    })

    it('fails when a value does not match', () => {
      expect(service.checkUniqueCondition(content(), [{ status: ['Live'] }])).toBe(false)
    })

    it('passes any of several alternative conditions', () => {
      expect(service.checkUniqueCondition(content(), [{ status: ['Live'] }, { status: ['Draft'] }])).toBe(true)
    })

    it('allows a Review action only while the content is in review', () => {
      expect(service.checkUniqueCondition(content({ reviewStatus: 'InReview' }), [{ status: ['Live'] }], 'Review')).toBe(true)
    })

    it('blocks a Review action on content that is not in review', () => {
      expect(service.checkUniqueCondition(content({ reviewStatus: 'Reviewed' }), [{ status: ['Draft'] }], 'Review')).toBe(false)
    })

    it('allows a Publish action on reviewed content awaiting publication', () => {
      expect(service.checkUniqueCondition(content({ status: 'Review', reviewStatus: 'Reviewed' }), [{ status: ['Live'] }], 'Publish')).toBe(
        true,
      )
    })

    it('blocks a Publish action on content that is not yet reviewed', () => {
      expect(service.checkUniqueCondition(content({ status: 'Review', reviewStatus: 'InReview' }), [{ status: ['Live'] }], 'Publish')).toBe(
        false,
      )
    })

    it('reports a failure rather than throwing on a malformed condition', () => {
      expect(service.checkUniqueCondition(content(), undefined as any)).toBe(false)
    })
  })
})
