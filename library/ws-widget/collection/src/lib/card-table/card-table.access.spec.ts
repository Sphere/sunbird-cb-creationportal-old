import { CardTableComponent } from './card-table.component'

/**
 * Wave 18 — the row-level permission rules of CardTableComponent: which menu items
 * `showMenuItem` offers per status and the ownership rules in `hasAccess`.
 */
describe('CardTableComponent (row permissions)', () => {
  let component: CardTableComponent

  const build = (widgetData: any = {}) => {
    const c = new CardTableComponent()
    c.widgetData = { columns: [], ...widgetData } as any
    c.userId = 'u1'
    return c
  }

  /** A row owned by the signed-in author. */
  const row = (over: any = {}) =>
    ({
      identifier: 'do_1',
      contentType: 'Course',
      status: 'Draft',
      creatorContacts: [{ id: 'u1' }],
      trackContacts: [{ id: 'u1' }],
      publisherDetails: [{ id: 'u1' }],
      ...over,
    }) as any

  beforeEach(() => {
    component = build()
    component.userRoles = new Set(['content_creator'])
  })

  // ---------------------------------------------------------- showMenuItem --

  describe('showMenuItem', () => {
    it('offers nothing on a plain resource row', () => {
      expect(component.showMenuItem('edit', row({ contentType: 'Resource' }))).toBe(false)
    })

    it.each(['Draft', 'Live'])('offers edit and delete on a %s course', status => {
      expect(component.showMenuItem('edit', row({ status }))).toBe(true)
      expect(component.showMenuItem('delete', row({ status }))).toBe(true)
    })

    it('withholds edit on a course whose authoring is disabled', () => {
      expect(component.showMenuItem('edit', row({ authoringDisabled: true }))).toBe(false)
      expect(component.showMenuItem('delete', row({ authoringDisabled: true }))).toBe(true)
    })

    it('withholds edit on a course that is under review', () => {
      expect(component.showMenuItem('edit', row({ status: 'InReview' }))).toBe(false)
    })

    it.each(['InReview', 'Unpublished', 'Reviewed', 'QualityReview'])('offers move-to-draft on a %s course', status => {
      expect(component.showMenuItem('moveToDraft', row({ status }))).toBe(true)
    })

    it('withholds move-to-draft on a live course', () => {
      expect(component.showMenuItem('moveToDraft', row({ status: 'Live' }))).toBe(false)
    })

    it.each(['Reviewed', 'QualityReview'])('offers move-to-in-review on a %s course', status => {
      component.userRoles = new Set(['content_reviewer'])
      expect(component.showMenuItem('moveToInReview', row({ status }))).toBe(true)
    })

    it('withholds move-to-in-review on a draft course', () => {
      expect(component.showMenuItem('moveToInReview', row({ status: 'Draft' }))).toBe(false)
    })

    it('offers publish on a reviewed course to its publisher', () => {
      component.userRoles = new Set(['content_publisher'])
      expect(component.showMenuItem('publish', row({ status: 'Reviewed' }))).toBe(true)
    })

    it('withholds publish on a course that is not reviewed', () => {
      expect(component.showMenuItem('publish', row({ status: 'Draft' }))).toBe(false)
    })

    it('offers unpublish on a live course', () => {
      expect(component.showMenuItem('unpublish', row({ status: 'Live' }))).toBe(true)
    })

    it('withholds unpublish on a draft course', () => {
      expect(component.showMenuItem('unpublish', row({ status: 'Draft' }))).toBe(false)
    })

    it.each(['Review', 'QualityReview'])('offers review on a %s course to its reviewer', status => {
      component.userRoles = new Set(['editor'])
      expect(component.showMenuItem('review', row({ status }))).toBe(true)
    })

    it('withholds review on a draft course', () => {
      expect(component.showMenuItem('review', row({ status: 'Draft' }))).toBe(false)
    })

    it('always offers the language copy to an owner', () => {
      expect(component.showMenuItem('lang', row({ status: 'InReview' }))).toBe(true)
    })

    it('offers nothing for an unrecognised menu item', () => {
      expect(component.showMenuItem('somethingElse', row())).toBe(false)
    })
  })

  // -------------------------------------------------------------- hasAccess --

  describe('hasAccess', () => {
    it('lets an editor do anything', () => {
      component.userRoles = new Set(['editor'])
      expect(component.hasAccess(row({ status: 'Review', creatorContacts: [] }))).toBe(true)
    })

    it('lets an admin do anything', () => {
      component.userRoles = new Set(['admin'])
      expect(component.hasAccess(row({ status: 'Review', creatorContacts: [] }))).toBe(true)
    })

    it.each(['Draft', 'Live'])('lets the author act on their own %s course', status => {
      expect(component.hasAccess(row({ status }))).toBe(true)
    })

    it('refuses an author who does not own the course', () => {
      expect(component.hasAccess(row({ creatorContacts: [{ id: 'someone-else' }] }))).toBe(false)
    })

    it('refuses a course that lists no authors at all', () => {
      expect(component.hasAccess(row({ creatorContacts: [] }))).toBe(false)
    })

    it('lets the assigned reviewer act on an in-review course', () => {
      component.userRoles = new Set(['content_reviewer'])
      expect(component.hasAccess(row({ status: 'InReview' }))).toBe(true)
    })

    it('refuses a reviewer who is not assigned', () => {
      component.userRoles = new Set(['content_reviewer'])
      expect(component.hasAccess(row({ status: 'InReview', trackContacts: [{ id: 'other' }] }))).toBe(false)
    })

    it('lets a reviewer act through a shared parent author', () => {
      component.userRoles = new Set(['content_reviewer'])
      const meta = row({ status: 'InReview', trackContacts: [] })
      expect(component.hasAccess(meta, false, row({ creatorContacts: [{ id: 'u1' }] }))).toBe(true)
    })

    it('lets the assigned publisher act on a reviewed course', () => {
      component.userRoles = new Set(['content_publisher'])
      expect(component.hasAccess(row({ status: 'Reviewed' }))).toBe(true)
    })

    it('refuses a publisher who is not assigned', () => {
      component.userRoles = new Set(['content_publisher'])
      expect(component.hasAccess(row({ status: 'Reviewed', publisherDetails: [{ id: 'other' }] }))).toBe(false)
    })

    it('lets a publisher act through a shared parent author', () => {
      component.userRoles = new Set(['content_publisher'])
      const meta = row({ status: 'Reviewed', publisherDetails: [] })
      expect(component.hasAccess(meta, false, row({ creatorContacts: [{ id: 'u1' }] }))).toBe(true)
    })

    it('lets anyone preview a public course', () => {
      expect(component.hasAccess(row({ status: 'Review', creatorContacts: [], visibility: 'Public' }), true)).toBe(true)
    })

    it('does not open a private course for preview', () => {
      expect(component.hasAccess(row({ status: 'Review', creatorContacts: [], visibility: 'Private' }), true)).toBe(false)
    })
  })

  // ------------------------------------------------------------- takeAction --

  describe('takeAction', () => {
    it('emits the action for an enabled menu item', () => {
      const c = build({ actions: [{ name: 'edit', disabled: false }] })
      const emit = jest.spyOn(c.actionsClick!, 'emit')
      c.takeAction('edit', row())
      expect(emit).toHaveBeenCalledWith({ type: 'edit', data: expect.objectContaining({ identifier: 'do_1' }) })
    })

    it('stays silent for a disabled menu item', () => {
      const c = build({ actions: [{ name: 'edit', disabled: true }] })
      const emit = jest.spyOn(c.actionsClick!, 'emit')
      c.takeAction('edit', row())
      expect(emit).not.toHaveBeenCalled()
    })

    it('emits for an action the widget does not describe', () => {
      const c = build({ actions: [] })
      const emit = jest.spyOn(c.actionsClick!, 'emit')
      c.takeAction('edit', row())
      expect(emit).toHaveBeenCalled()
    })
  })
})
