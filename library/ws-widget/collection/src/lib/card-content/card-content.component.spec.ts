import { Subject } from 'rxjs'
import { CardContentComponent } from './card-content.component'
import { NsContent } from '../_services/widget-content.model'

describe('CardContentComponent', () => {
  let component: CardContentComponent
  let events: any
  let configSvc: any
  let utilitySvc: any
  let snackBar: any
  let prefChange$: Subject<void>

  const content = (over: any = {}) => ({
    identifier: 'do_1',
    name: 'A course',
    contentType: NsContent.EContentTypes.RESOURCE,
    mimeType: NsContent.EMimeTypes.PDF,
    resourceType: 'Reading',
    ...over,
  })

  const build = (widgetData: any = {}) => {
    const c = new CardContentComponent(events, configSvc, utilitySvc, snackBar)
    c.widgetData = { content: content(), ...widgetData } as any
    return c
  }

  /** A yyyyMMddTHHmmss stamp the component's date parser understands. */
  const stamp = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    const p = (n: number, w = 2) => String(n).padStart(w, '0')
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(
      d.getUTCHours(),
    )}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  }

  beforeEach(() => {
    prefChange$ = new Subject<void>()
    events = { raiseInteractTelemetry: jest.fn() }
    configSvc = {
      isIntranetAllowed: false,
      prefChangeNotifier: prefChange$,
      rootOrg: 'org1',
      instanceConfig: {
        logos: { defaultContent: 'default.png', defaultSourceLogo: 'source.png' },
        sources: [{ name: 'src' }],
      },
    }
    utilitySvc = { isMobile: false }
    snackBar = { open: jest.fn() }

    component = build()
  })

  it('should be created with a unique host id', () => {
    expect(component).toBeTruthy()
    expect(component.id).toMatch(/^ws-card_/)
    expect(component.isCardFlipped).toBe(false)
    expect(component.showFlip).toBe(false)
  })

  describe('ngOnInit', () => {
    it('takes the instance logos', () => {
      component.ngOnInit()

      expect(component.defaultThumbnail).toBe('default.png')
      expect(component.defaultSLogo).toBe('source.png')
      expect(component.sourceLogos).toEqual([{ name: 'src' }])
    })

    it('leaves the logos unset without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.defaultThumbnail).toBe('')
      expect(c.sourceLogos).toBeUndefined()
    })

    it('builds the playlist button config from the content', () => {
      component.ngOnInit()

      expect(component.btnPlaylistConfig).toEqual({
        contentId: 'do_1',
        contentName: 'A course',
        contentType: NsContent.EContentTypes.RESOURCE,
        mode: 'dialog',
      })
    })

    it('tracks the intranet preference', () => {
      component.ngOnInit()
      expect(component.isIntranetAllowedSettings).toBe(false)

      configSvc.isIntranetAllowed = true
      prefChange$.next()

      expect(component.isIntranetAllowedSettings).toBe(true)
    })

    it('offers the flip side when the card carries a reason', () => {
      const c = build({ content: content({ reason: 'Recommended for you' }) })

      c.ngOnInit()

      expect(c.showFlip).toBe(true)
    })

    it('marks recently added content in a learning mode', () => {
      const c = build({ content: content({ mode: 'assigned', addedOn: stamp(2) }) })

      c.ngOnInit()

      expect(c.showIsMode).toBe(true)
    })

    it('does not mark older content in a learning mode', () => {
      const c = build({ content: content({ mode: 'assigned', addedOn: stamp(30) }) })

      c.ngOnInit()

      expect(c.showIsMode).toBe(false)
    })

    it('leaves the mode badge off when there is no mode', () => {
      component.ngOnInit()

      expect(component.showIsMode).toBe(false)
    })
  })

  describe('content rating', () => {
    it('defaults a missing rating to zero', () => {
      component.ngOnInit()

      expect(component.widgetData.content.averageRating).toBe(0)
    })

    it('keeps a plain numeric rating', () => {
      const c = build({ content: content({ averageRating: 4.5 }) })

      c.ngOnInit()

      expect(c.widgetData.content.averageRating).toBe(4.5)
    })

    it('picks the rating for the current org out of a per-org map', () => {
      const c = build({ content: content({ averageRating: { org1: 3.2, org2: 4.8 } }) })

      c.ngOnInit()

      expect(c.widgetData.content.averageRating).toBe(3.2)
    })

    it('falls back to zero when the org has no rating', () => {
      configSvc.rootOrg = null
      const c = build({ content: content({ averageRating: { org1: 3.2 } }) })

      c.ngOnInit()

      expect(c.widgetData.content.averageRating).toBe(0)
    })
  })

  describe('content tags', () => {
    const withTags = (contentTags: any, over: any = {}) => build({ content: content(over), contentTags })

    it('shows no tag when the widget has none configured', () => {
      component.ngOnInit()

      expect(component.showContentTag).toBe(false)
    })

    it('shows a tag when every criterion passes', () => {
      const c = withTags({ criteriaField: 'addedOn', daysSpan: 7 }, { addedOn: stamp(1) })

      c.ngOnInit()

      expect(c.showContentTag).toBe(true)
    })

    it('hides the tag for content outside the day span', () => {
      const c = withTags({ criteriaField: 'addedOn', daysSpan: 7 }, { addedOn: stamp(30) })

      c.ngOnInit()

      expect(c.showContentTag).toBe(false)
    })

    it('hides the tag for an excluded content type', () => {
      const c = withTags({ excludeContentType: [NsContent.EContentTypes.RESOURCE] })

      c.ngOnInit()

      expect(c.showContentTag).toBe(false)
    })

    it('hides the tag for an excluded mime type', () => {
      const c = withTags({ excludeMimeType: [NsContent.EMimeTypes.PDF] })

      c.ngOnInit()

      expect(c.showContentTag).toBe(false)
    })

    it('shows the tag when the exclusion lists do not match', () => {
      const c = withTags({
        excludeContentType: [NsContent.EContentTypes.COURSE],
        excludeMimeType: [NsContent.EMimeTypes.MP4],
      })

      c.ngOnInit()

      expect(c.showContentTag).toBe(true)
    })

    it('shows the tag when the exclusion lists are empty', () => {
      const c = withTags({ excludeContentType: [], excludeMimeType: [] })

      c.ngOnInit()

      expect(c.showContentTag).toBe(true)
    })
  })

  describe('checkDisplayName', () => {
    it('uses the first creator detail', () => {
      const c = build({ content: content({ creatorDetails: [{ name: 'Ada' }] }) })

      expect(c.checkDisplayName).toBe('Ada')
    })

    it.each([[''], ['null null'], [undefined]])('hides a creator detail name of %p', name => {
      const c = build({ content: content({ creatorDetails: [{ name }] }) })

      expect(c.checkDisplayName).toBe('Not Disclosed')
    })

    it('falls back to the creator contacts', () => {
      const c = build({ content: content({ creatorContacts: [{ name: 'Grace' }] }) })

      expect(c.checkDisplayName).toBe('Grace')
    })

    it('hides an undisclosed creator contact name', () => {
      const c = build({ content: content({ creatorContacts: [{ name: 'null null' }] }) })

      expect(c.checkDisplayName).toBe('Not Disclosed')
    })

    it('shows nothing when there is no creator at all', () => {
      expect(component.checkDisplayName).toBe('')
    })
  })

  describe('imageIcon', () => {
    it('labels a knowledge artifact', () => {
      const c = build({
        content: content({ contentType: NsContent.EContentTypes.KNOWLEDGE_ARTIFACT }),
      })

      expect(c.imageIcon).toEqual(['class', 'Knowledge Artifact'])
    })

    it('labels anything that is not a resource as a course', () => {
      const c = build({ content: content({ contentType: NsContent.EContentTypes.COURSE }) })

      expect(c.imageIcon).toEqual(['folder', 'Course'])
    })

    it.each([
      [NsContent.EMimeTypes.HTML, 'library_add'],
      [NsContent.EMimeTypes.MP3, 'library_music'],
      [NsContent.EMimeTypes.MP4, 'library_music'],
      [NsContent.EMimeTypes.M4A, 'library_music'],
      [NsContent.EMimeTypes.M3U8, 'library_music'],
      [NsContent.EMimeTypes.PLAYLIST, 'library_music'],
      [NsContent.EMimeTypes.YOUTUBE, 'library_music'],
      [NsContent.EMimeTypes.PDF, 'picture_as_pdf'],
      [NsContent.EMimeTypes.QUIZ, 'assignment_ind'],
      [NsContent.EMimeTypes.HANDS_ON, 'assignment_ind'],
      [NsContent.EMimeTypes.RDBMS_HANDS_ON, 'assignment_ind'],
      [NsContent.EMimeTypes.IAP, 'assignment_ind'],
      [NsContent.EMimeTypes.CERTIFICATION, 'assignment_ind'],
    ])('picks the %s icon', (mimeType, icon) => {
      const c = build({ content: content({ mimeType }) })

      expect(c.imageIcon).toEqual([icon, 'Reading'])
    })

    it('falls back to a generic icon for an unknown mime type', () => {
      const c = build({ content: content({ mimeType: 'application/zip' }) })

      expect(c.imageIcon).toEqual(['description', 'Reading'])
    })
  })

  describe('isKnowledgeBoard', () => {
    it('recognises a knowledge board', () => {
      const c = build({
        content: content({ contentType: NsContent.EContentTypes.KNOWLEDGE_BOARD }),
      })

      expect(c.isKnowledgeBoard).toBe(true)
    })

    it('rejects any other content type', () => {
      expect(component.isKnowledgeBoard).toBe(false)
    })
  })

  describe('isGreyedImage', () => {
    it.each(['Deleted', 'Expired'])('greys out %s content', status => {
      const c = build({ content: content({ status }) })

      expect(c.isGreyedImage).toBe(true)
    })

    it('leaves live content in colour', () => {
      const c = build({ content: content({ status: 'Live' }) })

      expect(c.isGreyedImage).toBe(false)
    })
  })

  describe('isLiveOrMarkForDeletion', () => {
    it.each(['Live', 'MarkedForDeletion', undefined])('accepts %s content', status => {
      const c = build({ content: content({ status }) })

      expect(c.isLiveOrMarkForDeletion).toBe(true)
    })

    it('rejects deleted content', () => {
      const c = build({ content: content({ status: 'Deleted' }) })

      expect(c.isLiveOrMarkForDeletion).toBe(false)
    })
  })

  describe('showIntranetContent', () => {
    it('hides intranet content on mobile when intranet is not allowed', () => {
      utilitySvc.isMobile = true
      const c = build({ content: content({ isInIntranet: true }) })
      c.ngOnInit()

      expect(c.showIntranetContent).toBe(true)
    })

    it('shows intranet content once the preference allows it', () => {
      utilitySvc.isMobile = true
      configSvc.isIntranetAllowed = true
      const c = build({ content: content({ isInIntranet: true }) })
      c.ngOnInit()

      expect(c.showIntranetContent).toBe(false)
    })

    it('does not apply on desktop', () => {
      const c = build({ content: content({ isInIntranet: true }) })
      c.ngOnInit()

      expect(c.showIntranetContent).toBe(false)
    })

    it('does not apply to content outside the intranet', () => {
      utilitySvc.isMobile = true
      component.ngOnInit()

      expect(component.showIntranetContent).toBe(false)
    })
  })

  describe('showSnackbar', () => {
    it('explains that intranet content is unavailable', () => {
      utilitySvc.isMobile = true
      const c = build({ content: content({ isInIntranet: true }) })
      c.ngOnInit()

      c.showSnackbar()

      expect(snackBar.open).toHaveBeenCalledWith('Content is only available in intranet', 'X', expect.anything())
    })

    it('explains that expired content is unavailable', () => {
      const c = build({ content: content({ status: 'Deleted' }) })

      c.showSnackbar()

      expect(snackBar.open).toHaveBeenCalledWith('Content may be expired or deleted', 'X', expect.anything())
    })

    it('stays quiet for available content', () => {
      component.showSnackbar()

      expect(snackBar.open).not.toHaveBeenCalled()
    })
  })

  describe('convertToISODate', () => {
    it('parses the platform timestamp format', () => {
      const date = component.convertToISODate('20260701T120000')

      expect(date.toISOString()).toBe('2026-07-01T12:00:00.000Z')
    })

    it('returns an invalid date for a malformed stamp rather than throwing', () => {
      expect(() => component.convertToISODate('nonsense')).not.toThrow()
    })

    it('handles a missing stamp', () => {
      expect(() => component.convertToISODate()).not.toThrow()
    })
  })

  describe('isLatest', () => {
    it('accepts a date inside the last week', () => {
      expect(component.isLatest(new Date(Date.now() - 24 * 60 * 60 * 1000))).toBe(true)
    })

    it('rejects a date older than a week', () => {
      expect(component.isLatest(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))).toBe(false)
    })

    it('rejects a missing date', () => {
      expect(component.isLatest(null as any)).toBe(false)
    })
  })

  describe('raiseTelemetry', () => {
    it('reports the card click with its content context', () => {
      const c = build({ content: content(), context: { pageId: 'home' } })
      c.widgetType = 'card'
      c.widgetSubType = 'cardContent'

      c.raiseTelemetry()

      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('click', 'card-cardContent', {
        contentId: 'do_1',
        contentType: NsContent.EContentTypes.RESOURCE,
        context: { pageId: 'home' },
      })
    })
  })

  describe('lifecycle extras', () => {
    it('stops listening to preference changes on destroy', () => {
      component.ngOnInit()
      component.ngOnDestroy()

      configSvc.isIntranetAllowed = true
      prefChange$.next()

      expect(component.isIntranetAllowedSettings).toBe(false)
    })

    it('is safe to destroy before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('has nothing to do after view init', () => {
      expect(() => component.ngAfterViewInit()).not.toThrow()
    })

    it('exposes an inert comment hook', () => {
      expect(() => component.openComment()).not.toThrow()
    })
  })
})
