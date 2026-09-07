import { EFeatures } from './features.enum'

describe('EFeatures enum', () => {
  it('should be a defined object', () => {
    expect(EFeatures).toBeDefined()
    expect(typeof EFeatures).toBe('object')
  })

  it('should expose representative feature keys with their string values', () => {
    // Playlists
    expect(EFeatures.PLAYLIST).toBe('playlist')
    expect(EFeatures.PLAYLIST_CREATE).toBe('playlistCreate')
    // Goals
    expect(EFeatures.GOAL).toBe('goal')
    expect(EFeatures.GOAL_CREATE_OWN).toBe('goalCreateOwn')
    // Navigator
    expect(EFeatures.NAVIGATOR).toBe('navigator')
    expect(EFeatures.NAVIGATOR_VIEW_ROLES_PAGE).toBe('navigatorViewRolesPage')
    // Catalog
    expect(EFeatures.CATALOG).toBe('catalog')
    // Feedback
    expect(EFeatures.FEEDBACK).toBe('feedback')
    expect(EFeatures.FEEDBACK_SUBMIT_ISSUE).toBe('feedbackSubmitIssue')
    // Settings
    expect(EFeatures.SETTINGS).toBe('settings')
    expect(EFeatures.SETTINGS_CHANGE_THEME).toBe('settingsChangeTheme')
    // TOC Page
    expect(EFeatures.TOC_PAGE).toBe('tocPage')
    // Search
    expect(EFeatures.SEARCH).toBe('search')
    // Lab42 Pages
    expect(EFeatures.LAB_42_EPOCH).toBe('epoch')
    // Learning Assistant Pages (last group)
    expect(EFeatures.LEARNING_ASSISTANT_MAQ).toBe('learning-assistant-maq')
    expect(EFeatures.LEARNING_ASSISTANT_ILIPDP).toBe('learning-assistant-ilipdp')
  })

  it('should contain only string values', () => {
    const values = Object.values(EFeatures)
    expect(values.length).toBeGreaterThan(300)
    values.forEach(value => {
      expect(typeof value).toBe('string')
      expect((value as string).length).toBeGreaterThan(0)
    })
  })

  it('should have unique values for every member', () => {
    const values = Object.values(EFeatures)
    expect(new Set(values).size).toBe(values.length)
  })
})
