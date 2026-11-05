/**
 * Shapes returned by the course reviewer service (aastrika-course-reviewer), through
 * uiproxy's /protected/v8/courseReview. They mirror the service's own types; a field the
 * service adds later is simply ignored here.
 */

export type AiReviewStatus = 'queued' | 'running' | 'done' | 'partial' | 'failed' | 'cancelled'
export type AiReviewItemStatus = 'queued' | 'running' | 'done' | 'failed' | 'skipped' | 'cancelled'
export type AiReviewVerdict = 'yes' | 'no' | 'na'
export type AiReviewBand = 'green' | 'amber' | 'red'
export type AiReviewCoverageStatus = 'covered' | 'partial' | 'missing'
export type AiReviewDomainStyle = 'plain' | 'frac'
export type AiReviewLanguage = 'auto' | 'hi' | 'en' | 'mr' | 'bn'

/** The states after which a review never changes again. */
export const AI_REVIEW_FINAL_STATUSES: ReadonlySet<AiReviewStatus> = new Set<AiReviewStatus>(['done', 'partial', 'failed', 'cancelled'])

export interface IAiReviewCompetency {
  competencyId: string
  name: string
  /** The lowest level the course maps it at. */
  level: number | null
  /** Every level the course maps it at, lowest first (absent from an older service). */
  levels?: number[]
}

/** A competency from the whole dictionary, with its levels, to judge against one the course lacks. */
export interface IAiReviewCatalogCompetency {
  competencyId: string
  name: string
  levels: { level: number; label: string }[]
}

export interface IAiReviewResource {
  contentId: string
  name: string
  kind: string | null
  mimeType: string
  durationSec: number | null
  /** Module names above the resource, outermost first. */
  path: string[]
  reviewable: boolean
  skipReason: string | null
  /** Self-assessment courses: the competency level this part covers ("Level 2 : …"). */
  level?: number | null
  /** Estimated USD per option; base is spent whatever is chosen. Null when not reviewed. */
  estimate?: IAiReviewEstimateParts | null
}

export interface IAiReviewEstimateParts {
  base: number
  addie: number
  domain: number
  watch: number
}

export interface IAiReviewPreview {
  /** `selfAssessment`: metadata `competency: true`; each part is one level of the competency. */
  course: { id: string; name: string; status: string; versionKey: string; selfAssessment?: boolean }
  resources: IAiReviewResource[]
  competencies: IAiReviewCompetency[]
  /** Every competency in the dictionary (absent from an older service). */
  competencyCatalog?: IAiReviewCatalogCompetency[]
  /** Lookups that failed ('competencies', 'positions'): their lists are empty, not real. */
  lookupErrors?: string[]
  positions: string[]
  /** FRAC positions with their codes (absent from an older service). */
  positionList?: { code: string; name: string }[]
  defaults: { audience: string; language: AiReviewLanguage; domainStyle: AiReviewDomainStyle }
  estimateUsd: number
  /** A review of this course already running; starting again joins it. */
  activeReviewId: string | null
  limits: IAiReviewLimits
}

/**
 * What one review may take on. Every resource within these is reviewed in full; past them
 * it is refused before any cost. The newer fields are absent from an older service.
 */
export interface IAiReviewLimits {
  maxVideoMinutes: number
  maxActivePerUser: number
  maxPdfPages?: number
  maxQuizQuestions?: number
  /** The most one resource may cost to review. */
  maxResourceUsd?: number
  maxResourcesPerReview?: number
}

/**
 * 'single': one level. 'perResource': each part of a self-assessment course at its own level.
 * 'courseLevels': all the levels the course maps its competency at, together.
 * 'courseMapping': every competency the course maps, each at its mapped levels, together.
 */
export type AiReviewLevelMode = 'single' | 'perResource' | 'courseLevels' | 'courseMapping'

export interface IAiReviewOptions {
  addie: boolean
  domain: boolean
  watch: boolean
  domainStyle: AiReviewDomainStyle
  competencyId: string | null
  level: number | null
  /** 'perResource': each part of a self-assessment course at its own level. */
  levelMode?: AiReviewLevelMode
  /** The FRAC position the audience was picked as: the FRAC style checks its activities. */
  positionCode?: string | null
  audience: string
  language: AiReviewLanguage
  context: string
}

/** One FRAC activity of the chosen position that needs a judged competency. */
export interface IAiReviewRoleActivity {
  role: string
  activity: string
  description: string
  competency: string
  /** The levels the activity needs the competency at; [] when FRAC names none. */
  levels: number[]
}

