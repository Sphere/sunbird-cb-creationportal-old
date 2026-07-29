import { NsContent } from '@ws-widget/collection'
import { AppTocContentCardComponent } from './app-toc-content-card.component'

describe('AppTocContentCardComponent', () => {
  let component: AppTocContentCardComponent
  let configSvc: any
  let resourceDownloadSvc: any

  const child = (over: any = {}) => ({
    identifier: 'do_child',
    contentType: NsContent.EContentTypes.RESOURCE,
    mimeType: NsContent.EMimeTypes.PDF,
    ...over,
  })

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'A module',
      contentType: NsContent.EContentTypes.MODULE,
      mimeType: NsContent.EMimeTypes.COLLECTION,
      createdBy: 'user-1',
      ...over,
    }) as any

  const build = (over: any = {}) => {
    const c = new AppTocContentCardComponent(configSvc, resourceDownloadSvc)
    c.content = content(over)
    c.rootId = 'do_root'
    c.rootContentType = 'Course'
    return c
  }

  beforeEach(() => {
    configSvc = {
      userProfile: { userId: 'user-1' },
      userRoles: new Set<string>(),
      instanceConfig: { logos: { defaultContent: 'default.png' } },
    }
    resourceDownloadSvc = { downloadResource: jest.fn().mockResolvedValue(undefined) }

    component = build()
  })

  it('should be created with an empty content structure', () => {
    expect(component).toBeTruthy()
    expect(component.hasContentStructure).toBe(false)
    expect(component.viewChildren).toBe(false)
    expect(Object.values(component.contentStructure).every(v => v === 0)).toBe(true)
  })

  describe('ngOnInit', () => {
    it('takes the default thumbnail from the instance config', () => {
      component.ngOnInit()

      expect(component.defaultThumbnail).toBe('default.png')
    })

    it('leaves the thumbnail unset without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.defaultThumbnail).toBe('')
    })
  })

  describe('ngOnChanges', () => {
    it('expands the children when the parent asks it to', () => {
      component.expandAll = true

      component.ngOnChanges({ expandAll: {} as any })

      expect(component.viewChildren).toBe(true)
    })

    it('ignores changes to any other input', () => {
      component.expandAll = true

      component.ngOnChanges({ rootId: {} as any })

      expect(component.viewChildren).toBe(false)
    })
  })

  describe('isCourseCreator', () => {
    it('recognises the author of the content', () => {
      expect(component.isCourseCreator).toBe(true)
    })

    it('does not treat another user as the author', () => {
      configSvc.userProfile = { userId: 'user-2' }

      expect(component.isCourseCreator).toBe(false)
    })

    it('is false when nobody is signed in', () => {
      configSvc.userProfile = null

      expect(component.isCourseCreator).toBe(false)
    })

    it('is false when there is no content', () => {
      component.content = null

      expect(component.isCourseCreator).toBe(false)
    })
  })

  describe('isExternalLiveReviewer', () => {
    it('recognises the external live reviewer role', () => {
      configSvc.userRoles = new Set(['external_content_reviewer_live'])

      expect(component.isExternalLiveReviewer).toBe(true)
    })

    it('is false for any other role', () => {
      configSvc.userRoles = new Set(['content_reviewer'])

      expect(component.isExternalLiveReviewer).toBe(false)
    })

    it('is false when the user has no roles at all', () => {
      configSvc.userRoles = null

      expect(component.isExternalLiveReviewer).toBe(false)
    })
  })

  describe('downloadResource', () => {
    it('downloads a resource that has an artifact', async () => {
      const c = build({ artifactUrl: 'a.pdf' })

      await c.downloadResource()

      expect(resourceDownloadSvc.downloadResource).toHaveBeenCalledWith(c.content)
    })

    it('downloads a resource that only carries a download url', async () => {
      const c = build({ downloadUrl: 'a.zip' })

      await c.downloadResource()

      expect(resourceDownloadSvc.downloadResource).toHaveBeenCalled()
    })

    it('refuses to download for an external live reviewer', async () => {
      configSvc.userRoles = new Set(['external_content_reviewer_live'])
      const c = build({ artifactUrl: 'a.pdf' })

      await c.downloadResource()

      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
    })

    it('does nothing for content with nothing to download', async () => {
      await component.downloadResource()

      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
    })

    it('does nothing when there is no content', async () => {
      component.content = null

      await component.downloadResource()

      expect(resourceDownloadSvc.downloadResource).not.toHaveBeenCalled()
    })

    it('swallows a failed download so the card keeps working', async () => {
      resourceDownloadSvc.downloadResource.mockRejectedValue(new Error('boom'))
      const c = build({ artifactUrl: 'a.pdf' })

      await expect(c.downloadResource()).resolves.toBeUndefined()
    })
  })

  describe('type predicates', () => {
    it('recognises a collection', () => {
      expect(component.isCollection).toBe(true)
    })

    it('rejects a non-collection', () => {
      expect(build({ mimeType: NsContent.EMimeTypes.PDF }).isCollection).toBe(false)
    })

    it.each(['Resource', 'Knowledge Artifact'])('recognises %s as a resource', contentType => {
      expect(build({ contentType }).isResource).toBe(true)
    })

    it('rejects a module as a resource', () => {
      expect(component.isResource).toBe(false)
    })

    it('reports neither for missing content', () => {
      component.content = null

      expect(component.isCollection).toBe(false)
      expect(component.isResource).toBe(false)
    })
  })

  describe('resourceLink', () => {
    it('builds a viewer route for the content', () => {
      const link = component.resourceLink

      expect(link.url).toContain('do_1')
      expect(link.queryParams).toBeTruthy()
    })

    it('returns an empty link for missing content', () => {
      component.content = null

      expect(component.resourceLink).toEqual({ url: '', queryParams: {} })
    })
  })

  describe('content structure', () => {
    const withChildren = (children: any[]) => {
      const c = build({ children })
      c.ngOnInit()
      return c
    }

    it('stays empty for a leaf', () => {
      component.ngOnInit()

      expect(component.hasContentStructure).toBe(false)
    })

    it('stays empty for an empty child list', () => {
      const c = withChildren([])

      expect(c.hasContentStructure).toBe(false)
    })

    it.each([
      [NsContent.EContentTypes.COURSE, 'course'],
      [NsContent.EContentTypes.KNOWLEDGE_ARTIFACT, 'other'],
      [NsContent.EContentTypes.MODULE, 'learningModule'],
    ])('counts a %s child under %s', (contentType, bucket) => {
      const c = withChildren([child({ contentType })])

      expect(c.contentStructure[bucket]).toBe(1)
      expect(c.hasContentStructure).toBe(true)
    })

    it.each([
      [NsContent.EMimeTypes.HANDS_ON, 'handsOn'],
      [NsContent.EMimeTypes.MP3, 'podcast'],
      [NsContent.EMimeTypes.MP4, 'video'],
      [NsContent.EMimeTypes.M3U8, 'video'],
      [NsContent.EMimeTypes.INTERACTION, 'interactiveVideo'],
      [NsContent.EMimeTypes.PDF, 'pdf'],
      [NsContent.EMimeTypes.HTML, 'webPage'],
      [NsContent.EMimeTypes.WEB_MODULE, 'webModule'],
      [NsContent.EMimeTypes.YOUTUBE, 'youtube'],
    ])('counts a %s resource under %s', (mimeType, bucket) => {
      const c = withChildren([child({ mimeType })])

      expect(c.contentStructure[bucket]).toBe(1)
    })

    it('separates an assessment from a plain quiz', () => {
      const c = withChildren([
        child({ mimeType: NsContent.EMimeTypes.QUIZ, resourceType: 'Assessment' }),
        child({ mimeType: NsContent.EMimeTypes.QUIZ, resourceType: 'Quiz' }),
      ])

      expect(c.contentStructure.assessment).toBe(1)
      expect(c.contentStructure.quiz).toBe(1)
    })

    it('buckets an unrecognised resource type as other', () => {
      const c = withChildren([child({ mimeType: 'application/zip' })])

      expect(c.contentStructure.other).toBe(1)
    })

    it('ignores a child of an unrecognised content type', () => {
      const c = withChildren([child({ contentType: 'Channel' })])

      expect(c.hasContentStructure).toBe(false)
    })

    it('adds up several children of the same kind', () => {
      const c = withChildren([child(), child(), child({ mimeType: NsContent.EMimeTypes.MP4 })])

      expect(c.contentStructure.pdf).toBe(2)
      expect(c.contentStructure.video).toBe(1)
    })
  })

  describe('contextPath', () => {
    it('exposes the root the card was opened from', () => {
      expect(component.contextPath).toEqual({
        contextId: 'do_root',
        contextPath: 'Course',
      })
    })
  })

  describe('contentTrackBy', () => {
    it('tracks children by identifier', () => {
      expect(component.contentTrackBy(0, child() as any)).toBe('do_child')
    })

    it('tracks a missing child as null', () => {
      expect(component.contentTrackBy(0, null as any)).toBeNull()
    })
  })
})
