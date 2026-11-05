import { Injectable } from '@angular/core'
import { Observable, Subject } from 'rxjs'

/** One `html-archive:telemetry` event as an HTML package reports it. */
export interface IHtmlPackageEvent {
  type: string
  id?: string
  extra?: Record<string, unknown>
}

/**
 * How an event arrived: `telemetry` is the documented `html-archive:telemetry` message;
 * `other` is any other message the package posted, which the player does not count as
 * progress (shown so an author can see the package talks in a different format).
 */
export type HtmlPackageEventKind = 'telemetry' | 'other'

/** An event as kept for the Debug dialog: the package's event plus when it arrived. */
export interface IHtmlPackageRecord extends IHtmlPackageEvent {
  at: number
  kind: HtmlPackageEventKind
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
  kind: HtmlPackageEventKind
  /** One-line headline for a PROGRESS row, e.g. "40% · section s2 · phase quiz". */
  headline: string | null
  fields: IHtmlPackageField[]
}

/** One PROGRESS report: when, how far, the change since the previous report, and where. */
export interface IHtmlPackageProgressStep {
  at: number
  pct: number | null
  /** Difference from the previous report, e.g. +20; null for the first. */
  change: number | null
  /** Where the package said the learner was, e.g. "section s2 · phase quiz". */
  where: string | null
}

export interface IHtmlPackageTypeCount {
  type: string
  kind: HtmlPackageEventKind
  count: number
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
  /** Every PROGRESS report kept, oldest first: where progress was triggered. */
  progressSteps: IHtmlPackageProgressStep[]
  /** How many of each event type was kept, most frequent first. */
  typeCounts: IHtmlPackageTypeCount[]
  /** Messages the package posted outside `html-archive:telemetry`. */
  otherCount: number
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

  record(contentId: string, event: IHtmlPackageEvent, kind: HtmlPackageEventKind = 'telemetry'): void {
    const list = this.events.get(contentId) || []
    list.push({ ...event, at: Date.now(), kind })
    this.events.set(contentId, list.slice(-MAX_EVENTS))
    this.totals.set(contentId, (this.totals.get(contentId) || 0) + 1)
    this.changed.next(contentId)
  }

  /**
   * Any other message the package posted (not `html-archive:telemetry`). It is kept under its
   * own `type`, `event` or `message` name so the author sees what the package sends.
   */
  recordOther(contentId: string, data: unknown): void {
    const payload = data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : { value: data }
    const name = ['type', 'event', 'message'].map(key => payload[key]).find(value => typeof value === 'string' && value.trim())
    this.record(contentId, { type: (name as string | undefined) || 'MESSAGE', extra: payload }, 'other')
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
      .filter(e => e.kind !== 'other' && e.type === 'PROGRESS' && e.extra && typeof e.extra['pct'] === 'number')
      .pop()
    return progress ? (progress.extra!['pct'] as number) : null
  }

  report(contentId: string): IHtmlPackageReport {
    const events = this.eventsFor(contentId)
    const telemetry = events.filter(e => e.kind !== 'other')
    const progress = this.progressFor(contentId)
    const progressEvents = telemetry.filter(e => e.type === 'PROGRESS')
    const lastProgress = progressEvents[progressEvents.length - 1]
    return {
      progress,
      total: this.totals.get(contentId) || 0,
      position: lastProgress ? positionText(lastProgress.extra) : null,
      reportsProgress: !!lastProgress,
      savesResumeState: telemetry.some(e => e.type === 'STATE'),
      completed: progress !== null && progress >= 100,
      lastAt: events.length ? events[events.length - 1].at : null,
      progressSteps: progressSteps(progressEvents),
      typeCounts: typeCounts(events),
      otherCount: events.length - telemetry.length,
      rows: events
        .slice()
        .reverse()
        .map(e => ({
          at: e.at,
          type: e.type,
          id: e.id,
          kind: e.kind,
          headline: e.kind !== 'other' && e.type === 'PROGRESS' ? progressHeadline(e.extra) : null,
          fields: fieldsOf(e.extra),
        })),
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
    const lines = events.slice(-10).map(e => `${e.kind === 'other' ? '(other message) ' : ''}${e.type} ${JSON.stringify(e.extra || {})}`)
    return (
      `Progress: ${progress === null ? 'not reported' : `${progress}%`}\n` +
      `Events received: ${this.totals.get(contentId) || events.length}\n\nLatest:\n${lines.join('\n')}`
    )
  }
}

function pctOf(extra: Record<string, unknown> | undefined): number | null {
  const pct = extra ? extra['pct'] : undefined
  return typeof pct === 'number' && Number.isFinite(pct) ? pct : null
}

function progressHeadline(extra: Record<string, unknown> | undefined): string {
  const pct = pctOf(extra)
  return [pct === null ? 'no pct' : `${pct}%`, positionText(extra)].filter(Boolean).join(' · ')
}

function progressSteps(events: IHtmlPackageRecord[]): IHtmlPackageProgressStep[] {
  let previous: number | null = null
  return events.map(e => {
    const pct = pctOf(e.extra)
    const change = pct !== null && previous !== null ? pct - previous : null
    if (pct !== null) {
      previous = pct
    }
    return { at: e.at, pct, change, where: positionText(e.extra) }
  })
}

function typeCounts(events: IHtmlPackageRecord[]): IHtmlPackageTypeCount[] {
  const counts = new Map<string, IHtmlPackageTypeCount>()
  for (const e of events) {
    const key = `${e.kind}:${e.type}`
    const entry = counts.get(key) || { type: e.type, kind: e.kind, count: 0 }
    entry.count += 1
    counts.set(key, entry)
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
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
