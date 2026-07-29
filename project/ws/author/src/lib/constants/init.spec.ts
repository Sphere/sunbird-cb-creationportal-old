import { AUTH_INIT } from './init'

describe('AUTH_INIT constant', () => {
  it('should be a defined object', () => {
    expect(AUTH_INIT).toBeDefined()
    expect(typeof AUTH_INIT).toBe('object')
  })

  it('should expose the top-level sections', () => {
    expect(AUTH_INIT).toHaveProperty('contentTypes')
    expect(AUTH_INIT).toHaveProperty('roles')
    expect(AUTH_INIT).toHaveProperty('form')
  })

  describe('contentTypes', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(AUTH_INIT.contentTypes)).toBe(true)
      expect(AUTH_INIT.contentTypes.length).toBeGreaterThan(0)
    })

    it('every content type should carry the expected metadata shape', () => {
      AUTH_INIT.contentTypes.forEach((ct: any) => {
        expect(typeof ct.name).toBe('string')
        expect(typeof ct.displayName).toBe('string')
        expect(typeof ct.icon).toBe('string')
        expect(typeof ct.hasEnabled).toBe('boolean')
        expect(typeof ct.canShow).toBe('boolean')
        expect(Array.isArray(ct.allowedRoles)).toBe(true)
      })
    })

    it('should contain the representative resource content type with its children flow', () => {
      const resource: any = AUTH_INIT.contentTypes.find((c: any) => c.name === 'resource')
      expect(resource).toBeDefined()
      expect(resource.displayName).toBe('Resource')
      expect(resource.children).toEqual(expect.arrayContaining(['url', 'pdf', 'video', 'audio', 'assessment', 'quiz']))
      expect(resource.flow.internalFlow.common).toEqual(['Draft', 'InReview', 'Reviewed', 'Live'])
    })

    it('should contain the pdf content type with the correct mimeType', () => {
      const pdf: any = AUTH_INIT.contentTypes.find((c: any) => c.name === 'pdf')
      expect(pdf).toBeDefined()
      expect(pdf.mimeType).toBe('application/pdf')
      expect(pdf.contentType).toBe('Resource')
    })

    it('should contain the course content type mapping to internal/external children', () => {
      const course: any = AUTH_INIT.contentTypes.find((c: any) => c.name === 'course')
      expect(course).toBeDefined()
      expect(course.contentType).toBe('Course')
      expect(course.children).toEqual(['internalCourse', 'externalCourse'])
    })

    it('should mark external content types with isExternal metadata', () => {
      const url: any = AUTH_INIT.contentTypes.find((c: any) => c.name === 'url')
      expect(url.additionalMeta.isExternal).toBe(true)
      expect(url.additionalMeta.isIframeSupported).toBe('No')
    })
  })

  describe('roles', () => {
    it('should expose the workflow role groups', () => {
      expect(AUTH_INIT.roles).toHaveProperty('author')
      expect(AUTH_INIT.roles).toHaveProperty('review')
      expect(AUTH_INIT.roles).toHaveProperty('publish')
      expect(AUTH_INIT.roles).toHaveProperty('qualityReview')
      expect(AUTH_INIT.roles).toHaveProperty('view')
    })

    it('should gate the reviewer on the InReview status', () => {
      const reviewer: any = (AUTH_INIT.roles as any).review.reviewer
      expect(reviewer.condition.status).toEqual(['InReview'])
      expect(reviewer.fields).toEqual(['trackContacts'])
    })

    it('should gate the publisher on the Reviewed status', () => {
      const publisher: any = (AUTH_INIT.roles as any).publish.publisher
      expect(publisher.condition.status).toEqual(['Reviewed'])
    })
  })

  describe('form', () => {
    it('should be an object of field metadata', () => {
      expect(typeof AUTH_INIT.form).toBe('object')
      expect(Object.keys(AUTH_INIT.form as any).length).toBeGreaterThan(0)
    })

    it('every field should declare a type and defaultValue', () => {
      Object.entries(AUTH_INIT.form as any).forEach(([_key, meta]: [string, any]) => {
        expect(meta).toHaveProperty('type')
        expect(meta).toHaveProperty('defaultValue')
      })
    })

    it('should describe representative fields with the correct declared type', () => {
      expect((AUTH_INIT.form as any).description.type).toBe('string')
      expect((AUTH_INIT.form as any).duration.type).toBe('number')
      expect((AUTH_INIT.form as any).audience.type).toBe('array')
      expect((AUTH_INIT.form as any).transcoding.type).toBe('object')
    })

    it('should default visibility to Private for every content type', () => {
      const visibility: any = (AUTH_INIT.form as any).visibility.defaultValue
      expect(visibility.Course[0].value).toBe('Private')
      expect(visibility.Resource[0].value).toBe('Private')
      expect(visibility.Channel[0].value).toBe('Private')
    })

    it('should default numeric duration to zero', () => {
      const duration: any = (AUTH_INIT.form as any).duration.defaultValue
      expect(duration.Course[0].value).toBe(0)
      expect(duration.Resource[0].value).toBe(0)
    })
  })
})
