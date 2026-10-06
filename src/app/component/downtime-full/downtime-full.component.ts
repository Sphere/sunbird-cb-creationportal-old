import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { DowntimeConfigService } from '../../services/downtime-config.service'
import {
  DOWNTIME_DEFAULTS,
  downtimeLanguage,
  downtimeMaterialIcon,
  isDowntimeImageIcon,
  localizeDowntimeText,
} from '../../models/downtime.model'

/**
 * The full-screen maintenance page, shown over the whole portal while a full
 * downtime is on. Start-up and navigation are held back at the same time (see
 * the app initializer and the route guards), so nothing underneath is usable.
 */
@Component({
  standalone: false,
  selector: 'ws-downtime-full',
  templateUrl: './downtime-full.component.html',
  styleUrls: ['./downtime-full.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DowntimeFullComponent {
  private readonly downtimeSvc = inject(DowntimeConfigService)
  private readonly lang = downtimeLanguage(inject(LOCALE_ID))

  readonly state = toSignal(this.downtimeSvc.downtime$, { initialValue: this.downtimeSvc.current })
  readonly visible = computed(() => this.downtimeSvc.isBlocking(this.state()))
  readonly title = computed(() => localizeDowntimeText(this.state().content.title, this.lang))
  readonly message = computed(() => localizeDowntimeText(this.state().content.message, this.lang))
  readonly icon = computed(() => this.state().content.icon)
  readonly imageIcon = computed(() => isDowntimeImageIcon(this.icon()))
  readonly materialIcon = computed(() => downtimeMaterialIcon(this.icon()))
  readonly appLink = computed(() => this.state().content.appLink)
  readonly css = computed(() => this.state().content.css || {})
  readonly logo = computed(() => this.state().content.logo || '')
  readonly logoAlt = computed(() => this.text(this.state().content.logoAlt))
  readonly logoHeight = computed(() => this.state().content.logoHeight || DOWNTIME_DEFAULTS.LOGO_HEIGHT)
  readonly note = computed(() => this.text(this.state().content.note))
  readonly showRetry = computed(() => this.state().content.showRetry !== false)
  readonly retryLabel = computed(() => this.text(this.state().content.retryLabel))

  private text(value: Parameters<typeof localizeDowntimeText>[0] | undefined): string {
    return value ? localizeDowntimeText(value, this.lang) : ''
  }

  /**
   * Reloads to look again now. The page also re-checks on its own, but a visible
   * action tells people what to do instead of leaving them at a dead end. A reload
   * runs the full start-up -- including sign-in -- once the downtime has ended.
   */
  checkAgain(): void {
    this.reloadPage()
  }

  /** Separate so tests can observe it; jsdom cannot reload. */
  protected reloadPage(): void {
    window.location.reload()
  }
}
