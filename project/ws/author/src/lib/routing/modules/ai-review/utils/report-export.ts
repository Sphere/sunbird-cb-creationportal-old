import { NO_SOUND_FIX } from './issues'
import type * as Xlsx from 'xlsx'
import {
  IAiReview,
  IAiReviewAddie,
  IAiReviewAlignment,
  IAiReviewCompetencyContext,
  IAiReviewDomain,
  IAiReviewHtmlPackage,
  IAiReviewItem,
  IAiReviewPassError,
  isPassError,
} from '../models/ai-review.model'
import { formatDuration, kindLine, kindMeta } from './resource-kind'
import { placeLabel } from './report-detail'
import { checklistTotalOf, coverageCountsOf, FixGroup, fixGroupsOf, inShortOf, scoreNote, scoreRowsOf } from './report-summary'
import { costBreakdown, providerLabel, stepLabel, tokensLabel, usd } from './usage'

/**
 * The two report downloads, built from the review's data:
 *
 *  - PDF: a print-ready document opened in a new tab, which the browser saves with
 *    "Save as PDF". The browser renders it, so Hindi and every other script come out right,
 *    which a JS PDF library could only do by embedding font files.
 *  - Excel: one sheet each for the summary, every checklist verdict, coverage and the
 *    quiz/assessment question findings, for reviewers who track fixes in a spreadsheet.
 *
 * Every value from the review (course and resource names, all AI text) is escaped before
 * it is placed in the document, so nothing in a review can become markup.
 */

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/**
 * "Level 3 · Proficient", or a label that already names the levels ("Levels 1, 2", "As mapped
 * on the course"). The dictionary's level label is a name, so on its own it drops the number.
 */
export function levelText(c: Pick<IAiReviewCompetencyContext, 'level' | 'levelLabel'>): string {
  const label = String(c.levelLabel || '').trim()
  if (/^(levels?\b|as mapped)/i.test(label)) {
    return label
  }
  return label ? `Level ${c.level} · ${label}` : `Level ${c.level}`
}

/** What a review was judged against, as one line; '' when it had no domain review. */
export function judgedAgainst(options: IAiReview['options'] | null | undefined): string {
  if (!options) {
    return ''
  }
  const c = options.competency
  if (options.levelMode === 'perResource') {
    const byLevel = Object.values(options.levels || {}).sort((a, b) => a.level - b.level)
    const name = (c || byLevel[0])?.label || ''
    const which = byLevel.length ? ` (Levels ${byLevel.map(l => l.level).join(', ')})` : ''
    return `${name ? name + ' · ' : ''}Each part at its own level${which}${c ? `; parts without one at ${levelText(c)}` : ''}`
  }
  return c ? `${c.label} · ${levelText(c)}` : ''
}

/**
 * The FRAC role checked, as one line: "ANM: 3 FRAC activities need the competency judged:
 * …", or why the role was not checked; '' outside the FRAC style.
 */
export function roleSummary(options: IAiReview['options'] | null | undefined): string {
  if (!options || options.domainStyle !== 'frac' || !options.domain) {
    return ''
  }
  const role = options.role
  if (role && role.activities.length) {
    const n = role.activities.length
    return `${role.positionName}: ${n === 1 ? '1 FRAC activity needs' : `${n} FRAC activities need`} the competency judged: ${role.activities.map(a => a.activity).join('; ')}`
  }
  return options.roleNote || ''
}

export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ESCAPES[c])
}

const addieOf = (item: IAiReviewItem): IAiReviewAddie | null =>
  item.result && item.result.addie && !isPassError(item.result.addie) ? item.result.addie : null
const domainOf = (item: IAiReviewItem): IAiReviewDomain | null =>
  item.result && item.result.domain && !isPassError(item.result.domain) ? item.result.domain : null

const VERDICT: Record<string, string> = { yes: 'Met', no: 'Not met', na: 'N/A' }
const FIT: Record<string, string> = {
  aligned: 'Fits the course',
  partial: 'Partly fits the course',
  off_topic: 'Off topic for this course',
}
const DELIVERS: Record<string, string> = {
  delivers: 'Delivers what its description promises',
  partly: 'Partly delivers what its description promises',
  does_not: 'Does not deliver what its description promises',
}

/** The course-level alignment verdict, for the PDF; '' when it was not asked for. */
function alignmentHtml(review: IAiReview): string {
  const a = review.result?.alignment
  if (!a) {
    return ''
  }
  if (isPassError(a)) {
    return `<h2>Does it deliver what the course says?</h2><p class="err">The course alignment check could not run: ${esc(a.error)}</p>`
  }
  const promises = a.promises.length
    ? `<table><thead><tr><th>What the description promises</th><th>Status</th><th>Delivered by</th></tr></thead><tbody>${a.promises
        .map(pr => `<tr><td>${esc(pr.promise)}</td><td>${statusPill(pr.status)}</td><td>${esc(pr.coveredBy.join(', ') || '—')}</td></tr>`)
        .join('')}</tbody></table>`
    : ''
  const offTopic = a.offTopic.length
    ? `<h4>Off topic for this course</h4><ul>${a.offTopic.map(o => `<li><b>${esc(o.name)}</b> — ${esc(o.why)}</li>`).join('')}</ul>`
    : ''
  const fixes = a.fixes.length ? `<h4>What to change</h4><ul>${a.fixes.map(f => `<li class="fix">${esc(f)}</li>`).join('')}</ul>` : ''
  return `<h2>Does it deliver what the course says?</h2><div class="align"><p class="verdict ${esc(a.verdict)}"><b>${esc(DELIVERS[a.verdict] || a.verdict)}.</b> ${esc(
    a.summary,
  )}</p>${a.nameNote ? `<p>Name: <b>${a.nameFits ? 'fits' : 'does not fit'}</b> — ${esc(a.nameNote)}</p>` : ''}${promises}${offTopic}${fixes}</div>`
}
/** The videos with no sound, reviewed on what they show, and what to do: near the top, where it is seen. */
function noSoundHtml(review: IAiReview): string {
  const silent = (review.items || []).filter(i => i.result?.noSound)
  if (!silent.length) {
    return ''
  }
  const one = silent.length === 1
  return `<div class="nosound"><b>${one ? '1 video has' : `${silent.length} videos have`} no sound.</b><p>${
    one ? 'It was' : 'They were'
  } reviewed on what ${one ? 'it shows' : 'they show'}: the pictures and on-screen text. ${esc(NO_SOUND_FIX)}</p><ul>${silent
    .map(i => `<li>${esc(i.name)}</li>`)
    .join('')}</ul></div>`
}

