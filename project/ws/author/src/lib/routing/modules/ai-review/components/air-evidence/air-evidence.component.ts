import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { IAiReviewItem } from '../../models/ai-review.model'
import { kindFromMime, kindLine, kindMeta } from '../../utils/resource-kind'
import { AI_REVIEW_PACKAGE_BASE } from '../../services/ai-review.service'

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

/** True only for the review API's own package preview path on this site, never another address. */
export function isPackagePreviewUrl(url: string): boolean {
  return url.startsWith(`${AI_REVIEW_PACKAGE_BASE}/`) && !/[\s"'<>]|\/\.{1,2}(\/|$)/.test(url)
}

/** The names a file of a package goes by in a finding: its path, its file name, and (for media) its bare name. */
function namesOf(filePath: string, bare: boolean): string[] {
  const p = filePath.toLowerCase()
  const file = p.split('/').pop() || p
  return [p, file, ...(bare ? [file.replace(/\.[^.]+$/, '')] : [])].filter(n => n.length > 1)
}

/** Where `name` stands in `text` as a whole name ("s2", not the "s2" of "s20" or "cs2"). */
function positionsOf(text: string, name: string): number[] {
  const out: number[] = []
  const inWord = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c)
  for (let i = text.indexOf(name); i !== -1; i = text.indexOf(name, i + 1)) {
    if (!inWord(text[i - 1]) && !inWord(text[i + name.length])) {
      out.push(i)
    }
  }
  return out
}

/**
 * The file of a package a text names. With `mark` (where the moment is written), the one named
 * last before it, so "s2 at 0:17 … s3 at 1:32" with the moment 1:32 is s3; else the first named.
 */
export function namedFile<T extends { path: string }>(files: readonly T[], text: string, bare: boolean, mark = -1): T | null {
  let before: { file: T; at: number } | null = null
  let first: { file: T; at: number } | null = null
  for (const file of files) {
    for (const name of namesOf(file.path, bare)) {
      for (const at of positionsOf(text, name)) {
        if (!first || at < first.at) {
          first = { file, at }
        }
        if (mark >= 0 && at <= mark && (!before || at > before.at)) {
          before = { file, at }
        }
      }
    }
  }
  return (before || first)?.file ?? null
}

type PlaceFields = Pick<AirEvidence, 'item' | 'at' | 'atSec' | 'notes' | 'fix'>

/**
 * The video inside an HTML package that a finding points at, and the moment: the one its place
 * or its note names ("s2 at 1:19", "assets/video/s2.mp4 at 1:19"; with several named, the one
 * named just before the moment), or the package's only video. Null when the finding has no
 * moment, names no video of a package with several, or the moment is past that video's end.
 */
export function packageVideoAt(e: PlaceFields): { path: string; atSec: number } | null {
  const videos = e.item.result?.htmlPackage?.videos || []
  if (typeof e.atSec !== 'number' || !videos.length) {
    return null
  }
  const at = (e.at || '').toLowerCase()
  const body = [...e.notes, e.fix || ''].join(' \n ').toLowerCase()
  const time = at.match(/\d{1,2}(?::\d{2}){1,2}/)?.[0] || at
  const video =
    namedFile(videos, at, true) || namedFile(videos, body, true, time ? body.indexOf(time) : -1) || (videos.length === 1 ? videos[0] : null)
  if (!video || (typeof video.durationSec === 'number' && e.atSec > video.durationSec + 2)) {
    return null
  }
  return { path: video.path, atSec: Math.max(0, Math.floor(e.atSec)) }
}

/** The page of an HTML package a finding names ("lessons/2.html"), when the package lists its pages. */
export function packagePageAt(e: Pick<AirEvidence, 'item' | 'at' | 'notes' | 'fix'>): string | null {
  const pages = (e.item.result?.htmlPackage?.pagePaths || []).map(path => ({ path }))
  const text = [e.at || '', ...e.notes, e.fix || ''].join(' \n ').toLowerCase()
  return pages.length ? (namedFile(pages, text, false)?.path ?? null) : null
}

