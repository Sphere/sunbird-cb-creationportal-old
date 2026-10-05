import { HttpClient } from '@angular/common/http'
import { Injectable, NgZone, OnDestroy, inject } from '@angular/core'
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { ConfigurationsService, LoggerService } from '@ws-widget/utils'
import {
  AppDowntimeConfig,
  DOWNTIME_APP_NAME,
  DOWNTIME_BYPASS_PARAM,
  DOWNTIME_DEFAULTS,
  DowntimeContent,
  DowntimeState,
} from '../models/downtime.model'

/** Public form read, served by ui-proxies without a session. */
export const DOWNTIME_FORM_READ_URL = '/apis/v1/form/read'

const BYPASS_STORAGE_KEY = 'cbp-downtime-bypass'

const NO_DOWNTIME: DowntimeState = {
  isDowntime: false,
  type: 'full',
  content: { icon: DOWNTIME_DEFAULTS.ICON, title: DOWNTIME_DEFAULTS.TITLE, message: DOWNTIME_DEFAULTS.MESSAGE },
  refreshInterval: DOWNTIME_DEFAULTS.REFRESH_INTERVAL,
}

/**
 * Planned downtime for the creation portal.
 *
 * The config is read before the app signs the user in: during a full downtime
 * Keycloak itself may be unavailable, so the portal shows the maintenance page
 * instead of starting a login that cannot complete. Open tabs re-read the config
 * on the configured interval, so switching downtime on or off takes effect
 * without anyone reloading.
 */
@Injectable({ providedIn: 'root' })
export class DowntimeConfigService implements OnDestroy {
  private readonly http = inject(HttpClient)
  private readonly zone = inject(NgZone)
  private readonly configSvc = inject(ConfigurationsService)
  private readonly logger = inject(LoggerService)

  private readonly state$ = new BehaviorSubject<DowntimeState>(NO_DOWNTIME)
  readonly downtime$: Observable<DowntimeState> = this.state$.asObservable()

  private config: AppDowntimeConfig | null = null
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  /** Whether the app went through its normal start-up (sign-in, config). */
  private appStarted = false

  /** Reads the config and starts the periodic re-check. Never throws. */
  async load(): Promise<DowntimeState> {
    this.rememberBypassCode()
    const state = await firstValueFrom(this.fetch())
    this.state$.next(state)
    this.scheduleRefresh(state.refreshInterval)
    return state
  }

  /** Called once start-up has run, so a later switch-off needs no reload. */
  markAppStarted(): void {
    this.appStarted = true
  }

  get current(): DowntimeState {
    return this.state$.value
  }

  /** True when the portal must show the full maintenance page to this user. */
  isBlocking(state: DowntimeState = this.current): boolean {
    return state.isDowntime && state.type === 'full' && !this.isBypassed()
  }

  /** True when this user may use the portal despite a downtime. */
  isBypassed(): boolean {
    const config = this.config
    if (!config) {
      return false
    }
    const code = (config.bypassCode || '').trim()
    if (code && this.readStoredBypassCode() === code) {
      return true
    }
    const orgs = config.bypassOrgs || []
    const rootOrgId = this.configSvc.userProfile ? this.configSvc.userProfile.rootOrgId : undefined
    return !!rootOrgId && orgs.includes(rootOrgId)
  }

  ngOnDestroy(): void {
    this.clearRefresh()
  }

  private fetch(): Observable<DowntimeState> {
    const body = {
      request: { type: 'app_update_info', subtype: '*', action: 'get', component: 'app', rootOrgId: '*' },
    }
    return this.http.post<unknown>(DOWNTIME_FORM_READ_URL, body).pipe(
      map(response => this.parse(response)),
      catchError(error => {
        // No config means no downtime: an unreachable form service must never block the portal.
        this.logger.warn('Could not read the downtime config; carrying on normally.', error)
        return of(NO_DOWNTIME)
      }),
    )
  }