const COVERAGE_LABEL: Record<string, string> = { covered: 'Covered', partial: 'Partial', missing: 'Missing' }
/** A coverage status as a small coloured pill. */
const statusPill = (status: string) => `<span class="st ${esc(status)}">${esc(COVERAGE_LABEL[status] || status)}</span>`

/** The words a report uses: a course and its resources, or the user's own uploaded files. */
export interface ReportWords {
  /** The hero's eyebrow. */
  eyebrow: string
  /** The summary heading. */
  summary: string
  /** What the review is named by: "Course", or "Review" for uploaded files. */
  nameLabel: string
  one: string
  many: string
  /** "Resources" / "Files", for a heading or a column. */
  Many: string
  /** "Resource" / "File", for a column. */
  One: string
  footer: string
}

export function reportWords(review: Pick<IAiReview, 'source'>): ReportWords {
  return review.source === 'upload'
    ? {
        eyebrow: 'AI File Review · advisory',
        summary: 'Summary',
        nameLabel: 'Review',
        one: 'file',
        many: 'files',
        Many: 'Files',
        One: 'File',
        footer: 'Advisory AI review of uploaded files — it changes nothing in CBP.',
      }
    : {
        eyebrow: 'AI Course Review · advisory',
        summary: 'Course summary',
        nameLabel: 'Course',
        one: 'resource',
        many: 'resources',
        Many: 'Resources',
        One: 'Resource',
        footer: 'Advisory AI review — it does not change the course or its review.',
      }
}

