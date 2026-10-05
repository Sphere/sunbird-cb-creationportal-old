import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { DowntimeConfigService } from '../../services/downtime-config.service'
import { downtimeLanguage, downtimeMaterialIcon, isDowntimeImageIcon, localizeDowntimeText } from '../../models/downtime.model'

/**
 * The maintenance banner. Shown during a partial downtime, when the portal keeps
 * working, and to testers who have bypassed a full downtime -- so they can tell
 * the portal is in maintenance for everyone else.
 */
@Component({
  standalone: false,
  selector: 'ws-downtime-banner',
  templateUrl: './downtime-banner.component.html',
  styleUrls: ['./downtime-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DowntimeBannerComponent {
  private readonly downtimeSvc = inject(DowntimeConfigService)
  private readonly lang = downtimeLanguage(inject(LOCALE_ID))
  private readonly dismissed = signal(false)

  readonly state = toSignal(this.downtimeSvc.downtime$, { initialValue: this.downtimeSvc.current })
  /** A full downtime this user is bypassing. */
  readonly bypassing = computed(() => {
    const state = this.state()
    return state.isDowntime && state.type === 'full' && this.downtimeSvc.isBypassed()
  })
  readonly visible = computed(() => {
    const state = this.state()
    return state.isDowntime && (state.type === 'partial' || this.bypassing()) && !this.dismissed()
  })
  readonly title = computed(() => localizeDowntimeText(this.state().content.title, this.lang))
  readonly message = computed(() => localizeDowntimeText(this.state().content.message, this.lang))
  readonly icon = computed(() => this.state().content.icon)
  readonly imageIcon = computed(() => isDowntimeImageIcon(this.icon()))
  readonly materialIcon = computed(() => downtimeMaterialIcon(this.icon()))
  readonly appLink = computed(() => this.state().content.appLink)
  readonly css = computed(() => this.state().content.css || {})

  /** Hides the banner until the page is reloaded. */
  dismiss(): void {
    this.dismissed.set(true)
  }
}
