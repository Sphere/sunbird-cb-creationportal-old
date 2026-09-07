import { Subject, of } from 'rxjs'
import { ContentCardV2Component } from './content-card-v2.component'

describe('ContentCardV2Component', () => {
  let component: ContentCardV2Component
  let accessService: any
  let dialog: any
  let initService: any
  let valueSvc: any
  let isXSmall$: Subject<boolean>
  let afterClosed$: Subject<any>

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'A course',
      status: 'Draft',
      locale: 'hi',
      publisherDetails: [],
      trackContacts: [],
      creatorContacts: [],
      ...over,
    }) as any

  const build = (over: any = {}, perspective: any = 'author') => {
    const c = new ContentCardV2Component(accessService, dialog, initService, valueSvc)
    c.content = content(over)
    c.perspective = perspective
    return c
  }

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    afterClosed$ = new Subject<any>()

    accessService = {
      userId: 'user-1',
      defaultLogo: '/assets/default.png',
      getIcon: jest.fn().mockReturnValue('book'),
      getCategoryType: jest.fn().mockReturnValue('Learning'),
      getCategory: jest.fn().mockReturnValue('Course'),
      hasRole: jest.fn().mockReturnValue(false),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed$ }) }
    initService = {
      ordinals: {
        subTitles: [
          { srclang: 'en', label: 'English' },
          { srclang: 'hi', label: 'Hindi' },
          { srclang: 'ta', label: 'Tamil' },
        ],
      },
      authAdditionalConfig: { allowActionHistory: true },
    }
    valueSvc = { isXSmall$ }

    component = build()
  })

  it('should be created with author defaults', () => {
    expect(component).toBeTruthy()
    expect(component.mainAction).toBe('edit')
    expect(component.timeLinePerspective).toBe('lastUpdated')
    expect(component.isMobile).toBe(false)
    expect(component.showLanguageBar).toBe(false)
  })

  describe('getLocale', () => {
    it('resolves a known locale to its label', () => {
      expect(component.getLocale('ta')).toBe('Tamil')
    })

    it('falls back to English for an unknown locale', () => {
      expect(component.getLocale('zz')).toBe('English')
    })
  })

  describe('ngOnInit', () => {
    it('tracks the mobile breakpoint', () => {
      component.ngOnInit()
      isXSmall$.next(true)

      expect(component.isMobile).toBe(true)
    })

    it('reads the display metadata off the access service', () => {
      component.ngOnInit()

      expect(component.icon).toBe('book')
      expect(component.categoryType).toBe('Learning')
      expect(component.category).toBe('Course')
      expect(component.locale).toBe('Hindi')
    })

    it('collects translations from both directions', () => {
      const c = build({
        hasTranslations: [{ locale: 'en', identifier: 'do_en' }],
        isTranslationOf: [{ locale: 'ta', identifier: 'do_ta' }],
      })

      c.ngOnInit()

      expect(c.translationArray).toEqual([
        { locale: 'English', identifier: 'do_en' },
        { locale: 'Tamil', identifier: 'do_ta' },
      ])
    })

    it('offers only the languages that have no translation yet', () => {
      const c = build({ hasTranslations: [{ locale: 'en', identifier: 'do_en' }] })

      c.ngOnInit()

      expect(c.languages.map(l => l.srclang)).toEqual(['hi', 'ta'])
    })

    it('ignores empty translation lists', () => {
      const c = build({ hasTranslations: [], isTranslationOf: [] })

      c.ngOnInit()

      expect(c.translationArray).toEqual([])
      expect(c.languages.length).toBe(3)
    })

    describe('author and reviewer perspectives', () => {
      it('offers edit, delete and history for a draft', () => {
        const c = build({ status: 'Draft' })
        c.ngOnInit()

        expect(c.mainAction).toBe('edit')
        expect(c.timeLinePerspective).toBe('lastUpdated')
        expect(c.allowedActions).toEqual(['newLanguage', 'delete', 'history'])
      })

      it('adds unpublish for live content', () => {
        const c = build({ status: 'Live' })
        c.ngOnInit()

        expect(c.mainAction).toBe('edit')
        expect(c.timeLinePerspective).toBe('lastPublished')
        expect(c.allowedActions).toContain('unpublish')
      })

      it('offers a move back to draft for unpublished content', () => {
        const c = build({ status: 'Unpublished' })
        c.ngOnInit()

        expect(c.mainAction).toBe('moveToDraft')
        expect(c.timeLinePerspective).toBe('lastUnpublished')
        expect(c.allowedActions).not.toContain('unpublish')
      })

      it.each(['InReview', 'Reviewed', 'QualityReview'])('lets an editor act on %s content', status => {
        accessService.hasRole.mockReturnValue(true)
        const c = build({ status })
        c.ngOnInit()

        expect(c.mainAction).toBe('takeAction')
        expect(c.timeLinePerspective).toBe('lastAction')
        expect(c.allowedActions).toEqual(['newLanguage', 'pullBack', 'history'])
      })

      it('lets a named publisher act on content in review', () => {
        const c = build({ status: 'InReview', publisherDetails: [{ id: 'user-1' }] })
        c.ngOnInit()

        expect(c.mainAction).toBe('takeAction')
        expect(c.allowedActions).toEqual([])
      })

      it('lets a track contact act on content in review', () => {
        const c = build({ status: 'InReview', trackContacts: [{ id: 'user-1' }] })
        c.ngOnInit()

        expect(c.mainAction).toBe('takeAction')
      })

      it('only lets the creator pull content back from review', () => {
        const c = build({ status: 'InReview', creatorContacts: [{ id: 'user-1' }] })
        c.ngOnInit()

        expect(c.mainAction).toBe('pullBack')
        expect(c.allowedActions).toEqual(['newLanguage', 'history'])
      })

      it('leaves an unrelated user without an action on content in review', () => {
        const c = build({ status: 'InReview' })
        c.ngOnInit()

        expect(c.mainAction).toBe('edit')
        expect(c.allowedActions).toEqual([])
      })

      it('offers a restore for deleted content', () => {
        const c = build({ status: 'Deleted' })
        c.ngOnInit()

        expect(c.mainAction).toBe('restore')
        expect(c.timeLinePerspective).toBe('deleted')
      })

      it('leaves an unrecognised status with the defaults', () => {
        const c = build({ status: 'Something' })
        c.ngOnInit()

        expect(c.mainAction).toBe('edit')
        expect(c.allowedActions).toEqual([])
      })

      it('applies the same rules from the reviewer perspective', () => {
        const c = build({ status: 'Live' }, 'reviewer')
        c.ngOnInit()

        expect(c.allowedActions).toContain('unpublish')
      })
    })

    it('offers an extension from the expiry perspective', () => {
      const c = build({ status: 'Live' }, 'expiry')
      c.ngOnInit()

      expect(c.mainAction).toBe('extend')
      expect(c.timeLinePerspective).toBe('expires')
      expect(c.allowedActions).toEqual(['newLanguage', 'delete', 'history'])
    })

    it('offers nothing from the deleted perspective', () => {
      const c = build({ status: 'Live' }, 'deleted')
      c.ngOnInit()

      expect(c.mainAction).toBe('edit')
      expect(c.allowedActions).toEqual([])
    })

    it('still exposes history for content that is processing', () => {
      const c = build({ status: 'Processing' })
      c.ngOnInit()

      expect(c.allowedActions).toEqual(['history'])
    })

    it.each(['isMetaEditingDisabled', 'isAuthoringDisabled'])('disables edit and delete when %s is set', flag => {
      const c = build({ [flag]: true })
      c.ngOnInit()

      expect(c.disabledActions).toEqual(['edit', 'delete'])
    })

    it('disables only delete when content editing is off', () => {
      const c = build({ isContentEditingDisabled: true })
      c.ngOnInit()

      expect(c.disabledActions).toEqual(['delete'])
    })

    it('drops history when the instance disallows it', () => {
      initService.authAdditionalConfig.allowActionHistory = false
      const c = build({ status: 'Draft' })
      c.ngOnInit()

      expect(c.allowedActions).toEqual(['newLanguage', 'delete'])
    })
  })

  describe('emitted actions', () => {
    it('emits a plain action with the card content', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)

      component.onClick('edit')

      expect(spy).toHaveBeenCalledWith({ action: 'edit', content: component.content })
    })

    it('emits a create action carrying the chosen language', () => {
      const spy = jest.fn()
      component.action.subscribe(spy)

      component.create('ta')

      expect(spy).toHaveBeenCalledWith({
        action: 'create',
        content: expect.objectContaining({ identifier: 'do_1', locale: 'ta' }),
      })
    })
  })

  describe('dialog-backed actions', () => {
    let emitted: jest.Mock

    beforeEach(() => {
      emitted = jest.fn()
      component.action.subscribe(emitted)
    })

    const expectDialogSize = (width: string) =>
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width,
        height: 'auto',
        data: component.content,
      })

    it('removes the content once a delete is confirmed', () => {
      component.delete()
      expectDialogSize('600px')

      afterClosed$.next(true)

      expect(emitted).toHaveBeenCalledWith({ action: 'remove', content: component.content })
    })

    it('keeps the content when a delete is cancelled', () => {
      component.delete()
      afterClosed$.next(false)

      expect(emitted).not.toHaveBeenCalled()
    })

    it('sizes the dialog for mobile', () => {
      component.isMobile = true
      component.delete()

      expectDialogSize('90vw')
    })

    it('opens the action history without expecting a result', () => {
      component.actionHistory()

      expectDialogSize('600px')
      expect(emitted).not.toHaveBeenCalled()
    })

    it.each([
      ['restore', 'edit'],
      ['unpublish', 'edit'],
      ['moveToDraft', 'edit'],
      ['extendOrExpiry', 'remove'],
    ])('%s emits %s once confirmed', (method, action) => {
      ;(component as any)[method]()
      afterClosed$.next(true)

      expect(emitted).toHaveBeenCalledWith({ action, content: component.content })
    })

    it.each(['restore', 'unpublish', 'moveToDraft', 'extendOrExpiry'])('%s emits nothing when cancelled', method => {
      ;(component as any)[method]()
      afterClosed$.next(false)

      expect(emitted).not.toHaveBeenCalled()
    })
  })

  describe('image fallbacks', () => {
    it('swaps a broken thumbnail for the default logo', () => {
      const event = { target: { src: 'broken.png' } }

      component.changeToDefaultImg(event)

      expect(event.target.src).toBe('/assets/default.png')
    })

    it('swaps a broken flag for the global symbol', () => {
      const event = { target: { src: 'broken.png' } }

      component.changeToGlobalSymbol(event)

      expect(event.target.src).toBe('/assets/common/flags/pref.png')
    })
  })
})