/** The chosen position's FRAC activities that need the judged competencies. */
export interface IAiReviewRole {
  positionCode: string
  positionName: string
  activities: IAiReviewRoleActivity[]
  totalActivities: number
}

/** The FRAC role check for the settings chosen: the activities, or why there are none. */
export interface IAiReviewRoleCheck {
  role: IAiReviewRole | null
  roleNote: string | null
}

export interface IAiReviewCreateResult {
  reviewId: string
  /** False when the course was already being reviewed and this request joined it. */
  created: boolean
  estimateUsd: number
}

export interface IAiReviewScoredItem {
  id: string
  text: string
  verdict: AiReviewVerdict
  note: string
  fix?: string
  borderline?: boolean
  /** Where the evidence is, when it is at one place: "0:12" or "page 3". */
  at?: string
  /** Videos: the second to open the video at. */
  atSec?: number
  /** PDFs: the page to open the document at. */
  page?: number
}

export interface IAiReviewAreaScore {
  area: string
  items: IAiReviewScoredItem[]
  yes: number
  applicable: number
  scorePct: number | null
}

export interface IAiReviewScore {
  areas: IAiReviewAreaScore[]
  yes: number
  applicable: number
  naCount: number
  total: number
  scorePct: number | null
  band: AiReviewBand | null
  bandMessage: string | null
  failedIds: string[]
}

export interface IAiReviewCoverageRow {
  component: string
  status: AiReviewCoverageStatus
  evidence: string
}

export interface IAiReviewAddie {
  model: string
  score: IAiReviewScore
  summary: string
  costUsd: number
}

export interface IAiReviewDomain {
  model: string
  style: AiReviewDomainStyle
  score: IAiReviewScore
  coverage: IAiReviewCoverageRow[]
  levelFit: { verdict: 'fits' | 'below' | 'above' | 'mixed'; bestFitLevel: number | null; rationale: string } | null
  summary: string
  costUsd: number
}

/** A pass that failed on its own; the other pass's result still stands. */
export interface IAiReviewPassError {
  error: string
}

/** One question of a quiz or assessment, as the subject expert judged it. */
export interface IAiReviewQuestionFinding {
  /** 1-based position in the quiz. */
  n: number
  question: string
  verdict: 'ok' | 'issue'
  /** What is wrong: a wrong answer key, a weak distractor, a misleading hint… */
  issues: string[]
  fix?: string
}

export interface IAiReviewItemReport {
  contentId: string
  name: string
  kind: string
  mimeType?: string
  durationSec: number | null
  /** PDFs: the number of pages read. */
  pages?: number | null
  /** Quizzes and assessments: the number of questions checked. */
  questionCount?: number | null
  /** Quizzes and assessments: each question's findings. */
  questions?: IAiReviewQuestionFinding[]
  /** Quizzes and assessments: why the question check could not run. */
  questionsError?: string
  transcriptChars: number
  transcriptEngine: string | null
  watched: { model: string; chars: number; costUsd: number } | null
  addie: IAiReviewAddie | IAiReviewPassError | null
  domain: IAiReviewDomain | IAiReviewPassError | null
  costUsd: number
  cached: boolean
  /** When a reused result was first made (the resource is unchanged since then). */
  cachedAt?: string
}

/** A resource's real size, measured after the preview, and the estimate at that size. */
export interface IAiReviewResourceSize {
  contentId: string
  pages?: number
  questions?: number
  estimate: IAiReviewEstimateParts
  /** Why it could not be measured; the estimate then assumes a typical size. */
  error?: string
  /** Past a size limit: it will not be reviewed, and this says why. */
  skipReason?: string
}

/** A resource unchanged since a review with the same settings: its result is reused, free. */
export interface IAiReviewReuse {
  contentId: string
  reviewedAt: string
}

export interface IAiReviewItem {
  contentId: string
  name: string
  kind: string | null
  mimeType?: string
  /** The resource's file, so an issue can be shown in place. */
  artifactUrl?: string | null
  status: AiReviewItemStatus
  /** What the worker is doing now, e.g. "Downloading the video…". */
  stage: string | null
  skipReason: string | null
  error: string | null
  result: IAiReviewItemReport | null
}

