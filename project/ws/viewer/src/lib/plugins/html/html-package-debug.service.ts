import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'

/** One `html-archive:telemetry` event as an HTML package reports it. */
export interface IHtmlPackageEvent {
  type: string
  id?: string
  extra?: Record<string, unknown>
}

/** An event as kept for the Debug dialog: the package's event plus when it arrived. */
export interface IHtmlPackageRecord extends IHtmlPackageEvent {
  at: number
}

/** One value of an event's `extra`, ready to show: plain values inline, objects as JSON to expand. */
export interface IHtmlPackageField {
  key: string
  text: string
  json?: string
}

export interface IHtmlPackageEventRow {
  at: number
  type: string
  id?: string
  fields: IHtmlPackageField[]
}

/** What the Debug dialog shows for one package. */
export interface IHtmlPackageReport {
  total: number
  progress: number | null
  /** Where the package last said the learner is, e.g. "section s1 · phase video". */
  position: string | null
  reportsProgress: boolean
  savesResumeState: boolean
  completed: boolean
  lastAt: number | null
  /** Newest first. */
  rows: IHtmlPackageEventRow[]
}

const MAX_EVENTS = 50

/**
 * Keeps what each HTML package reported during preview, so the side list's
 * Debug button can show an author whether the package sends progress. SCORM
 * packages report through the SCORM API instead and keep their own debug view.
 */
@Injectable({
  providedIn: 'root',
})
export class HtmlPackageDebugService {
  private readonly events = new Map<string, IHtmlPackageRecord[]>()
  private readonly totals = new Map<string, number>()
  private readonly changed = new Subject<string>()

  /** Emits the content id whenever that package reports an event or its log is cleared. */
  readonly changes$: Observable<string> = this.changed.asObservable()

  record(contentId: string, event: IHtmlPackageEvent): void {
    const list = this.events.get(contentId) || []
    list.push({ ...event, at: Date.now() })
    this.events.set(contentId, list.slice(-MAX_EVENTS))
    this.totals.set(contentId, (this.totals.get(contentId) || 0) + 1)
    this.changed.next(contentId)
  }

  eventsFor(contentId: string): IHtmlPackageRecord[] {
    return this.events.get(contentId) || []
  }

  clear(contentId: string): void {
    this.events.delete(contentId)
    this.totals.delete(contentId)
    this.changed.next(contentId)
  }

  /** The latest progress the package reported, or null if it never sent PROGRESS. */
  progressFor(contentId: string): number | null {
    const progress = this.eventsFor(contentId)
      .filter(e => e.type === 'PROGRESS' && e.extra && typeof e.extra['pct'] === 'number')
      .pop()
    return progress ? (progress.extra!['pct'] as number) : null
  }

  report(contentId: string): IHtmlPackageReport {
    const events = this.eventsFor(contentId)
    const progress = this.progressFor(contentId)
    const lastProgress = events.filter(e => e.type === 'PROGRESS').pop()
    return {
      progress,
      total: this.totals.get(contentId) || 0,
      position: lastProgress ? positionText(lastProgress.extra) : null,
      reportsProgress: !!lastProgress,
      savesResumeState: events.some(e => e.type === 'STATE'),
      completed: progress !== null && progress >= 100,
      lastAt: events.length ? events[events.length - 1].at : null,
      rows: events
        .slice()
        .reverse()
        .map(e => ({ at: e.at, type: e.type, id: e.id, fields: fieldsOf(e.extra) })),
    }
  }

  /** Plain-text version of the report, used for "Copy log" and when no dialog is available. */
  summary(contentId: string): string {
    const events = this.eventsFor(contentId)
    if (!events.length) {
      return (
        'No progress received from this HTML package yet. Open it in the player and interact with it; ' +
        'a package reports progress by posting { type: "html-archive:telemetry", event } to the page.'
      )
    }
    const progress = this.progressFor(contentId)
    const lines = events.slice(-10).map(e => `${e.type} ${JSON.stringify(e.extra || {})}`)
    return (
      `Progress: ${progress === null ? 'not reported' : `${progress}%`}\n` +
      `Events received: ${this.totals.get(contentId) || events.length}\n\nLatest:\n${lines.join('\n')}`
    )
  }
}

function positionText(extra: Record<string, unknown> | undefined): string | null {
  const parts = Object.keys(extra || {})
    .filter(key => key !== 'pct')
    .map(key => [key, (extra as Record<string, unknown>)[key]] as const)
    .filter(([, value]) => value !== null && typeof value !== 'object')
    .map(([key, value]) => `${key} ${value}`)
  return parts.length ? parts.join(' · ') : null
}

function fieldsOf(extra: Record<string, unknown> | undefined): IHtmlPackageField[] {
  return Object.keys(extra || {}).map(key => {
    const value = (extra as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      return { key, text: `${value.length} item${value.length === 1 ? '' : 's'}`, json: JSON.stringify(value, null, 2) }
    }
    if (value !== null && typeof value === 'object') {
      return { key, text: `${Object.keys(value).length} fields`, json: JSON.stringify(value, null, 2) }
    }
    return { key, text: String(value) }
  })
}
