import { ROOT_WIDGET_CONFIG } from './collection.config'

describe('ROOT_WIDGET_CONFIG', () => {
  it('should be a defined object', () => {
    expect(ROOT_WIDGET_CONFIG).toBeDefined()
    expect(typeof ROOT_WIDGET_CONFIG).toBe('object')
  })

  it('should expose every top-level widget group with a _type marker', () => {
    const groups = Object.keys(ROOT_WIDGET_CONFIG) as Array<keyof typeof ROOT_WIDGET_CONFIG>
    expect(groups.length).toBeGreaterThan(20)
    groups.forEach(group => {
      const cfg = ROOT_WIDGET_CONFIG[group] as Record<string, string>
      expect(cfg).toBeDefined()
      expect(typeof cfg._type).toBe('string')
      expect(cfg._type.length).toBeGreaterThan(0)
    })
  })

  it('should resolve representative widget type/subtype values', () => {
    expect(ROOT_WIDGET_CONFIG.atGlance._type).toBe('atGlance')
    expect(ROOT_WIDGET_CONFIG.atGlance.default).toBe('default')

    expect(ROOT_WIDGET_CONFIG.actionButton._type).toBe('actionButton')
    expect(ROOT_WIDGET_CONFIG.actionButton.apps).toBe('actionButtonApps')
    expect(ROOT_WIDGET_CONFIG.actionButton.contentDownload).toBe('actionButtonContentDownload')
    expect(ROOT_WIDGET_CONFIG.actionButton.newProfile).toBe('actionButtonProfile')
    expect(ROOT_WIDGET_CONFIG.actionButton.feature).toBe('buttonFeature')

    expect(ROOT_WIDGET_CONFIG.card._type).toBe('card')
    expect(ROOT_WIDGET_CONFIG.card.content).toBe('cardContent')

    expect(ROOT_WIDGET_CONFIG.contentStrip._type).toBe('contentStrip')
    expect(ROOT_WIDGET_CONFIG.contentStrip.multiStrip).toBe('contentStripMultiple')
    expect(ROOT_WIDGET_CONFIG.contentStrip.singleStrip).toBe('contentStripSingle')

    expect(ROOT_WIDGET_CONFIG.player._type).toBe('player')
    expect(ROOT_WIDGET_CONFIG.player.audio).toBe('playerAudio')
    expect(ROOT_WIDGET_CONFIG.player.pdf).toBe('playerPDF')
    expect(ROOT_WIDGET_CONFIG.player.video).toBe('playerVideo')
    expect(ROOT_WIDGET_CONFIG.player.youtube).toBe('playerYoutube')

    expect(ROOT_WIDGET_CONFIG.layout._type).toBe('layout')
    expect(ROOT_WIDGET_CONFIG.layout.grid).toBe('gridLayout')

    expect(ROOT_WIDGET_CONFIG.selector._type).toBe('selector')
    expect(ROOT_WIDGET_CONFIG.selector.responsive).toBe('selectorResponsive')
    expect(ROOT_WIDGET_CONFIG.selector.intranet).toBe('intranetResponsive')

    expect(ROOT_WIDGET_CONFIG.discussionForum._type).toBe('discussionForum')
    expect(ROOT_WIDGET_CONFIG.errorResolver._type).toBe('errorResolver')
    expect(ROOT_WIDGET_CONFIG.imageMap.imageMapResponsive).toBe('imageMapResponsive')
    expect(ROOT_WIDGET_CONFIG.table.cardTable).toBe('cardTable')
    expect(ROOT_WIDGET_CONFIG.menus.leftMenu).toBe('leftMenu')
    expect(ROOT_WIDGET_CONFIG.page.standard).toBe('pageStandard')
    expect(ROOT_WIDGET_CONFIG.activityStrip.multipleStrip).toBe('ActivityStripMultiple')
  })

  it('should give each group a _type equal to its own key (single source of truth)', () => {
    expect(ROOT_WIDGET_CONFIG.player._type).toBe('player')
    expect(ROOT_WIDGET_CONFIG.card._type).toBe('card')
    expect(ROOT_WIDGET_CONFIG.layout._type).toBe('layout')
    expect(ROOT_WIDGET_CONFIG.tree._type).toBe('tree')
  })
})
