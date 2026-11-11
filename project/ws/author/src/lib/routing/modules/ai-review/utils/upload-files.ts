import {
  MAX_SHEET_QUESTIONS,
  parseQuizSheet,
  type ParsedQuizSheet,
} from '@ws/author/src/lib/routing/modules/editor/routing/modules/quiz/components/quiz/quiz-sheet.util'
import { AiReviewUploadKind, IAiReviewEstimateParts, IAiReviewUploadContext } from '../models/ai-review.model'
import { xlsxApi } from './report-export'

/** Video extensions the review takes; the service checks them again. */
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.webm', '.mkv']
export const PDF_EXTENSIONS = ['.pdf']
export const SHEET_EXTENSIONS = ['.xlsx', '.xls']
/** An interactive HTML package: the zip, with index.html at the top. */
export const HTML_EXTENSIONS = ['.zip']

/** What the file input offers: every kind the review takes. */
export const ACCEPT_ATTRIBUTE = [...VIDEO_EXTENSIONS, ...PDF_EXTENSIONS, ...SHEET_EXTENSIONS, ...HTML_EXTENSIONS].join(',')

export const extOf = (name: string): string => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

/**
 * The kind a picked file is reviewed as, from its extension. An Excel sheet is a quiz by
 * default; the user can say it is an assessment. Null for a file the review does not take.
 */
export function kindForFile(name: string): AiReviewUploadKind | null {
  const ext = extOf(name)
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return 'video'
  }
  if (PDF_EXTENSIONS.includes(ext)) {
    return 'pdf'
  }
  if (SHEET_EXTENSIONS.includes(ext)) {
    return 'quiz'
  }
  if (HTML_EXTENSIONS.includes(ext)) {
    return 'html'
  }
  return null
}

/** "1.4 MB", "820 KB": a size people read at a glance. */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) {
    return ''
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  const mb = bytes / 1024 / 1024
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`
}

/** Why a file cannot be added, or null: its type, then its size against the server's limits. */
export function fileProblem(file: { name: string; size: number }, accepted: IAiReviewUploadContext['accepted'] | null): string | null {
  const kind = kindForFile(file.name)
  if (!kind) {
    return 'Not a file the review takes. Add a video (MP4, MOV, M4V, WEBM, MKV), a PDF, an interactive HTML package (.zip), or a quiz or assessment Excel sheet.'
  }
  if (!file.size) {
    return 'This file is empty.'
  }
  // A sheet is sent as the questions read from it, so its own size is not the limit.
  const max = kind === 'quiz' ? null : accepted?.[kind]?.maxBytes
  if (max && file.size > max) {
    return `Larger than ${formatBytes(max)}, the most one file may be.`
  }
  return null
}

/** The questions read from a quiz or assessment sheet, with what was wrong with it, if anything. */
export interface ReadSheet {
  sheet: ParsedQuizSheet
  /** The body sent to storage: the questions, in the shape the service checks. */
  body: Blob
  /** It cannot be reviewed, and why. */
  error: string | null
  /** It can, but the user should know something (only part of it is read). */
  warning: string | null
}

/**
 * Reads a quiz or assessment Excel sheet with Course Builder's own parser, so a sheet means
 * here exactly what it means when uploaded there.
 */
export async function readQuizSheet(file: Blob, kind: 'quiz' | 'assessment'): Promise<ReadSheet> {
  const XLSX = xlsxApi(await import('xlsx'))
  let rows: unknown[][] = []
  try {
    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
    const first = workbook.SheetNames[0]
    rows = first ? (XLSX.utils.sheet_to_json(workbook.Sheets[first], { header: 1 }) as unknown[][]) : []
  } catch {
    const sheet = parseQuizSheet([], false)
    return {
      sheet,
      body: new Blob([]),
      error: 'This Excel file could not be read. Save it again as .xlsx and add it again.',
      warning: null,
    }
  }
  const sheet = parseQuizSheet(rows, kind === 'assessment')
  const body = new Blob(
    [
      JSON.stringify({
        questions: sheet.questions.map(q => ({
          question: q.question,
          questionType: q.questionType,
          multiSelection: q.multiSelection,
          options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect, ...(o.hint ? { hint: o.hint } : {}) })),
        })),
      }),
    ],
    { type: 'application/json' },
  )
  const error = sheet.questions.length
    ? null
    : 'No questions were found. Use the Course Builder template: Question, Option 1–6 and Correct Answer on each row.'
  const warning =
    rows.length - 1 > MAX_SHEET_QUESTIONS
      ? `Only the first ${MAX_SHEET_QUESTIONS} rows are read; split the sheet to review the rest.`
      : null
  return { sheet, body, error, warning }
}

/** What a review with these options costs: each file's base, plus the parts switched on. */
/** The course-level alignment verdict, once per review (keep in step with the service's cost model). */
export const COURSE_ALIGNMENT_USD = 0.05

/**
 * A FRAC domain review's extra over Plain, per resource: the expert also reads the competency's
 * other levels and the position's activities (keep in step with the service's fracDomainUsd).
 */
export const FRAC_DOMAIN_USD = 0.01

/** What one resource costs with these options (the course-level alignment verdict is not one resource's). */
export function partsCost(
  p: IAiReviewEstimateParts,
  o: { addie: boolean; domain: boolean; watch: boolean; alignment?: boolean; domainStyle?: string },
): number {
  if (!o.addie && !o.domain && !o.alignment) {
    return 0
  }
  const domain = o.domain ? p.domain + (o.domainStyle === 'frac' ? FRAC_DOMAIN_USD : 0) : 0
  const usd = p.base + (o.addie ? p.addie : 0) + domain + (o.watch ? p.watch : 0) + (o.alignment ? p.alignment || 0 : 0)
  return Math.round(usd * 1000) / 1000
}

/** What a review of these parts costs with these options, the course-level alignment verdict included. */
export function estimateFor(
  parts: readonly IAiReviewEstimateParts[],
  o: { addie: boolean; domain: boolean; watch: boolean; alignment?: boolean; domainStyle?: string },
): number {
  if (!o.addie && !o.domain && !o.alignment) {
    return 0
  }
  const total = parts.reduce(
    (sum, p) =>
      sum + p.base + (o.addie ? p.addie : 0) + (o.domain ? p.domain : 0) + (o.watch ? p.watch : 0) + (o.alignment ? p.alignment || 0 : 0),
    o.alignment && parts.length ? COURSE_ALIGNMENT_USD : 0,
  )
  return Math.round(total * 100) / 100
}