export interface IAiReviewCourseSummary {
  reviewed: number
  failed: number
  skipped: { contentId: string; name: string; reason: string }[]
  addie: { scorePct: number | null; band: AiReviewBand | null; bandMessage: string | null; yes: number; applicable: number } | null
  domain: { yes: number; applicable: number; scorePct: number | null } | null
  coverage: { component: string; status: AiReviewCoverageStatus; coveredBy: string[] }[]
  commonGaps: { id: string; text: string; count: number }[]
  costUsd: number
}

export interface IAiReviewCompetencyContext {
  competencyId: string
  label: string
  level: number
  levelLabel: string
  levelDescription: string
  cadre: string
}

export interface IAiReview {
  id: string
  /** 'upload': uploaded files reviewed on their own (no course). Absent from an older service. */
  source?: AiReviewSource
  /** What the user named a review of uploaded files. */
  title?: string
  /** Null for a review of uploaded files. */
  courseId: string | null
  courseName: string
  status: AiReviewStatus
  requestedBy: { id: string; name: string | null }
  /** `levels`: in 'perResource' mode, the competency at each level the parts carry. */
  options: IAiReviewOptions & {
    competency: IAiReviewCompetencyContext | null
    levels?: Record<string, IAiReviewCompetencyContext>
    /** FRAC style: the position's activities the content was judged against, or why not. */
    role?: IAiReviewRole | null
    roleNote?: string | null
  }
  progress: { done: number; total: number }
  /** Reviews ahead of this one in the queue; 0 once it is running. */
  queuePosition: number
  latestLog: string
  log: { at: string; msg: string }[]
  items: IAiReviewItem[]
  result: IAiReviewCourseSummary | null
  error: string | null
  costUsd: number | string | null
  estimateUsd: number | string | null
  createdAt: string
  finishedAt: string | null
}

export interface IAiReviewHistoryEntry {
  id: string
  status: AiReviewStatus
  requestedBy: { id: string; name: string | null }
  progress: { done: number; total: number }
  summary: IAiReviewCourseSummary | null
  costUsd: number | string | null
  createdAt: string
  finishedAt: string | null
}

/** The service's error body: `{ error: { code, message } }`. */
// ---- files reviewed on their own (not part of a course) ------------------------------------

export type AiReviewSource = 'course' | 'upload'
export type AiReviewUploadKind = 'video' | 'pdf' | 'quiz' | 'assessment'

/** The file review's setup screen: whether it is on, the dictionary, positions, accepted files. */
export interface IAiReviewUploadContext {
  /** False until storage is set up on the server: the page says so instead of failing later. */
  enabled: boolean
  competencyCatalog: IAiReviewCatalogCompetency[]
  positionList: { code: string; name: string }[]
  lookupErrors: string[]
  defaults: { audience: string; language: AiReviewLanguage; domainStyle: AiReviewDomainStyle }
  /** Per kind: the extensions of the file the user picks, and the most one file may be. */
  accepted: Record<AiReviewUploadKind, { extensions: string[]; maxBytes: number }>
  limits: IAiReviewLimits & { maxUploadFiles: number }
}

/** How to send one file to storage: a signed form (POST) or a signed raw body (PUT). */
export interface IAiReviewSignedUpload {
  method: 'POST' | 'PUT'
  url: string
  fields: Record<string, string>
  headers: Record<string, string>
  expiresAt: string
}

export interface IAiReviewSignedFile {
  uploadId: string
  fileName: string
  kind: AiReviewUploadKind
  /** The type the file must be sent as (a quiz is sent as the questions, in JSON). */
  contentType: string
  maxBytes: number
  upload: IAiReviewSignedUpload
}

/** An uploaded file as the service sees it: not there yet, ready (and measured), or refused. */
export interface IAiReviewCheckedUpload {
  uploadId: string
  fileName: string
  kind: AiReviewUploadKind
  status: 'pending' | 'ready' | 'rejected'
  reason: string | null
  bytes: number | null
  durationSec?: number
  pages?: number
  questions?: number
  estimate: IAiReviewEstimateParts | null
}

export interface IAiReviewUploadHistoryEntry {
  id: string
  title: string
  status: AiReviewStatus
  progress: { done: number; total: number }
  summary: IAiReviewCourseSummary | null
  costUsd: number | string | null
  createdAt: string
  finishedAt: string | null
}

export interface IAiReviewErrorBody {
  error?: { code?: string; message?: string }
}

/** True when a pass result is the error placeholder rather than a report. */
export function isPassError(x: unknown): x is IAiReviewPassError {
  return typeof x === 'object' && x !== null && typeof (x as { error?: unknown }).error === 'string'
}
