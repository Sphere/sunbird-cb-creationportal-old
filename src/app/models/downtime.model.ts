/**
 * Planned-downtime (maintenance) configuration.
 *
 * Read at start-up from the Sunbird form service (`app_update_info`), under
 * `schemas.DOWN_TIME_INFO.WEB.<app>`, so downtime is switched on and off by
 * editing that form -- no build or deploy. The shape is shared with the learner
 * portal (eagle-fusion), which reads its own key from the same form.
 */

/** `full` blocks the whole portal; `partial` shows a banner and the portal keeps working. */
export type DowntimeType = 'full' | 'partial'

/** Text in each supported language, keyed by language code (`en`, `hi`, ...). */
export interface MultilingualContent {
  en: string
  [lang: string]: string
}

export interface DowntimeCssConfig {
  theme?: 'light' | 'dark'
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  bannerColor?: string
  borderColor?: string
  position?: 'top' | 'bottom'
}

export interface AppLink {
  isEnabled: boolean
  url: string
  label: string
  hint?: string
}

/**
 * Everything the maintenance page and banner show. Only `title` and `message` are
 * expected in the form; every other field has a default, and a text field set to
 * an empty English value (`{ "en": "" }`) is hidden.
 */
export interface DowntimeContent {
  /** A Material icon alias (`wrench`, `info`, `warning`, `error`) or an https image URL. */
  icon: string
  title: MultilingualContent
  message: MultilingualContent
  /** The logo above the maintenance page: an https image URL (an S3 svg or png). No logo when it is left out. */
  logo?: string
  /** The logo's text for screen readers. */
  logoAlt?: MultilingualContent
  /** The logo's height in px (16-160). Defaults to 48. */
  logoHeight?: number
  /** The line under the message saying the page updates by itself. */
  note?: MultilingualContent
  /** Whether the maintenance page shows a button to check again now. Defaults to true. */
  showRetry?: boolean
  /** The label of that button. */
  retryLabel?: MultilingualContent
  /** The line shown to testers who bypass a full downtime. */
  bypassNotice?: MultilingualContent
  /** Whether the banner can be closed. Defaults to true. */
  dismissible?: boolean
  /** The banner close button's label for screen readers. */
  dismissLabel?: MultilingualContent
  css?: DowntimeCssConfig
  appLink?: AppLink
}

/** One kind of downtime inside a section: switched on or off, with its own text. */
export interface DowntimeModeConfig {
  isEnabled: boolean
  content?: Partial<DowntimeContent>
}

/**
 * A section of the form. It either holds a `full` and a `partial` block, each
 * switched on separately (full wins when both are on), or -- the older shape --
 * a single `isEnabled` + `type` + `content`.
 */
export interface AppDowntimeConfig {
  full?: DowntimeModeConfig
  partial?: DowntimeModeConfig
  isEnabled?: boolean
  type?: DowntimeType
  /** How often open tabs re-read the config, in seconds. */
  refreshInterval?: number
  /** rootOrgId values whose signed-in users skip the downtime (for testing). */
  bypassOrgs?: string[]
  /**
   * Lets testers in before signing in: opening the portal with
   * `?downtimeBypass=<code>` skips the downtime for that browser session.
   * Change it per maintenance window; leave it empty to allow no bypass.
   */
  bypassCode?: string
  content?: Partial<DowntimeContent>
}

export interface DowntimeState {
  isDowntime: boolean
  type: DowntimeType
  content: DowntimeContent
  refreshInterval: number
}

/**
 * The key for every CBP portal under `DOWN_TIME_INFO.WEB`. A host-specific key
 * (`cbp-uat`, `cbp-staging`, `cbp-sphere`) is checked before it, and `default`
 * after it; the first section present is used.
 */
export const DOWNTIME_APP_NAME = 'cbp'

/** The query parameter that carries the bypass code. */
export const DOWNTIME_BYPASS_PARAM = 'downtimeBypass'

/** The text for `lang`, falling back to English. */
export function localizeDowntimeText(text: MultilingualContent, lang: string): string {
  return text[lang] || text.en || ''
}

/** The two-letter language of an Angular locale id such as `en-US` or `hi`. */
export function downtimeLanguage(localeId: string): string {
  return (localeId || 'en').slice(0, 2).toLowerCase()
}

/** True when the configured icon is an https image rather than an icon alias. */
export function isDowntimeImageIcon(icon: string): boolean {
  return /^https:\/\//i.test(icon || '')
}

/** The Material icon for an icon alias; `build` (a wrench) when unknown. */
export function downtimeMaterialIcon(icon: string): string {
  const icons: Record<string, string> = { wrench: 'build', info: 'info', warning: 'warning', error: 'error' }
  return icons[icon] || 'build'
}

export const DOWNTIME_DEFAULTS = {
  REFRESH_INTERVAL: 300,
  ICON: 'wrench',
  PRIMARY_COLOR: '#1C5D95',
  BACKGROUND_COLOR: '#F5F8FB',
  TEXT_COLOR: '#1A2D45',
  BANNER_COLOR: '#FFF3CD',
  BORDER_COLOR: '#CE9A39',
  TITLE: {
    en: 'The creation portal is under maintenance',
    hi: 'क्रिएशन पोर्टल का रखरखाव चल रहा है',
  } as MultilingualContent,
  MESSAGE: {
    en: 'We are making improvements. Please check back soon.',
    hi: 'हम सुधार कर रहे हैं। कृपया थोड़ी देर बाद फिर से प्रयास करें।',
  } as MultilingualContent,
  LOGO_ALT: { en: 'Aastrika Sphere', hi: 'आस्त्रिका स्फीयर' } as MultilingualContent,
  LOGO_HEIGHT: 48,
  DISMISS_LABEL: { en: 'Dismiss maintenance notice', hi: 'रखरखाव सूचना बंद करें' } as MultilingualContent,
  NOTE: {
    en: "This page will update automatically when we're back.",
    hi: 'हमारे वापस आते ही यह पेज अपने आप अपडेट हो जाएगा।',
  } as MultilingualContent,
  RETRY_LABEL: {
    en: 'Check again',
    hi: 'फिर से देखें',
  } as MultilingualContent,
  BYPASS_NOTICE: {
    en: 'Maintenance mode — you are bypassing it',
    hi: 'रखरखाव मोड चालू है — आप इसे बायपास कर रहे हैं',
  } as MultilingualContent,
}
