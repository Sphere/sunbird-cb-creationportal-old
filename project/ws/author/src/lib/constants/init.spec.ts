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

/**
 * AUTH_INIT drives which authoring form fields are shown, mandatory and disabled per
 * content type. It used to be a 4,649-line table of hand-copied blocks; it is now built
 * from helpers. These tests pin the properties that made that rewrite safe, so a future
 * edit to the helpers cannot quietly change form behaviour.
 */
describe('AUTH_INIT', () => {
  const CONTENT_TYPES = ['Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel']
  const RULE_KEYS = ['mandatoryFor', 'notMandatoryFor', 'showFor', 'notDisabledFor', 'disabledFor', 'notShowFor']

  const form = AUTH_INIT.form as any
  const fieldNames = Object.keys(form)

  it('exposes the three configuration sections', () => {
    expect(Object.keys(AUTH_INIT)).toEqual(['contentTypes', 'roles', 'form'])
    expect(AUTH_INIT.contentTypes).toHaveLength(12)
    expect(Object.keys(AUTH_INIT.roles as any)).toHaveLength(5)
    expect(fieldNames).toHaveLength(83)
  })

  it('gives every form field the full set of rule maps in canonical order', () => {
    fieldNames.forEach(name => {
      expect(Object.keys(form[name]).slice(0, RULE_KEYS.length)).toEqual(RULE_KEYS)
    })
  })

  it('keys every defaultValue entry to its own content type', () => {
    const mismatched: string[] = []

    fieldNames.forEach(name => {
      const dv = form[name].defaultValue || {}
      Object.keys(dv).forEach(contentType => {
        const rules = dv[contentType]
        if (!Array.isArray(rules)) {
          return
        }
        rules.forEach((rule: any) => {
          const condition = rule?.condition?.contentType
          if (condition && !condition.includes(contentType)) {
            mismatched.push(`${name}.${contentType} -> ${JSON.stringify(condition)}`)
          }
        })
      })
    })

    expect(mismatched).toEqual([])
  })

  /**
   * Two entries had been corrupted by what looks like a stray find/replace: `size` held
   * the content type 'dge Board' instead of 'Knowledge Board', and `isInIntranet` spelled
   * the condition key 'ontentType'. Both meant the rule could never match, so those
   * content types silently had no default. This guards the whole table against the same
   * class of damage rather than just the two known cases.
   */
  it('spells every condition key and content type correctly', () => {
    const damaged: string[] = []

    fieldNames.forEach(name => {
      const dv = form[name].defaultValue || {}
      Object.keys(dv).forEach(contentType => {
        const rules = dv[contentType]
        if (!Array.isArray(rules)) {
          return
        }
        rules.forEach((rule: any) => {
          const condition = rule?.condition
          if (!condition) {
            return
          }
          Object.keys(condition).forEach(key => {
            if (key === 'contentType') {
              const declared: string[] = condition[key] || []
              declared.forEach(value => {
                if (!CONTENT_TYPES.includes(value)) {
                  damaged.push(`${name}.${contentType}: unknown content type ${value}`)
                }
              })
            } else if (key.endsWith('ontentType')) {
              damaged.push(`${name}.${contentType}: misspelled key '${key}'`)
            }
          })
        })
      })
    })

    expect(damaged).toEqual([])
  })

  /**
   * The hand-written table repeated `value: [] as any` once per content type, so each
   * got a distinct array. The helpers must not collapse those into one shared instance
   * or a mutation against one content type would leak into every other.
   */
  it('never shares a mutable default between content types', () => {
    const shared: string[] = []

    fieldNames.forEach(name => {
      const dv = form[name].defaultValue || {}
      const seen: unknown[] = []
      CONTENT_TYPES.forEach(contentType => {
        const value = dv[contentType]?.[0]?.value
        if (value === null || typeof value !== 'object') {
          return
        }
        if (seen.some(other => other === value)) {
          shared.push(`${name}.${contentType}`)
        }
        seen.push(value)
      })
    })

    expect(shared).toEqual([])
  })

  it('does not share rule-map objects between fields', () => {
    const first = form[fieldNames[0]]
    const second = form[fieldNames[1]]

    RULE_KEYS.forEach(key => {
      expect(first[key]).not.toBe(second[key])
    })
  })

  it('mutating one default leaves the others untouched', () => {
    const target = fieldNames.find(n => Array.isArray(form[n].defaultValue?.Course?.[0]?.value))

    expect(target).toBeDefined()
    const dv = form[target as string].defaultValue
    dv.Course[0].value.push('mutated')

    expect(dv.Resource[0].value).toEqual([])
    dv.Course[0].value.pop()
  })

  /** expiryDate must stay relative to load time rather than a value frozen at build. */
  describe('expiryDate', () => {
    const dv = (form as any).expiryDate.defaultValue

    it('defaults to roughly six months out for every content type but Channel', () => {
      const now = new Date()

      CONTENT_TYPES.filter(c => c !== 'Channel').forEach(contentType => {
        const value = dv[contentType][0].value

        expect(value).toBeInstanceOf(Date)
        const months = (value.getFullYear() - now.getFullYear()) * 12 + (value.getMonth() - now.getMonth())
        expect(months).toBe(6)
      })
    })

    it('leaves Channel with an empty default, as the original table did', () => {
      expect(dv.Channel[0].value).toBe('')
    })
  })

  it('reuses shared flow definitions across content types without aliasing content entries', () => {
    const entries = AUTH_INIT.contentTypes as any[]
    const names = entries.map(c => c.name)

    expect(new Set(names).size).toBe(names.length)
    entries.forEach(entry => {
      expect(entry.flow).toBeDefined()
    })
  })
})