/** A safe file name from the course name. */
export function reportFileName(review: Pick<IAiReview, 'courseName'>, ext: string): string {
  // \p{M} keeps the vowel signs and virama of Devanagari and other scripts: without it "नमस्ते" lost them.
  const base =
    (review.courseName || 'review')
      .replace(/[^\p{L}\p{M}\p{N}._-]+/gu, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'review'
  return `AI-review-${base}.${ext}`
}

/**
 * What an interactive HTML package holds and whether it reports to the platform, as one line:
 * "4 pages · 1 video (1 min 30 s) · 3 images · 30 questions. Reports learner progress: no
 * (completion is not recorded). Saves where the learner left off: yes."
 */
export function packageLine(p: IAiReviewHtmlPackage, durationSec?: number | null): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const holds = [
    plural(p.pages, 'page', 'pages'),
    p.videos.length ? `${plural(p.videos.length, 'video', 'videos')}${durationSec ? ` (${formatDuration(durationSec)})` : ''}` : '',
    p.images ? plural(p.images, 'image', 'images') : '',
    p.questions ? plural(p.questions, 'question', 'questions') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return `${holds}. Reports learner progress: ${p.reportsProgress ? 'yes' : 'no (completion is not recorded)'}. Saves where the learner left off: ${
    p.savesState ? 'yes' : 'no'
  }.`
}

/** One resource's "To fix" list: each finding once, grouped, as on the report screen. */
/**
 * What the report must say about how a video was taken in, when not all of it was: speech that
 * could not be transcribed, a watch pass that failed, or no one speaking. Shared by the screen,
 * the PDF and the workbook.
 */
export function mediaNotes(item: Pick<IAiReviewItem, 'result'>): { tone: 'error' | 'info'; text: string }[] {
  const r = item.result
  const out: { tone: 'error' | 'info'; text: string }[] = []
  if (r?.transcriptError) {
    out.push({ tone: 'error', text: `The speech could not be transcribed (${r.transcriptError}), so the narration was not reviewed.` })
  }
  if (r?.watchError) {
    out.push({ tone: 'error', text: `Watching the video failed (${r.watchError}): it was reviewed from its frames and transcript only.` })
  }
  if (r?.noSpeech) {
    out.push({ tone: 'info', text: 'No one speaks in this video, so it was reviewed on what it shows.' })
  }
  return out
}

const DEMAND: Record<string, string> = { recall: 'Recall a fact', apply: 'Apply it' }

/** How many questions only ask to recall a fact, as one line; '' when the check did not say. */
export function recallLine(item: Pick<IAiReviewItem, 'result'>): string {
  const qs = item.result?.questions || []
  const rated = qs.filter(q => q.demand)
  if (!rated.length) {
    return ''
  }
  const recall = rated.filter(q => q.demand === 'recall').length
  const apply = rated.length - recall
  return `${recall} of ${rated.length} questions only ask the learner to recall a fact; ${apply} ${apply === 1 ? 'asks' : 'ask'} them to apply it.`
}

/** Whether one of the resource's checks ran and failed (so "nothing to fix" would mislead). */
function passFailed(item: IAiReviewItem): boolean {
  const r = item.result
  return (
    !!r &&
    (isPassError(r.addie) ||
      isPassError(r.domain) ||
      isPassError(r.alignment) ||
      !!r.questionsError ||
      !!r.transcriptError ||
      !!r.watchError)
  )
}

function fixListHtml(item: IAiReviewItem, groups: FixGroup[]): string {
  const n = groups.reduce((k, g) => k + g.issues.length, 0)
  const body = groups
    .map(g => {
      const qs = item.result?.questions
      const count = g.source === 'question' && qs ? `${g.issues.length} of ${qs.length}` : `${g.issues.length}`
      return `<p class="fixgrp">${esc(g.label)} <span class="muted">· ${esc(count)}</span></p><ul class="items">${g.issues
        .map(
          x =>
            `<li>${x.id ? `<b>${esc(x.id)}</b> ` : ''}${esc(x.what)}${x.borderline ? ' <span class="chip amber">Borderline</span>' : ''}${
              placeLabel(x.place) ? ` <span class="at">${esc(placeLabel(x.place))}</span>` : ''
            }${x.finding ? `<br><span class="note">${esc(x.finding).replace(/\n/g, '; ')}</span>` : ''}${
              x.check ? `<br><span class="check">Check by hand: ${esc(x.check)}</span>` : ''
            }${x.fix ? `<br><span class="fix">Fix: ${esc(x.fix)}</span>` : ''}</li>`,
        )
        .join('')}</ul>`
    })
    .join('')
  const allOk = !!item.result?.questions?.length && !item.result.questions.some(q => q.verdict === 'issue')
  return `<h4 class="tofix">To fix <span class="n${n ? '' : ' none'}">${n}</span></h4>${body || (passFailed(item) ? '<p class="check">No issues from the checks that ran. Some checks could not run, so this resource is not fully reviewed.</p>' : '<p class="ok">Nothing to fix here.</p>')}${
    allOk ? '<p class="ok">Every question checks out: answer keys, options and hints.</p>' : ''
  }${recallLine(item) ? `<p class="muted">${esc(recallLine(item))}</p>` : ''}`
}

const LEVEL_FIT: Record<string, string> = {
  fits: 'Pitched at the right level',
  below: 'Pitched below the level',
  above: 'Pitched above the level',
  mixed: 'Pitched at mixed levels',
}

function resourceHtml(item: IAiReviewItem, words: ReportWords, groups: FixGroup[]): string {
  const addie = addieOf(item)
  const domain = domainOf(item)
  const r = item.result
  const parts: string[] = []
  const chips = [
    addie
      ? `<span class="chip ${esc(addie.score.band || '')}">CBP ${esc(addie.score.yes)}/${esc(addie.score.applicable)} · ${esc(addie.score.scorePct ?? '—')}%</span>`
      : '',
    domain ? `<span class="chip violet">Domain ${esc(domain.score.yes)}/${esc(domain.score.applicable)}</span>` : '',
  ].join('')
  parts.push(
    `<section class="resource"><div class="rhead"><div class="rtitle"><div class="kind">${esc(kindLine(item.kind, item.mimeType))}</div><h3>${esc(item.name)}</h3></div><div class="chips">${chips}</div></div>`,
  )
  if (r?.htmlPackage) {
    parts.push(`<p class="pkg${r.htmlPackage.reportsProgress ? '' : ' warn'}">${esc(packageLine(r.htmlPackage, r.durationSec))}</p>`)
  }
  if (item.status === 'failed' || item.status === 'cancelled') {
    parts.push(`<p class="err">${esc(item.error || `This ${words.one} could not be reviewed.`)}</p>`)
  }
  if (r?.cached) {
    parts.push(
      `<p class="muted">Unchanged since ${r.cachedAt ? 'its review on ' + esc(new Date(r.cachedAt).toLocaleDateString()) : 'an earlier review'}: that result is shown again.</p>`,
    )
  }
  // What the reviewers found, in their words.
  const found: string[] = []
  if (domain?.summary) {
    found.push(`<p class="found"><span class="lbl">Subject expert</span><span>${esc(domain.summary)}</span></p>`)
  }
  if (domain?.levelFit) {
    found.push(
      `<p class="levelfit ${esc(domain.levelFit.verdict)}"><b>${esc(LEVEL_FIT[domain.levelFit.verdict] || domain.levelFit.verdict)}</b>${
        domain.levelFit.bestFitLevel ? ` · best fits Level ${esc(domain.levelFit.bestFitLevel)}` : ''
      }${domain.levelFit.rationale ? ` — ${esc(domain.levelFit.rationale)}` : ''}</p>`,
    )
  }
  if (addie?.summary) {
    found.push(`<p class="found"><span class="lbl">CBP checklist</span><span>${esc(addie.summary)}</span></p>`)
  }
  if (found.length) {
    parts.push(`<div class="foundbox">${found.join('')}</div>`)
  }
  if (r?.alignment && !isPassError(r.alignment)) {
    const al = r.alignment
    parts.push(
      `<p class="fit ${esc(al.verdict)}"><b>${esc(FIT[al.verdict] || al.verdict)}</b>${al.note ? ` — ${esc(al.note)}` : ''}${
        al.teaches.length ? `<br><span class="muted">Teaches: ${esc(al.teaches.join(' · '))}</span>` : ''
      }${al.fix ? `<br><span class="fix">→ ${esc(al.fix)}</span>` : ''}</p>`,
    )
  }
  for (const [label, pass] of [
    ['Domain review', r?.domain],
    ['The course alignment check', r?.alignment],
    ['Checklist', r?.addie],
  ] as const) {
    if (pass && isPassError(pass)) {
      parts.push(`<p class="err">${label} could not run: ${esc(pass.error)}</p>`)
    }
  }
  if (r?.questionsError) {
    parts.push(`<p class="err">Question check could not run: ${esc(r.questionsError)}</p>`)
  }
  for (const line of mediaNotes(item)) {
    parts.push(`<p class="${line.tone === 'error' ? 'err' : 'check'}">${esc(line.text)}</p>`)
  }
  if (addie) {
    parts.push(
      `<p class="areas">${addie.score.areas
        .filter(a => a.applicable)
        .map(a => `<span>${esc(a.area)} <b>${esc(a.yes)}/${esc(a.applicable)}</b></span>`)
        .join('')}</p>`,
    )
  }
  if (item.status === 'done') {
    parts.push(fixListHtml(item, groups))
  }
  parts.push('</section>')
  return parts.join('')
}

/** Every AI call the review made, by resource, provider and step; '' when only totals are sent. */
function costsHtml(review: IAiReview): string {
  const c = costBreakdown(review)
  if (!c) {
    return ''
  }
  const totals = [
    `<div class="card"><div class="lbl">Total</div><div class="big">${esc(usd(c.totalUsd))}</div><div class="muted">estimate ${esc(usd(Number(review.estimateUsd) || 0))}</div></div>`,
    ...c.byProvider.map(
      p =>
        `<div class="card ${esc(p.provider)}"><div class="lbl">${esc(p.label)}</div><div class="big">${esc(usd(p.costUsd))}</div><div class="muted">${p.calls} calls</div></div>`,
    ),
  ].join('')
  const rows = c.groups
    .map(
      g =>
        `<tr class="grp"><td colspan="4">${esc(g.name)}</td><td class="num">${g.reused ? 'reused · $0' : esc(usd(g.totalUsd))}</td></tr>` +
        g.lines
          .map(
            l =>
              `<tr><td>${esc(stepLabel(l.step))}</td><td>${esc(providerLabel(l.provider))} <span class="muted">${esc(l.model)}</span></td><td class="num">${l.calls}</td><td class="muted">${esc(
                tokensLabel(l),
              )}</td><td class="num">${esc(usd(l.costUsd))}</td></tr>`,
          )
          .join(''),
    )
    .join('')
  return `<h2>Cost breakdown</h2><p class="muted intro">Every AI call this review made, as the providers bill it.</p><div class="cards">${totals}</div><table class="costs"><colgroup><col style="width:34%"><col style="width:30%"><col style="width:8%"><col style="width:16%"><col style="width:12%"></colgroup><thead><tr><th>Step</th><th>Provider · model</th><th class="num">Calls</th><th>Tokens</th><th class="num">Cost</th></tr></thead><tbody>${rows}</tbody></table>`
}

/** The whole report as a self-contained, print-ready HTML document. */
export function buildReportHtml(review: IAiReview, generatedAt: Date = new Date()): string {
  const s = review.result
  const words = reportWords(review)
  const c = review.options && review.options.competency
  const groups = fixGroupsOf(review, words.one)
  const rows = scoreRowsOf(review, groups)
  const totalFixes = rows.reduce((n, r) => n + r.fixes, 0)
  const total = checklistTotalOf(review)
  const cc = coverageCountsOf(review)
  const inShort = inShortOf(review, words, totalFixes)
  const cols = 1 + (s?.addie ? 1 : 0) + (s?.domain ? 1 : 0) + 1
  const pct = (band: string, v: number | null) => ` <span class="chip ${esc(band)}">${esc(v ?? '—')}%</span>`
  const scoreTable =
    s && rows.length
      ? `<h2>Score by ${words.one}</h2><table class="scores"><colgroup><col style="width:${s.addie && s.domain ? 46 : 60}%">${
          s.addie ? '<col style="width:24%">' : ''
        }${s.domain ? '<col style="width:16%">' : ''}<col style="width:14%"></colgroup><thead><tr><th>${words.One}</th>${
          s.addie ? '<th class="num">CBP checklist</th>' : ''
        }${s.domain ? '<th class="num">Domain checks</th>' : ''}<th class="num">To fix</th></tr></thead><tbody>${rows
          .map(
            r =>
              `<tr><td>${esc(r.item.name)}</td>${
                r.failed
                  ? `<td class="num muted" colspan="${cols - 1}">Could not be reviewed</td>`
                  : `${
                      s.addie
                        ? `<td class="num">${r.addie ? `<b>${esc(r.addie.yes)}</b> of ${esc(r.addie.applicable)}${pct(r.addie.band, r.addie.pct)}` : r.addieFailed ? '<span class="err">Could not score</span>' : '—'}</td>`
                        : ''
                    }${s.domain ? `<td class="num">${r.domain ? `<b>${esc(r.domain.yes)}</b> of ${esc(r.domain.applicable)}` : r.domainFailed ? '<span class="err">Could not score</span>' : '—'}</td>` : ''}<td class="num">${
                      r.fixes ? `<span class="chip red">${esc(r.fixes)}</span>` : '0'
                    }</td>`
              }</tr>`,
          )
          .join('')}</tbody><tfoot><tr><td><b>Total</b></td>${
          s.addie
            ? `<td class="num"><b>${esc(s.addie.yes)}</b> of ${esc(s.addie.applicable)}${pct(s.addie.band || '', s.addie.scorePct)}</td>`
            : ''
        }${s.domain ? `<td class="num"><b>${esc(s.domain.yes)}</b> of ${esc(s.domain.applicable)}</td>` : ''}<td class="num"><b>${esc(
          totalFixes,
        )}</b></td></tr></tfoot></table>${s.addie && total ? `<p class="muted intro note-under">${esc(scoreNote(total, words.one))}</p>` : ''}`
      : ''
  const summary = s
    ? `${inShort.length ? `<ul class="inshort">${inShort.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}<div class="cards">${
        s.addie
          ? `<div class="card"><div class="lbl">CBP / ADDIE checklist</div><div class="big">${esc(s.addie.scorePct ?? '—')}%</div><div>${esc(s.addie.yes)} of ${esc(
              s.addie.applicable,
            )} checks met</div>${
              total
                ? `<div class="muted">${esc(total)}-point checklist, added up over ${esc(s.reviewed)} ${s.reviewed === 1 ? words.one : words.many}</div>`
                : ''
            }${s.verdict ? '' : `<div class="muted">${esc(s.addie.bandMessage || '')}</div>`}</div>`
          : ''
      }${
        s.domain
          ? `<div class="card violet"><div class="lbl">Domain review</div><div class="big">${esc(s.domain.yes)}/${esc(s.domain.applicable)}</div><div>${esc(
              judgedAgainst(review.options),
            )}</div><div class="muted">${esc(s.domain.yes)} of ${esc(s.domain.applicable)} domain checks met (by a subject expert), added up over the ${words.many}</div>${
              roleSummary(review.options) ? `<div class="muted">${esc(roleSummary(review.options))}</div>` : ''
            }</div>`
          : ''
      }</div>${noSoundHtml(review)}${scoreTable}${
        s.skipped.length
          ? `<h4>Left out of the review (${esc(s.skipped.length)})</h4><ul class="plain">${s.skipped
              .map(k => `<li>${esc(k.name)} <span class="muted">— ${esc(k.reason)}</span></li>`)
              .join('')}</ul>`
          : ''
      }${
        s.coverage.length
          ? `<h2>Is the competency level taught?</h2><p class="muted intro">The subject expert split ${
              judgedAgainst(review.options) ? `<b>${esc(judgedAgainst(review.options))}</b>` : 'the competency level'
            } into the things a learner must know or do, and marked each by whether the ${words.many} teach it: covered, partly or missing.${
              cc ? ` ${cc.covered} covered · ${cc.partial} partly · ${cc.missing} missing.` : ''
            }</p><table><thead><tr><th>What the level needs</th><th style="width:90px">Status</th><th>Covered by</th></tr></thead><tbody>${s.coverage
              .map(
                row =>
                  `<tr><td>${esc(row.component)}</td><td>${statusPill(row.status)}</td><td>${esc(
                    row.coveredBy.join(', ') || '—',
                  )}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : ''
      }${alignmentHtml(review)}`
    : ''
  const resources = review.items
    .filter(i => i.status !== 'skipped')
    .map(i => resourceHtml(i, words, groups.get(i.contentId) || []))
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(reportFileName(review, 'pdf').replace(/\.pdf$/, ''))}</title><style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,'Noto Sans','Noto Sans Devanagari','Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;font-size:12px;line-height:1.55;margin:0;padding:24px;background:#fff}
h1,h2,h3,h4,p,ul,ol,table{font-family:inherit;margin:0;padding:0}
h1,h2,h3,h4{font-weight:700;line-height:1.3;color:#0f172a;letter-spacing:0}
.hero{position:relative;overflow:hidden;border-radius:18px;padding:20px 24px;color:#0f172a;border:1px solid #e2e8f0;background:radial-gradient(40% 120% at 70% 0%,rgba(79,70,229,.16),transparent 70%),radial-gradient(38% 110% at 30% 0%,rgba(6,182,212,.13),transparent 70%),radial-gradient(30% 90% at 95% 10%,rgba(236,72,153,.10),transparent 70%),#fff}
.hero::before{content:'';position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(135deg,#2f45d6,#2f7aef)}
.hero .eyebrow{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1e3fae}
.hero h1{margin:6px 0 4px;font-size:20px;letter-spacing:0;color:#0f172a}.hero p{color:#475569;font-size:11.5px}
h2{font-size:14px;margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
h3{font-size:14px;margin:2px 0 0}
h4{font-size:12px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
p{margin:0 0 8px}.intro{margin:-4px 0 10px;font-size:11px}
.cards{display:flex;gap:10px;margin-top:14px}.card{flex:1;min-width:0;border:1px solid #e2e8f0;border-radius:12px;padding:12px 12px 10px;background:linear-gradient(#2f5fe8,#2f5fe8) left top/100% 3px no-repeat,#fff}
.card.gemini{background:linear-gradient(#0e7490,#0e7490) left top/100% 3px no-repeat,#fff}.card.anthropic{background:linear-gradient(#7c3aed,#7c3aed) left top/100% 3px no-repeat,#fff}.card.elevenlabs{background:linear-gradient(#b45309,#b45309) left top/100% 3px no-repeat,#fff}
.lbl{font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;font-weight:700}.big{font-size:22px;font-weight:700;line-height:1.25;margin:2px 0}
.muted,i{color:#64748b}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11.5px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}
th{font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;background:#f4f7fc}
td.num,th.num{text-align:right;white-space:nowrap}
.costs tr.grp td{background:#f4f7fc;font-weight:700}
.st{display:inline-block;height:18px;line-height:18px;padding:0 9px;border-radius:9px;font-size:10px;font-weight:700;white-space:nowrap;vertical-align:top}
.st.covered{background:#dcfce7;color:#15803d}.st.partial{background:#ffedd5;color:#b45309}.st.missing{background:#fee2e2;color:#b91c1c}
.items{list-style:none}.items li{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px 8px 14px;margin-bottom:6px;background:linear-gradient(#b91c1c,#b91c1c) left top/4px 100% no-repeat,#fff}
.inshort{margin:14px 0 0;padding:10px 14px 10px 30px;border-radius:10px;background:#f4f7fc;font-size:12.5px;line-height:1.6}.inshort li+li{margin-top:2px}
.card.violet{background:linear-gradient(#7c3aed,#7c3aed) left top/100% 3px no-repeat,#fff}
.scores tfoot td{background:#f4f7fc;border-top:2px solid #e2e8f0;border-bottom:0}.scores .chip{margin-left:6px;height:18px;line-height:18px}.note-under{margin:6px 0 0}
.plain{margin:0 0 0 18px}
.foundbox{margin:10px 0 0}.found{display:flex;gap:12px}.found .lbl{flex:none;width:96px;padding-top:2px}.found span:last-child{flex:1;min-width:0}
.levelfit{padding:6px 10px;border-radius:8px;background:#f5f3ff;font-size:11.5px}.levelfit.fits{color:#15803d}.levelfit.below,.levelfit.above,.levelfit.mixed{color:#b45309}
.areas{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}.areas span{padding:3px 9px;border-radius:8px;background:#f4f7fc;font-size:11px;color:#64748b}.areas b{color:#0f172a}
.tofix{display:flex;align-items:center;gap:6px}.tofix .n{display:inline-block;height:18px;line-height:18px;padding:0 8px;border-radius:9px;background:#b91c1c;color:#fff;font-size:10px;letter-spacing:0}.tofix .n.none{background:#15803d}
.check{color:#8f6206}
.fixgrp{margin:10px 0 6px;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#64748b}.ok{color:#15803d}
.at{display:inline-block;height:16px;line-height:16px;padding:0 6px;border-radius:8px;background:#f5f3ff;color:#7c3aed;font-size:10px;font-weight:700;vertical-align:top}
.note{color:#64748b}.fix{color:#15803d;font-weight:500}.note,.fix,.found span:last-child,.check{white-space:pre-line}.err{color:#b91c1c}
.resource{border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-top:14px;page-break-inside:avoid}
.rhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
.rtitle{flex:1;min-width:0}.chips{flex:none;display:flex;gap:4px;padding-top:2px}
.kind{font-size:9.5px;line-height:1.4;text-transform:uppercase;letter-spacing:.08em;color:#7c3aed;font-weight:700;margin-bottom:2px}
.chip{display:inline-block;height:20px;line-height:20px;border-radius:10px;padding:0 9px;font-size:10.5px;font-weight:700;white-space:nowrap;background:#e8efff;color:#2f5fe8}.chip.green{background:#dcfce7;color:#15803d}.chip.amber{background:#ffedd5;color:#b45309}.chip.red{background:#fee2e2;color:#b91c1c}.chip.violet{background:#f5f3ff;color:#7c3aed}
.align{background:#f5f3ff;border-radius:10px;padding:10px 14px}.verdict.delivers{color:#15803d}.verdict.partly{color:#b45309}.verdict.does_not{color:#b91c1c}
.fit{margin:8px 0 0;padding:6px 10px 6px 14px;border-radius:8px;background:linear-gradient(#b45309,#b45309) left top/4px 100% no-repeat,#fafafa}.fit.aligned{background:linear-gradient(#15803d,#15803d) left top/4px 100% no-repeat,#fafafa}.fit.off_topic{background:linear-gradient(#b91c1c,#b91c1c) left top/4px 100% no-repeat,#fafafa}
.nosound{margin:14px 0 0;padding:12px 16px 10px 18px;border-radius:10px;color:#7c2d12;background:linear-gradient(#ea580c,#ea580c) left top/4px 100% no-repeat,#fff7ed}.nosound p{margin:4px 0 4px}.nosound ul{margin:0 0 0 18px;padding:0}
.pkg{margin:8px 0 0;padding:6px 10px;border-radius:8px;background:#f4f7fc;font-size:11px}.pkg.warn{color:#b45309}
.domain{background:#f5f3ff;border-radius:10px;padding:10px 14px;margin-top:10px}.domain h4{margin-top:0;color:#7c3aed}
.cov{list-style:none;margin-top:6px}.cov li{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-top:1px solid rgba(124,58,237,.12)}
.cov .st{flex:none;width:62px;text-align:center;margin-top:1px}.cov-text{flex:1;min-width:0}.cov-text b{font-weight:600}.cov-text .muted{display:block;font-size:11px}
footer{margin-top:22px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;text-align:center}
@media print{body{padding:0}}
</style></head><body>
<div class="hero"><div class="eyebrow">${esc(words.eyebrow)}</div><h1>${esc(review.courseName)}</h1><p>Started by ${esc(review.requestedBy.name || 'a user')} · ${esc(
    new Date(review.createdAt).toLocaleString(),
  )}</p></div>
${summary}${resources ? `<h2>Each ${words.one}</h2>` + resources : ''}${costsHtml(review)}
<footer>${esc(words.footer)} Generated ${esc(generatedAt.toLocaleString())}.</footer>
</body></html>`
}

/**
 * The report as a web page to read on screen: the same content as the PDF, set larger on a
 * centred sheet that reflows on a phone, and prints cleanly. Opened in a new tab and saved as
 * the HTML download.
 */
export function buildReportPage(review: IAiReview, generatedAt: Date = new Date()): string {
  return buildReportHtml(review, generatedAt)
    .replace(
      '<meta charset="utf-8">',
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">',
    )
    .replace('</style>', `${WEB_CSS}</style>`)
    .replace('<body>', '<body class="web"><main class="page">')
    .replace('</body>', '</main></body>')
}

const WEB_CSS = `
body.web{font-size:14.5px;line-height:1.6;padding:40px 16px 56px;background:#eef1f7}
.web .page{max-width:1040px;margin:0 auto;padding:32px 40px 24px;background:#fff;border-radius:18px;box-shadow:0 24px 60px -28px rgba(15,23,42,.35)}
.web .hero{padding:28px 32px;border-radius:16px}.web .hero h1{font-size:28px;margin:8px 0 6px}.web .hero p{font-size:14px}.web .hero .eyebrow{font-size:11.5px}
.web h2{font-size:20px;margin:36px 0 14px;padding-bottom:8px}.web h3{font-size:17px}.web h4{font-size:12.5px;margin:18px 0 8px}
.web p{margin:0 0 10px}.web .intro{font-size:13.5px;margin:-6px 0 14px}
.web .cards{gap:16px;margin-top:20px}.web .card{padding:18px 18px 14px;border-radius:14px}.web .lbl{font-size:11px}.web .big{font-size:32px}
.web table{font-size:14px}.web th{font-size:11px;padding:10px 12px}.web td{padding:10px 12px}
.web tbody tr:hover td{background:#fafbff}
.web .st{height:24px;line-height:24px;padding:0 12px;border-radius:12px;font-size:12px}
.web .cov .st{width:84px}.web .cov li{padding:8px 0;gap:12px}.web .cov-text .muted{font-size:13px}
.web .chip{height:26px;line-height:26px;padding:0 12px;border-radius:13px;font-size:12.5px}.web .chips{gap:6px}
.web .kind{font-size:11px}
.web .at{height:20px;line-height:20px;padding:0 8px;border-radius:10px;font-size:12px}
.web .items li{padding:12px 14px 12px 18px;border-radius:10px;margin-bottom:8px}
.web .gap-head .count{height:22px;line-height:22px;padding:0 10px;border-radius:11px;font-size:12px}
.web .gap-src{margin:8px 0 0 34px;padding:8px 12px;border-radius:8px;font-size:13.5px}
.web .resource{padding:20px 24px;margin-top:18px;border-radius:14px}
.web .domain,.web .align{padding:14px 18px;border-radius:12px}
.web .fit,.web .pkg{padding:8px 12px 8px 16px;font-size:13.5px}
.web footer{margin-top:32px;padding-top:14px;font-size:12px}
@media (max-width:760px){
body.web{padding:0;font-size:14px}
.web .page{padding:16px;border-radius:0;box-shadow:none}
.web .hero{padding:20px;border-radius:12px}.web .hero h1{font-size:22px}
.web .cards,.web .rhead{flex-direction:column}
.web .resource{padding:16px}
.web .gap-src{margin-left:0}
.web table{table-layout:auto;display:block;overflow-x:auto}
}
@media print{body.web{padding:0;background:#fff;font-size:12px}.web .page{max-width:none;padding:0;border-radius:0;box-shadow:none}.web tbody tr:hover td{background:none}}
`

/**
 * Opens the report as a web page in a new tab. Returns false when the browser blocked the new
 * tab, so the page can say so.
 */
export function openReportTab(review: IAiReview, opener: Pick<Window, 'open'> = window): boolean {
  const win = opener.open('', '_blank')
  if (!win) {
    return false
  }
  win.document.open()
  win.document.write(buildReportPage(review))
  win.document.close()
  win.focus()
  return true
}

/**
 * The xlsx API from a dynamic `import('xlsx')`. xlsx is a CommonJS package: a production
 * build exposes its functions on the module, but the dev server's pre-bundling puts them only
 * on `default`, where `XLSX.utils` was undefined and the export failed.
 */
export function xlsxApi(mod: unknown): typeof Xlsx {
  const m = mod as (typeof Xlsx & { default?: typeof Xlsx }) | null
  if (m && m.utils) {
    return m
  }
  if (m && m.default && m.default.utils) {
    return m.default
  }
  throw new Error('The Excel library did not load.')
}

/** The rows of each Excel sheet. */
export function buildWorkbookSheets(review: IAiReview): Record<string, (string | number)[][]> {
  const s = review.result
  const c = review.options && review.options.competency
  const words = reportWords(review)
  const summary: (string | number)[][] = [
    [words.nameLabel, review.courseName],
    ['Started by', review.requestedBy.name || ''],
    ['Started at', new Date(review.createdAt).toLocaleString()],
    ['Status', review.status],
  ]
  if (s && s.addie) {
    summary.push(
      ['CBP checklist %', s.addie.scorePct ?? ''],
      ['CBP checks met', `${s.addie.yes} of ${s.addie.applicable} (added up over every ${words.one})`],
      [s.verdict ? 'Verdict' : 'Band', s.verdict?.message || s.addie.bandMessage || ''],
    )
  }
  if (s && s.domain) {
    summary.push(['Domain checks met', `${s.domain.yes} of ${s.domain.applicable}`])
  }
  if (c || review.options?.levelMode === 'perResource') {
    summary.push(['Judged against', judgedAgainst(review.options)])
  }
  if (roleSummary(review.options)) {
    summary.push(['FRAC role checked', roleSummary(review.options)])
  }
  if (s) {
    summary.push([`${words.Many} reviewed`, s.reviewed])
    if (s.failed) {
      summary.push(['Could not be reviewed', s.failed])
    }
    if (s.skipped.length) {
      summary.push(['Left out of the review', s.skipped.map(k => `${k.name} (${k.reason})`).join('; ')])
    }
  }
  const reused = review.items.filter(i => i.result?.cached)
  if (reused.length) {
    summary.push(['Unchanged, earlier result shown', reused.map(i => i.name).join('; ')])
  }

  const checklist: (string | number)[][] = [
    [words.one === 'file' ? 'File' : 'Resource', 'Type', 'Area', 'ID', 'Indicator', 'Verdict', 'Note', 'Suggested fix'],
  ]
  const questions: (string | number)[][] = [
    [words.one === 'file' ? 'File' : 'Resource', 'Q', 'Question', 'Verdict', 'Issues', 'Suggested fix', 'Asks the learner to'],
  ]
  review.items.forEach(item => {
    const addie = addieOf(item)
    if (addie) {
      addie.score.areas.forEach(area =>
        area.items.forEach(i =>
          checklist.push([
            item.name,
            kindMeta(item.kind).label,
            area.area,
            i.id,
            i.text,
            VERDICT[i.verdict] || i.verdict,
            i.note || '',
            i.fix || '',
          ]),
        ),
      )
    }
    ;(item.result?.questions || []).forEach(q =>
      questions.push([
        item.name,
        q.n,
        q.question,
        q.verdict === 'ok' ? 'OK' : 'Needs attention',
        q.issues.join('; '),
        q.fix || '',
        DEMAND[q.demand || ''] || '',
      ]),
    )
  })

  const packages: (string | number)[][] = [
    [
      words.one === 'file' ? 'File' : 'Resource',
      'Pages',
      'Videos',
      'Video time',
      'Images',
      'Questions',
      'Reports progress',
      'Saves the learner’s place',
    ],
  ]
  review.items.forEach(item => {
    const p = item.result?.htmlPackage
    if (p) {
      packages.push([
        item.name,
        p.pages,
        p.videos.length,
        item.result?.durationSec ? formatDuration(item.result.durationSec) : '',
        p.images,
        p.questions,
        p.reportsProgress ? 'Yes' : 'No — completion is not recorded',
        p.savesState ? 'Yes' : 'No',
      ])
    }
  })

  // One table with a real header row (it is frozen and filtered in the workbook): the course's
  // verdict, name, promises, off-topic resources and changes, then each resource's fit; a check
  // that could not run is a row of its own, with why.
  const alignment: (string | number)[][] = []
  const a = s?.alignment
  const fitRows = review.items
    .map(item => ({ item, al: item.result?.alignment }))
    .filter((x): x is { item: IAiReviewItem; al: IAiReviewAlignment | IAiReviewPassError } => !!x.al)
  if (a || fitRows.length) {
    alignment.push(['Part', 'What', 'Status', 'Detail', 'Suggested fix'])
  }
  if (a && isPassError(a)) {
    alignment.push(['Course', 'Alignment check', 'Could not run', a.error, ''])
  } else if (a && !isPassError(a)) {
    alignment.push(['Course', 'Verdict', DELIVERS[a.verdict] || a.verdict, a.summary, ''])
    alignment.push(['Course', 'Name', a.nameFits ? 'Fits' : 'Does not fit', a.nameNote || '', ''])
    a.promises.forEach(pr =>
      alignment.push([
        'Promise',
        pr.promise,
        COVERAGE_LABEL[pr.status] || pr.status,
        pr.coveredBy.length ? `Delivered by: ${pr.coveredBy.join(', ')}` : '',
        '',
      ]),
    )
    ;(a.offTopic || []).forEach(o => alignment.push(['Off topic', o.name, 'Off topic', o.why, '']))
    a.fixes.forEach(f => alignment.push(['What to change', '', '', '', f]))
  }
  fitRows.forEach(({ item, al }) =>
    alignment.push(
      isPassError(al)
        ? [words.One, item.name, 'Could not run', al.error, '']
        : [
            words.One,
            item.name,
            FIT[al.verdict] || al.verdict,
            [al.teaches.length ? `Teaches: ${al.teaches.join('; ')}` : '', al.note].filter(Boolean).join('\n'),
            al.fix || '',
          ],
    ),
  )

  const coverage: (string | number)[][] = [['What the level needs', 'Status', 'Covered by']]
  ;(s?.coverage || []).forEach(row => coverage.push([row.component, COVERAGE_LABEL[row.status] || row.status, row.coveredBy.join(', ')]))

  const sheets: Record<string, (string | number)[][]> = { Summary: summary, Checklist: checklist, Coverage: coverage }
  if (questions.length > 1) {
    sheets['Questions'] = questions
  }
  if (packages.length > 1) {
    sheets['HTML packages'] = packages
  }
  if (alignment.length > 1) {
    sheets['Course alignment'] = alignment
  }
  return sheets
}