/** The questions a finding names ("Q9", "question 9"), in order, without repeats. */
export function questionsNamed(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(/\b(?:Q|question\s*#?\s*)(\d{1,3})\b/gi)) {
    const n = Number(m[1])
    if (n > 0 && !out.includes(n)) {
      out.push(n)
    }
  }
  return out
}

/** Another file of the package, beside the link to its index.html (each part of the path encoded). */
export function packageFileUrl(indexUrl: string, filePath: string): string | null {
  if (!/\/index\.html$/.test(indexUrl)) {
    return null
  }
  const url = indexUrl.replace(/\/index\.html$/, '/' + filePath.split('/').map(encodeURIComponent).join('/'))
  return isPackagePreviewUrl(url) ? url : null
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
    const media = this.kind() === 'video' || this.kind() === 'audio'
    return url && media ? (at ? `${url}#t=${Math.max(0, Math.floor(at))}` : url) : null
  })

  /** The review API's link to the package's index.html, when it is one of its own. */
  private readonly packageIndex = computed(() => {
    const url = this.evidence()?.item.packageUrl
    return url && this.kind() === 'html' && isPackagePreviewUrl(url) ? url : null
  })
  /** The package page the finding names, else its first page. */
  readonly packagePage = computed(() => {
    const e = this.evidence()
    const index = this.packageIndex()
    if (!e || !index) {
      return null
    }
    const page = packagePageAt(e)
    const url = page ? packageFileUrl(index, page) : null
    return url ? { url, path: page } : { url: index, path: null }
  })

  /**
   * An HTML package's page, from the review service. Only a same-site link the API service
   * built (it starts with the review API's package path) is trusted; the frame is sandboxed too.
   */
  readonly htmlSrc = computed<SafeResourceUrl | null>(() => {
    const page = this.packagePage()
    return page ? this.sanitizer.bypassSecurityTrustResourceUrl(page.url) : null
  })

  /**
   * The questions the finding is about: the one a question check names (Q3), or those a
   * checklist note names ("Q9 misstates…"), with their text from the review.
   */
  readonly questions = computed(() => {
    const e = this.evidence()
    if (!e) {
      return []
    }
    const own = /^Q(\d+)$/.exec(e.code)
    if (own) {
      return [{ n: Number(own[1]), text: e.title }]
    }
    const all = e.item.result?.questions || []
    return questionsNamed([e.at || '', ...e.notes, e.fix || ''].join(' \n '))
      .map(n => ({ n, text: all.find(q => q.n === n)?.question || '' }))
      .filter(q => q.text)
      .slice(0, 6)
  })
  /** A question check of an HTML package: the question, not the package, is what to show. */
  readonly packageQuestion = computed(() => this.kind() === 'html' && /^Q\d+$/.test(this.evidence()?.code || ''))
  /**
   * The package's own video the finding points at, served from the package and started at the
   * moment, as a plain video would be: the package's player cannot be moved from outside its sandbox.
   */
  readonly packageVideo = computed(() => {
    const e = this.evidence()
    const index = this.packageIndex()
    const at = e && index ? packageVideoAt(e) : null
    const src = at && index ? packageFileUrl(index, at.path) : null
    return at && src ? { ...at, src: `${src}#t=${at.atSec}`, label: clock(at.atSec) } : null
  })
  /** The package page instead of its video, when the reviewer asks for it. */
  readonly showPackagePage = signal(false)

  /** The same page, to open in a tab of its own (the service sandboxes it there as well). */
  readonly htmlTabUrl = computed(() => this.packagePage()?.url ?? null)

  /**
   * Whether the "Starts at" / "Opened at" chip belongs: not on a quiz (a page there is the
   * quiz file's, not a place to open), and on a package only beside its video.
   */
  readonly showWhere = computed(() => {
    const k = this.kind()
    if (!this.where() || k === 'quiz' || k === 'assessment') {
      return false
    }
    return k !== 'html' || (!!this.packageVideo() && !this.showPackagePage() && !this.packageQuestion())
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
    this.showPackagePage.set(false)
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
