import { AirIconName } from '../components/air-icon/air-icon.component'

export interface PipelineStep {
  label: string
  icon: AirIconName
}

export interface ResourceKindMeta {
  /** What the resource is, for people: "Video", "Assessment". */
  label: string
  /** The same, for a count above one: "Videos", "Quizzes". */
  plural: string
  icon: AirIconName
  /** The steps the reviewer takes on this kind of resource, shown as a live pipeline. */
  steps: PipelineStep[]
}

const SCORE: PipelineStep = { label: 'Score', icon: 'checklist' }

const KINDS: Record<string, ResourceKindMeta> = {
  video: {
    label: 'Video',
    plural: 'Videos',
    icon: 'video',
    steps: [{ label: 'Download', icon: 'download' }, { label: 'Watch & transcribe', icon: 'eye' }, SCORE],
  },
  pdf: {
    label: 'PDF',
    plural: 'PDFs',
    icon: 'pdf',
    steps: [{ label: 'Download', icon: 'download' }, { label: 'Read pages', icon: 'read' }, SCORE],
  },
  quiz: {
    label: 'Quiz',
    plural: 'Quizzes',
    icon: 'quiz',
    steps: [{ label: 'Load questions', icon: 'download' }, { label: 'Check each question', icon: 'quiz' }, SCORE],
  },
  assessment: {
    label: 'Assessment',
    plural: 'Assessments',
    icon: 'assessment',
    steps: [{ label: 'Load questions', icon: 'download' }, { label: 'Check each question', icon: 'assessment' }, SCORE],
  },
  audio: {
    label: 'Audio',
    plural: 'Audio',
    icon: 'audio',
    steps: [{ label: 'Download', icon: 'download' }, { label: 'Transcribe', icon: 'audio' }, SCORE],
  },
  html: { label: 'Interactive (HTML)', plural: 'Interactive (HTML)', icon: 'code', steps: [] },
  link: { label: 'Web link', plural: 'Web links', icon: 'link', steps: [] },
}

const OTHER: ResourceKindMeta = { label: 'Resource', plural: 'Resources', icon: 'document', steps: [] }

/** Everything the screens show about a kind of resource. */
export function kindMeta(kind: string | null | undefined): ResourceKindMeta {
  return (kind && KINDS[kind]) || OTHER
}

/** The kind of a resource the service did not classify, read from its mimetype. */
export function kindFromMime(mimeType: string | null | undefined): string {
  const m = (mimeType || '').toLowerCase()
  if (m.startsWith('video/') || m.includes('youtube')) {
    return 'video'
  }
  if (m === 'application/pdf') {
    return 'pdf'
  }
  if (m === 'application/json') {
    return 'quiz'
  }
  if (m.startsWith('audio/')) {
    return 'audio'
  }
  if (m.includes('html')) {
    return 'html'
  }
  if (m === 'text/x-url') {
    return 'link'
  }
  return 'other'
}

const FORMATS: Record<string, string> = {
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/quicktime': 'MOV',
  'video/x-matroska': 'MKV',
  'video/x-m4v': 'M4V',
  'video/x-youtube': 'YouTube',
  'application/pdf': 'PDF',
  'application/json': 'JSON',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/wav': 'WAV',
  'application/vnd.ekstep.html-archive': 'HTML',
  'text/x-url': 'URL',
}

/** The file format, from the mimetype: "MP4", "PDF". Empty when there is nothing useful to say. */
export function formatOf(mimeType: string | null | undefined): string {
  const m = (mimeType || '').toLowerCase()
  if (FORMATS[m]) {
    return FORMATS[m]
  }
  const sub = m.split('/')[1] || ''
  return sub && sub.length <= 6 ? sub.toUpperCase() : ''
}

/**
 * The line under a resource's name: its kind, then its format when that adds something.
 * "Video · MP4", but "PDF" (not "PDF · PDF") and "Quiz" (JSON means nothing to a reviewer).
 */
export function kindLine(kind: string | null | undefined, mimeType: string | null | undefined): string {
  const label = kindMeta(kind).label
  const format = formatOf(mimeType)
  return format && format !== 'JSON' && format.toLowerCase() !== label.toLowerCase() ? `${label} · ${format}` : label
}

/**
 * How many pipeline steps a resource has finished (0–3), or -1 while it waits. The worker
 * reports its stage as text; its wording maps onto the three steps for every kind.
 */
export function pipelineProgress(item: { status: string; stage: string | null }): number {
  if (item.status === 'done') {
    return 3
  }
  if (item.status !== 'running') {
    return -1
  }
  const stage = (item.stage || '').toLowerCase()
  if (/scor|judg/.test(stage)) {
    return 2
  }
  if (/frame|transcrib|watch|reading|pages|checking/.test(stage)) {
    return 1
  }
  return 0
}

/** "12 min 30 s", "45 s", or '' when the length is not known. */
export function formatDuration(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) {
    return ''
  }
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? (s ? `${m} min ${s} s` : `${m} min`) : `${s} s`
}
