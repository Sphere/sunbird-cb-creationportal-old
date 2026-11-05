import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { IAiReviewItem } from '../../models/ai-review.model'
import { kindFromMime, kindLine, kindMeta } from '../../utils/resource-kind'

/** One issue from a report, opened in place. */
export interface AirEvidence {
  item: IAiReviewItem
  /** "C2", "Q3", or '' for a coverage line. */
  code: string
  /** Which part of the review raised it: "CBP / ADDIE checklist", "Question check"… */
  source: string
  /** The indicator, question or competency component. */
  title: string
  verdict: 'yes' | 'no' | 'na' | 'ok' | 'issue' | 'covered' | 'partial' | 'missing'
  notes: string[]
  fix?: string
  at?: string
  atSec?: number
  page?: number
}

/**
 * The resource file, only when it is a plain https URL. Anything else (javascript:, data:,
 * http, credentials in the URL) is refused, so a bad value in a review can never become a
 * script or a frame onto something unexpected.
 */
export function safeFileUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : null
  } catch {
    return null
  }
}

/** "0:12" from 12; "1:02:05" from 3725. */
export function clock(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`
}

/**
 * An issue opened in a modal on the same page: the video starts at the moment, the PDF
 * opens on the page, a quiz shows the question; beside it the finding and the fix. The
 * report stays where it was underneath. Built on the native <dialog>, which brings focus
 * trapping, Escape to close and an inert background.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-evidence',
  templateUrl: './air-evidence.component.html',
  styleUrls: ['./air-evidence.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirEvidenceComponent {
  private readonly sanitizer = inject(DomSanitizer)
  private readonly document = inject(DOCUMENT)
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog')

  readonly evidence = signal<AirEvidence | null>(null)

  readonly kind = computed(() => {
    const e = this.evidence()
    return e ? e.item.kind || kindFromMime(e.item.mimeType) : 'other'
  })
  readonly meta = computed(() => kindMeta(this.kind()))
  readonly line = computed(() => {
    const e = this.evidence()
    return e ? kindLine(this.kind(), e.item.mimeType) : ''
  })
  readonly fileUrl = computed(() => safeFileUrl(this.evidence()?.item.artifactUrl))

  /** The video, starting at the issue's moment (a media fragment the browser understands). */
  readonly videoSrc = computed(() => {
    const url = this.fileUrl()
    const at = this.evidence()?.atSec
    return url && this.kind() === 'video' ? (at ? `${url}#t=${Math.max(0, Math.floor(at))}` : url) : null
  })

  /** The PDF, opened on the issue's page. Trusted only after safeFileUrl allowed it. */
  readonly pdfSrc = computed<SafeResourceUrl | null>(() => {
    const url = this.fileUrl()
    if (!url || this.kind() !== 'pdf') {
      return null
    }
    const page = this.evidence()?.page
    return this.sanitizer.bypassSecurityTrustResourceUrl(page ? `${url}#page=${page}` : url)
  })

  /** Where in the resource, for the chip: "0:12" or "page 3". */
  readonly where = computed(() => {
    const e = this.evidence()
    if (!e) {
      return ''
    }
    if (e.page) {
      return `page ${e.page}`
    }
    return typeof e.atSec === 'number' ? clock(e.atSec) : e.at || ''
  })

  /** True when the video failed to load (offline, slow, or gone), so the pop-up says so. */
  readonly mediaError = signal(false)

  /**
   * Asks for a fresh link to the file: an uploaded file's link is signed and lasts an hour, so a
   * report left open longer cannot play it. The report reads the review again and calls
   * {@link replaceItem}, or {@link refreshFailed}.
   */
  readonly refresh = output<IAiReviewItem>()
  readonly refreshing = signal(false)
  readonly refreshError = signal('')

  askFresh(): void {
    const e = this.evidence()
    if (!e || this.refreshing()) {
      return
    }
    this.refreshing.set(true)
    this.refreshError.set('')
    this.refresh.emit(e.item)
  }

  /** The same finding, with the resource's fresh link. */
  replaceItem(item: IAiReviewItem): void {
    const e = this.evidence()
    this.refreshing.set(false)
    if (e && e.item.contentId === item.contentId) {
      this.mediaError.set(false)
      this.evidence.set({ ...e, item })
    }
  }

  refreshFailed(message: string): void {
    this.refreshing.set(false)
    this.refreshError.set(message)
  }

  open(evidence: AirEvidence): void {
    this.mediaError.set(false)
    this.refreshing.set(false)
    this.refreshError.set('')
    this.evidence.set(evidence)
    // A modal dialog traps focus but not scrolling: hold the page still behind it.
    this.document.documentElement.style.overflow = 'hidden'
    const el = this.dialog()?.nativeElement
    if (el && !el.open) {
      if (typeof el.showModal === 'function') {
        el.showModal()
      } else {
        el.setAttribute('open', '')
      }
    }
  }

  close(): void {
    const el = this.dialog()?.nativeElement
    if (el && typeof el.close === 'function' && el.open) {
      el.close()
    } else {
      this.onClosed()
    }
  }

  /** Fired by the dialog however it closed (button, Escape); drops the media so it stops. */
  onClosed(): void {
    this.dialog()?.nativeElement.removeAttribute('open')
    this.evidence.set(null)
    this.document.documentElement.style.overflow = ''
  }

  /** A click on the dimmed backdrop lands on the dialog element itself. */
  onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.close()
    }
  }

  verdictLabel(verdict: AirEvidence['verdict']): string {
    const labels: Record<string, string> = {
      yes: 'Met',
      no: 'Not met',
      na: 'N/A',
      ok: 'Checks out',
      issue: 'Needs attention',
      covered: 'Covered',
      partial: 'Partly covered',
      missing: 'Missing',
    }
    return labels[verdict] || verdict
  }

  verdictTone(verdict: AirEvidence['verdict']): string {
    return verdict === 'yes' || verdict === 'ok' || verdict === 'covered'
      ? 'green'
      : verdict === 'partial' || verdict === 'na'
        ? 'amber'
        : 'red'
  }
}
