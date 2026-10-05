import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { DowntimeConfigService } from '../../services/downtime-config.service'
import { downtimeLanguage, downtimeMaterialIcon, isDowntimeImageIcon, localizeDowntimeText } from '../../models/downtime.model'

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
}