  private parse(response: unknown): DowntimeState {
    const web = this.pick(response, ['result', 'form', 'data', 'schemas', 'DOWN_TIME_INFO', 'WEB'])
    // The most specific section present wins, even if it is switched off.
    const config = this.configKeys()
      .map(key => this.pick(web, [key]))
      .find(section => !!section) as AppDowntimeConfig | undefined
    this.config = config || null
    if (!config) {
      return NO_DOWNTIME
    }
    const refreshInterval = Number(config.refreshInterval) > 0 ? Number(config.refreshInterval) : DOWNTIME_DEFAULTS.REFRESH_INTERVAL
    if (config.isEnabled !== true) {
      return { ...NO_DOWNTIME, refreshInterval }
    }
    return {
      isDowntime: true,
      type: config.type === 'partial' ? 'partial' : 'full',
      content: this.withDefaults(config.content),
      refreshInterval,
    }
  }

  private withDefaults(content: Partial<DowntimeContent> | undefined): DowntimeContent {
    const css = (content && content.css) || {}
    const link = content && content.appLink
    return {
      icon: (content && content.icon) || DOWNTIME_DEFAULTS.ICON,
      title: content && content.title && content.title.en ? content.title : DOWNTIME_DEFAULTS.TITLE,
      message: content && content.message && content.message.en ? content.message : DOWNTIME_DEFAULTS.MESSAGE,
      css: {
        theme: css.theme === 'dark' ? 'dark' : 'light',
        primaryColor: css.primaryColor || DOWNTIME_DEFAULTS.PRIMARY_COLOR,
        backgroundColor: css.backgroundColor || DOWNTIME_DEFAULTS.BACKGROUND_COLOR,
        textColor: css.textColor || DOWNTIME_DEFAULTS.TEXT_COLOR,
        bannerColor: css.bannerColor || DOWNTIME_DEFAULTS.BANNER_COLOR,
        borderColor: css.borderColor || DOWNTIME_DEFAULTS.BORDER_COLOR,
        position: css.position === 'bottom' ? 'bottom' : 'top',
      },
      // Only an enabled https link is shown; anything else in hand-edited config is ignored.
      appLink: link && link.isEnabled && /^https:\/\//i.test(link.url || '') ? link : undefined,
    }
  }

  /**
   * The sections to look for, most specific first: this host (`cbp-uat`,
   * `cbp-staging`, `cbp-sphere` -- the first label of the hostname), then every
   * CBP portal (`cbp`), then every portal (`default`). Environments that share a
   * form service can then still be switched separately.
   */
  private configKeys(): string[] {
    const hostKey = (this.currentHostname().split('.')[0] || '').toLowerCase()
    const keys = hostKey.startsWith(DOWNTIME_APP_NAME) && hostKey !== DOWNTIME_APP_NAME ? [hostKey] : []
    return [...keys, DOWNTIME_APP_NAME, 'default']
  }

  /** Separate so tests can set the host. */
  protected currentHostname(): string {
    return window.location.hostname
  }

  private scheduleRefresh(seconds: number): void {
    this.clearRefresh()
    if (!(seconds > 0)) {
      return
    }
    this.zone.runOutsideAngular(() => {
      this.refreshTimer = setInterval(() => this.zone.run(() => this.refresh()), seconds * 1000)
    })
  }

  private refresh(): void {
    this.fetch().subscribe(state => {
      const wasBlocking = this.isBlocking()
      const previousInterval = this.current.refreshInterval
      this.state$.next(state)
      // Start-up was skipped for a full downtime, so the app has no session yet:
      // once the downtime ends, reload to sign in and start normally.
      if (wasBlocking && !this.isBlocking(state) && !this.appStarted) {
        this.reloadPage()
        return
      }
      if (state.refreshInterval !== previousInterval) {
        this.scheduleRefresh(state.refreshInterval)
      }
    })
  }

  private clearRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /** Separate so tests can observe it; jsdom cannot reload. */
  protected reloadPage(): void {
    window.location.reload()
  }

  private rememberBypassCode(): void {
    try {
      const code = new URLSearchParams(window.location.search).get(DOWNTIME_BYPASS_PARAM)
      if (code) {
        sessionStorage.setItem(BYPASS_STORAGE_KEY, code.trim())
      }
    } catch {
      // Storage can be unavailable (private mode, blocked site data); bypass then just does not apply.
    }
  }

  private readStoredBypassCode(): string | null {
    try {
      return sessionStorage.getItem(BYPASS_STORAGE_KEY)
    } catch {
      return null
    }
  }

  private pick(source: unknown, path: string[]): unknown {
    let value: unknown = source
    for (const key of path) {
      if (!value || typeof value !== 'object') {
        return undefined
      }
      value = (value as Record<string, unknown>)[key]
    }
    return value
  }
}
