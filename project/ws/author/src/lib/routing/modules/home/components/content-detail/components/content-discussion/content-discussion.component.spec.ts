import { of } from 'rxjs'
import { ContentDiscussionComponent } from './content-discussion.component'

describe('ContentDiscussionComponent', () => {
  let component: ContentDiscussionComponent
  let activatedRoute: any
  let configSvc: any

  const sampleContent: any = {
    description: 'A course about testing',
    identifier: 'do_123',
    name: 'Testing 101',
  }

  const build = () => new ContentDiscussionComponent(activatedRoute, configSvc)

  beforeEach(() => {
    activatedRoute = { parent: null }
    configSvc = { restrictedFeatures: new Set<string>() }
    component = build()
  })

  it('should create with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.showDiscussionForum).toBe(false)
    expect(component.isRestricted).toBe(true)
    expect(component.forPreview).toBe(false)
    expect(component.discussionForumWidget).toBeNull()
  })

  describe('ngOnChanges', () => {
    it('builds the discussion forum widget config from content', () => {
      component.content = sampleContent

      component.ngOnChanges()

      expect(component.forPreview).toBe(false)
      expect(component.discussionForumWidget).toEqual({
        widgetData: {
          description: 'A course about testing',
          id: 'do_123',
          name: 'Learning',
          title: 'Testing 101',
          initialPostCount: 2,
          isDisabled: false,
        },
        widgetSubType: 'discussionForum',
        widgetType: 'discussionForum',
      })
    })

    it('leaves the widget null when there is no content', () => {
      component.content = undefined as any

      component.ngOnChanges()

      expect(component.discussionForumWidget).toBeNull()
    })
  })

  describe('ngOnInit', () => {
    it('marks restricted when disscussionForum feature is restricted', () => {
      configSvc.restrictedFeatures = new Set(['disscussionForum'])
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(true)
    })

    it('marks restricted when disscussionForumTRPU feature is restricted', () => {
      configSvc.restrictedFeatures = new Set(['disscussionForumTRPU'])
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(true)
    })

    it('clears restriction when the feature is not restricted', () => {
      configSvc.restrictedFeatures = new Set(['somethingElse'])
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(false)
    })

    it('does not touch restriction when restrictedFeatures is absent', () => {
      configSvc.restrictedFeatures = undefined
      const c = build()

      c.ngOnInit()

      expect(c.isRestricted).toBe(true)
    })

    it('reads content from the parent route data and rebuilds the widget', () => {
      activatedRoute.parent = {
        data: of({ content: { data: sampleContent } }),
      }
      const c = build()

      c.ngOnInit()

      expect(c.content).toEqual(sampleContent)
      expect(c.discussionForumWidget).not.toBeNull()
      expect(c.discussionForumWidget!.widgetData.id).toBe('do_123')
    })

    it('ignores parent route data without content', () => {
      activatedRoute.parent = { data: of({}) }
      const c = build()

      c.ngOnInit()

      expect(c.discussionForumWidget).toBeNull()
    })

    it('does nothing when the parent route has no data', () => {
      activatedRoute.parent = { data: null }
      const c = build()

      expect(() => c.ngOnInit()).not.toThrow()
      expect(c.discussionForumWidget).toBeNull()
    })
  })
})
