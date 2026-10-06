import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, ElementRef, LOCALE_ID, computed, effect, inject, signal, viewChild } from '@angular/core'
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
  /**
   * The CSS variable the root layout reads to move the fixed nav bar and the page
   * content down below a banner at the top, instead of the banner covering them.
   */
  static readonly OFFSET_VAR = '--downtime-banner-offset'

  private readonly downtimeSvc = inject(DowntimeConfigService)
  private readonly document = inject(DOCUMENT)
  private readonly banner = viewChild<ElementRef<HTMLElement>>('banner')
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
  readonly bypassNotice = computed(() => {
    const notice = this.state().content.bypassNotice
    return notice ? localizeDowntimeText(notice, this.lang) : ''
  })
  readonly dismissible = computed(() => this.state().content.dismissible !== false)
  readonly dismissLabel = computed(() => {
    const label = this.state().content.dismissLabel
    return localizeDowntimeText(label && label.en ? label : DOWNTIME_DEFAULTS.DISMISS_LABEL, this.lang)
  })

  constructor() {
    // Keep the layout offset equal to the banner's height while it shows at the top;
    // it re-measures when the text wraps differently, and resets when it goes away.
    effect(onCleanup => {
      const el = this.banner()?.nativeElement
      if (!el || this.css().position === 'bottom') {
        this.setOffset(0)
        return
      }
      this.setOffset(el.offsetHeight)
      if (typeof ResizeObserver === 'undefined') {
        return
      }
      const observer = new ResizeObserver(() => this.setOffset(el.offsetHeight))
      observer.observe(el)
      onCleanup(() => {
        observer.disconnect()
        this.setOffset(0)
      })
    })
  }

  private setOffset(px: number): void {
    this.document.documentElement.style.setProperty(DowntimeBannerComponent.OFFSET_VAR, `${px}px`)
  }

  /** Hides the banner until the page is reloaded. */
  dismiss(): void {
    this.dismissed.set(true)
  }
}
