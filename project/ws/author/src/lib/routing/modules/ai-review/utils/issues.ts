import { IAiReview, IAiReviewItem, isPassError } from '../models/ai-review.model'
import { locateText, Place } from './report-detail'

/**
 * Every finding to act on, one per entry: what the report page, its preview and the Excel
 * "Issues to fix" sheet all list, so they always agree.
 */

export type IssueSource = 'checklist' | 'domain' | 'coverage' | 'question' | 'answerKey' | 'alignment' | 'failed' | 'noSound'

/** A silent video is reviewed on what it shows; this is what to do about the missing sound. */
export const NO_SOUND_FIX = 'If learners need a spoken explanation, add a voice-over that explains what is shown and upload the new video.'

/** What to do about an answer key a learner can guess from. */
export const ANSWER_KEY_FIX = 'Vary which option is correct and how long it is, so the answer cannot be guessed from the pattern.'

export interface Issue {
  item: IAiReviewItem
  source: IssueSource
  /** "C2", "D3", "Q4", or ''. */
  id: string
  /** What is checked: the indicator, the level component or the question. */
  what: string
  /** "Not met", "Missing", "Partial", "Needs attention", … */
  verdict: string
  /** How the evidence dialog marks it. */
  tone: 'no' | 'missing' | 'partial' | 'issue'
  finding: string
  fix: string
  place: Place
  /** The reviewer was not sure, or the guard could not prove it: worth checking by hand. */
  borderline?: boolean
  /** Why it needs checking, when the guard says. */
  check?: string
}

export const ISSUE_SOURCES: Record<IssueSource, string> = {
  checklist: 'CBP checklist',
  domain: 'Domain review',
  coverage: 'Level coverage',
  question: 'Question check',
  answerKey: 'Answer key',
  alignment: 'Course alignment',
  failed: 'Could not run',
  noSound: 'No sound',
}

const FIT: Record<string, string> = { partial: 'Partly fits the course', off_topic: 'Off topic for this course' }

export function collectIssues(review: Pick<IAiReview, 'items'>, oneWord = 'resource'): Issue[] {
  const out: Issue[] = []
  for (const item of (review.items || []).filter(i => i.status !== 'skipped')) {
    if (item.status !== 'done') {
      out.push({
        item,
        source: 'failed',
        id: '',
        what: `This ${oneWord} could not be reviewed`,
        verdict: 'Could not be reviewed',
        tone: 'issue',
        finding: item.error || '',
        fix: 'Start the review again.',
        place: {},
      })
      continue
    }
    const r = item.result
    if (r?.noSound) {
      out.push({
        item,
        source: 'noSound',
        id: '',
        what: 'The video has no sound',
        verdict: 'No sound',
        tone: 'partial',
        finding: 'It has no audio track, so it was reviewed on what it shows: the pictures and on-screen text. Learners get no narration.',
        fix: NO_SOUND_FIX,
        place: {},
      })
    }
    // The answer key's spread, counted by the service (e.g. "the correct answer is the longest
    // option in 8 of 8 questions"): a pattern a learner can guess from, whatever each question says.
    ;(r?.answerPattern || []).forEach(p =>
      out.push({
        item,
        source: 'answerKey',
        id: '',
        what: 'The pattern of the correct answers',
        verdict: 'Needs attention',
        tone: 'issue',
        finding: p,
        fix: ANSWER_KEY_FIX,
        place: {},
      }),
    )
    const a = r?.addie && !isPassError(r.addie) ? r.addie : null
    a?.score.areas.forEach(area =>
      area.items
        .filter(i => i.verdict === 'no')
        .forEach(i =>
          out.push({
            item,
            source: 'checklist',
            id: i.id,
            what: i.text,
            verdict: 'Not met',
            tone: 'no',
            finding: i.note,
            fix: i.fix || '',
            place: { at: i.at, atSec: i.atSec, page: i.page },
            ...(i.borderline ? { borderline: true } : {}),
            ...(i.check ? { check: i.check } : {}),
          }),
        ),
    )
    const d = r?.domain && !isPassError(r.domain) ? r.domain : null
    d?.score.areas.forEach(area =>
      area.items
        .filter(i => i.verdict === 'no')
        .forEach(i =>
          out.push({
            item,
            source: 'domain',
            id: i.id,
            what: i.text,
            verdict: 'Not met',
            tone: 'no',
            finding: i.note,
            fix: i.fix || '',
            place: { at: i.at, atSec: i.atSec, page: i.page },
            ...(i.borderline ? { borderline: true } : {}),
            ...(i.check ? { check: i.check } : {}),
          }),
        ),
    )
    d?.coverage
      .filter(c => c.status !== 'covered')
      .forEach(c =>
        out.push({
          item,
          source: 'coverage',
          id: '',
          what: c.component,
          verdict: c.status === 'missing' ? 'Missing' : 'Partial',
          tone: c.status === 'missing' ? 'missing' : 'partial',
          finding: c.evidence,
          fix: '',
          place: locateText(c.evidence || ''),
        }),
      )
    ;(r?.questions || [])
      .filter(q => q.verdict === 'issue')
      .forEach(q =>
        out.push({
          item,
          source: 'question',
          id: `Q${q.n}`,
          what: q.question,
          verdict: 'Needs attention',
          tone: 'issue',
          finding: q.issues.join('\n'),
          fix: q.fix || '',
          place: {},
          ...(q.borderline ? { borderline: true } : {}),
          ...(q.check ? { check: q.check } : {}),
        }),
      )
    const al = r?.alignment && !isPassError(r.alignment) ? r.alignment : null
    if (al && al.verdict !== 'aligned') {
      out.push({
        item,
        source: 'alignment',
        id: '',
        what: 'Fits the course name and description',
        verdict: FIT[al.verdict] || al.verdict,
        tone: 'partial',
        finding: al.note,
        fix: al.fix || '',
        place: locateText(al.note || ''),
      })
    }
    for (const [label, pass] of [
      ['CBP checklist', r?.addie],
      ['Domain review', r?.domain],
      ['Course alignment', r?.alignment],
    ] as const) {
      if (pass && isPassError(pass)) {
        out.push({
          item,
          source: 'failed',
          id: '',
          what: `${label} could not run`,
          verdict: 'Could not be reviewed',
          tone: 'issue',
          finding: pass.error,
          fix: 'Start the review again.',
          place: {},
        })
      }
    }
    if (r?.questionsError) {
      out.push({
        item,
        source: 'failed',
        id: '',
        what: 'Question check could not run',
        verdict: 'Could not be reviewed',
        tone: 'issue',
        finding: r.questionsError,
        fix: 'Start the review again.',
        place: {},
      })
    }
  }
  return out
}
