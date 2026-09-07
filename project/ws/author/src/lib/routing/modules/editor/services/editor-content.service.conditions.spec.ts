import { EditorContentService } from './editor-content.service'

/**
 * Covers the branches the base editor-content.service.spec.ts leaves out:
 * the hierarchy payload builders (getNewNodeModifyData / getNodeModifyData) and
 * the form-config condition engine (checkCondition / isPresent / isValid).
 */
describe('EditorContentService (node-modify + conditions)', () => {
  let service: EditorContentService
  let accessService: any
  let editorService: any
  let authInitService: any

  const buildService = () => {
    service = new EditorContentService(accessService, editorService, authInitService)
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    accessService = { hasAccess: jest.fn().mockReturnValue(true) }
    editorService = { createAndReadContent: jest.fn() }
    authInitService = { authConfig: {} }
    buildService()
  })

  afterEach(() => jest.restoreAllMocks())

  describe('getNewNodeModifyData', () => {
    it('returns an empty payload when the parent has no stored meta', () => {
      service.parentContent = 'missing'
      expect(service.getNewNodeModifyData()).toEqual({})
    })

    it('marks the course as the root node', () => {
      service.setOriginalMeta({ identifier: 'course1', children: [] } as any)
      service.parentContent = 'course1'

      const payload = service.getNewNodeModifyData()

      expect(payload.course1).toEqual({ isNew: false, root: true, objectType: 'Content', contentType: 'Course' })
    })

    it('includes every Collection and CourseUnit child as a non-root node', () => {
      service.setOriginalMeta({
        identifier: 'course1',
        children: [
          { identifier: 'mod1', contentType: 'CourseUnit' },
          { identifier: 'col1', contentType: 'Collection' },
          { identifier: 'res1', contentType: 'Resource' },
        ],
      } as any)
      service.parentContent = 'course1'

      const payload = service.getNewNodeModifyData()

      expect(payload.mod1).toEqual({ isNew: false, root: false })
      expect(payload.col1).toEqual({ isNew: false, root: false })
      expect(payload.res1).toBeUndefined()
    })

    it('walks modules that carry their own children', () => {
      service.setOriginalMeta({
        identifier: 'course1',
        children: [
          { identifier: 'mod1', contentType: 'CourseUnit', children: [{ identifier: 'res1', contentType: 'Resource' }] },
          { identifier: 'mod2', contentType: 'CourseUnit' },
        ],
      } as any)
      service.parentContent = 'course1'

      const payload = service.getNewNodeModifyData()

      expect(payload.mod1).toBeTruthy()
      expect(payload.mod2).toBeTruthy()
    })
  })

  describe('getNodeModifyData', () => {
    it('returns an empty payload when the parent has no stored meta', () => {
      service.parentContent = 'missing'
      service.currentContentID = 'x'
      expect(service.getNodeModifyData()).toEqual({})
    })

    it('attaches the edited metadata to the matching module only', () => {
      service.setOriginalMeta({
        identifier: 'course1',
        children: [
          { identifier: 'mod1', contentType: 'CourseUnit' },
          { identifier: 'mod2', contentType: 'CourseUnit' },
        ],
      } as any)
      service.parentContent = 'course1'
      service.currentContentID = 'mod1'
      service.currentContentData = { name: 'Edited', status: 'Draft', versionKey: 'vk' } as any

      const payload = service.getNodeModifyData()

      expect(payload.course1.root).toBe(true)
      expect(payload.mod1.metadata).toEqual({ name: 'Edited' })
      expect(payload.mod2).toBeUndefined()
    })

    it('strips the server-managed fields from the metadata', () => {
      service.setOriginalMeta({ identifier: 'course1', children: [{ identifier: 'mod1', contentType: 'Collection' }] } as any)
      service.parentContent = 'course1'
      service.currentContentID = 'mod1'
      service.currentContentData = {
        name: 'Keep',
        status: 'Live',
        isIframeSupported: 'Yes',
        category: 'c',
        versionKey: 'vk',
        resourceType: 'r',
      } as any

      expect(service.getNodeModifyData().mod1.metadata).toEqual({ name: 'Keep' })
    })

    it('stringifies a numeric duration', () => {
      service.setOriginalMeta({ identifier: 'course1', children: [{ identifier: 'mod1', contentType: 'CourseUnit' }] } as any)
      service.parentContent = 'course1'
      service.currentContentID = 'mod1'
      service.currentContentData = { duration: 120 } as any

      expect(service.getNodeModifyData().mod1.metadata.duration).toBe('120')
    })

    it('stringifies a zero duration', () => {
      service.setOriginalMeta({ identifier: 'course1', children: [{ identifier: 'mod1', contentType: 'CourseUnit' }] } as any)
      service.parentContent = 'course1'
      service.currentContentID = 'mod1'
      service.currentContentData = { duration: 0 } as any

      expect(service.getNodeModifyData().mod1.metadata.duration).toBe('0')
    })

    it('leaves an already-string duration alone', () => {
      service.setOriginalMeta({ identifier: 'course1', children: [{ identifier: 'mod1', contentType: 'CourseUnit' }] } as any)
      service.parentContent = 'course1'
      service.currentContentID = 'mod1'
      service.currentContentData = { duration: '90' } as any

      expect(service.getNodeModifyData().mod1.metadata.duration).toBe('90')
    })

    it('walks nested module children', () => {
      service.setOriginalMeta({
        identifier: 'course1',
        children: [
          { identifier: 'mod1', contentType: 'CourseUnit', children: [{ identifier: 'r', contentType: 'Resource' }] },
          { identifier: 'mod2', contentType: 'CourseUnit' },
        ],
      } as any)
      service.parentContent = 'course1'
      service.currentContentID = 'mod2'
      service.currentContentData = { name: 'Two' } as any

      expect(service.getNodeModifyData().mod2.metadata).toEqual({ name: 'Two' })
    })
  })

  describe('isPresent', () => {
    const withConfig = (type: string, value: any) => {
      authInitService.authConfig = { field: { type } }
      buildService()
      service.setOriginalMeta({ identifier: 'id1', field: value } as any)
      return service.isPresent('field', 'id1')
    }

    it('treats a non-empty string or array as present', () => {
      expect(withConfig('string', 'abc')).toBe(true)
      expect(withConfig('array', ['a'])).toBe(true)
    })

    it('treats an empty string or array as absent', () => {
      expect(withConfig('string', '')).toBe(false)
      expect(withConfig('array', [])).toBe(false)
    })

    it('treats any truthy object or boolean as present', () => {
      expect(withConfig('object', { a: 1 })).toBe(true)
      expect(withConfig('boolean', true)).toBe(true)
      expect(withConfig('boolean', false)).toBe(false)
    })

    it('treats a positive number as present and zero as absent', () => {
      expect(withConfig('number', 5)).toBe(true)
      expect(withConfig('number', 0)).toBe(false)
    })

    it('is false for an unrecognised config type', () => {
      expect(withConfig('somethingElse', 'x')).toBe(false)
    })
  })

  describe('checkCondition', () => {
    const configure = (config: any, meta: any = { identifier: 'id1', contentType: 'Resource' }) => {
      authInitService.authConfig = config
      buildService()
      service.setOriginalMeta(meta)
    }

    it('is false when the field has no config entry', () => {
      configure({})
      expect(service.checkCondition('id1', 'missing', 'show')).toBe(false)
    })

    it('is false when the content type is not listed', () => {
      configure({ field: { showFor: {}, notShowFor: {} } })
      expect(service.checkCondition('id1', 'field', 'show')).toBe(false)
    })

    it('is true for an unconditional (empty) rule list', () => {
      configure({ field: { showFor: { Resource: [] }, notShowFor: {} } })
      expect(service.checkCondition('id1', 'field', 'show')).toBe(true)
    })

    it('is true when a rule matches the current metadata value', () => {
      configure({ field: { showFor: { Resource: [{ status: ['Draft'] }] }, notShowFor: {} } }, {
        identifier: 'id1',
        contentType: 'Resource',
        status: 'Draft',
      } as any)
      expect(service.checkCondition('id1', 'field', 'show')).toBe(true)
    })

    it('is false when no rule matches', () => {
      configure({ field: { showFor: { Resource: [{ status: ['Live'] }] }, notShowFor: {} } }, {
        identifier: 'id1',
        contentType: 'Resource',
        status: 'Draft',
      } as any)
      expect(service.checkCondition('id1', 'field', 'show')).toBe(false)
    })

    it('is true when a rule requires presence and the field is filled', () => {
      authInitService.authConfig = {
        field: { showFor: { Resource: [{ name: [true] }] }, notShowFor: {} },
        name: { type: 'string' },
      }
      buildService()
      service.setOriginalMeta({ identifier: 'id1', contentType: 'Resource', name: 'filled' } as any)
      expect(service.checkCondition('id1', 'field', 'show')).toBe(true)
    })

    it('an empty counter-rule list vetoes the field', () => {
      configure({ field: { showFor: { Resource: [] }, notShowFor: { Resource: [] } } })
      expect(service.checkCondition('id1', 'field', 'show')).toBe(false)
    })

    it('a matching counter-rule vetoes the field', () => {
      configure({ field: { showFor: { Resource: [] }, notShowFor: { Resource: [{ status: ['Draft'] }] } } }, {
        identifier: 'id1',
        contentType: 'Resource',
        status: 'Draft',
      } as any)
      expect(service.checkCondition('id1', 'field', 'show')).toBe(false)
    })

    it('a non-matching counter-rule leaves the field visible', () => {
      configure({ field: { showFor: { Resource: [] }, notShowFor: { Resource: [{ status: ['Live'] }] } } }, {
        identifier: 'id1',
        contentType: 'Resource',
        status: 'Draft',
      } as any)
      expect(service.checkCondition('id1', 'field', 'show')).toBe(true)
    })

    it('maps the required type onto mandatoryFor / notMandatoryFor', () => {
      configure({ field: { mandatoryFor: { Resource: [] }, notMandatoryFor: {} } })
      expect(service.checkCondition('id1', 'field', 'required')).toBe(true)
    })

    it('maps the disabled type onto disabledFor / notDisabledFor', () => {
      configure({ field: { disabledFor: { Resource: [] }, notDisabledFor: {} } })
      expect(service.checkCondition('id1', 'field', 'disabled')).toBe(true)
    })

    it('swallows a malformed config and reports false', () => {
      configure({ field: { showFor: { Resource: [] } } })
      expect(service.checkCondition('id1', 'field', 'show')).toBe(false)
    })
  })

  describe('isValid', () => {
    it('skips the always-optional fields', () => {
      authInitService.authConfig = {
        competencies: {},
        draftImage: {},
        source: {},
        purpose: {},
        appIcon: {},
        license: {},
      }
      buildService()
      const spy = jest.spyOn(service, 'checkCondition')
      service.setOriginalMeta({ identifier: 'id1', contentType: 'Resource' } as any)

      expect(service.isValid('id1')).toBe(true)
      expect(spy).not.toHaveBeenCalled()
    })

    it('evaluates the remaining configured fields', () => {
      authInitService.authConfig = { name: { type: 'string', mandatoryFor: { Resource: [] }, notMandatoryFor: {} } }
      buildService()
      const spy = jest.spyOn(service, 'checkCondition')
      service.setOriginalMeta({ identifier: 'id1', contentType: 'Resource', name: '' } as any)

      expect(service.isValid('id1')).toBe(true)
      expect(spy).toHaveBeenCalledWith('id1', 'name', 'required')
    })
  })
})
