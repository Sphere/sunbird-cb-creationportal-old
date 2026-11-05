import type * as Xlsx from 'xlsx'
import {
  IAiReview,
  IAiReviewAddie,
  IAiReviewCompetencyContext,
  IAiReviewDomain,
  IAiReviewItem,
  isPassError,
} from '../models/ai-review.model'
import { kindLine, kindMeta } from './resource-kind'

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
const COVERAGE_MARK: Record<string, string> = { covered: '✓', partial: '◐', missing: '✗' }

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
        footer: 'Advisory AI review of uploaded files — it changes nothing in CBP.',
      }
    : {
        eyebrow: 'AI Course Review · advisory',
        summary: 'Course summary',
        nameLabel: 'Course',
        one: 'resource',
        many: 'resources',
        Many: 'Resources',
        footer: 'Advisory AI review — it does not change the course or its review.',
      }
}

/** A safe file name from the course name. */
export function reportFileName(review: Pick<IAiReview, 'courseName'>, ext: string): string {
  const base = (review.courseName || 'review').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 60) || 'review'
  return `AI-review-${base}.${ext}`
}

function resourceHtml(item: IAiReviewItem, words: ReportWords): string {
  const addie = addieOf(item)
  const domain = domainOf(item)
  const r = item.result
  const parts: string[] = []
  const chips = [
    addie ? `<span class="chip ${esc(addie.score.band || '')}">ADDIE ${esc(addie.score.scorePct ?? '—')}%</span>` : '',
    domain ? `<span class="chip violet">Domain ${esc(domain.score.yes)}/${esc(domain.score.applicable)}</span>` : '',
  ].join('')
  parts.push(
    `<section class="resource"><div class="rhead"><div><div class="kind">${esc(kindLine(item.kind, item.mimeType))}</div><h3>${esc(item.name)}</h3></div><div>${chips}</div></div>`,
  )
  if (item.status === 'failed' || item.status === 'cancelled') {
    parts.push(`<p class="err">${esc(item.error || `This ${words.one} could not be reviewed.`)}</p>`)
  }
  if (r?.cached) {
    parts.push(
      `<p class="muted">Unchanged since ${r.cachedAt ? 'its review on ' + esc(new Date(r.cachedAt).toLocaleDateString()) : 'an earlier review'}: that result is shown again.</p>`,
    )
  }
  if (domain) {
    parts.push(`<div class="domain"><h4>Domain review</h4>`)
    if (domain.summary) {
      parts.push(`<p>${esc(domain.summary)}</p>`)
    }
    if (domain.levelFit) {
      parts.push(`<p><b>${esc(domain.levelFit.verdict)}</b> — ${esc(domain.levelFit.rationale)}</p>`)
    }
    if (domain.coverage.length) {
      parts.push(
        '<ul class="cov">' +
          domain.coverage
            .map(
              c =>
                `<li><span class="mark ${esc(c.status)}">${COVERAGE_MARK[c.status] || ''}</span> ${esc(c.component)}${c.evidence ? ` <i>— ${esc(c.evidence)}</i>` : ''}</li>`,
            )
            .join('') +
          '</ul>',
      )
    }
    parts.push('</div>')
  } else if (r && isPassError(r.domain)) {
    parts.push(`<p class="err">Domain review could not run: ${esc(r.domain.error)}</p>`)
  }
  if (r && r.questionsError) {
    parts.push(`<p class="err">Question check could not run: ${esc(r.questionsError)}</p>`)
  }
  if (r && r.questions && r.questions.length) {
    const issues = r.questions.filter(q => q.verdict === 'issue')
    parts.push(`<h4>Questions (${issues.length} of ${r.questions.length} need attention)</h4><ul class="items">`)
    issues.forEach(q => {
      parts.push(
        `<li><b>Q${esc(q.n)}</b> ${esc(q.question)}<br><span class="note">${q.issues.map(esc).join('; ')}</span>${
          q.fix ? `<br><span class="fix">→ ${esc(q.fix)}</span>` : ''
        }</li>`,
      )
    })
    parts.push('</ul>')
  }
  if (addie) {
    parts.push(`<h4>CBP / ADDIE checklist — ${esc(addie.score.scorePct ?? '—')}%</h4>`)
    if (addie.summary) {
      parts.push(`<p>${esc(addie.summary)}</p>`)
    }
    const missing = addie.score.areas.reduce(
      (acc, a) => acc.concat(a.items.filter(i => i.verdict === 'no')),
      [] as (typeof addie.score.areas)[0]['items'],
    )
    if (missing.length) {
      parts.push('<ul class="items">')
      missing.forEach(i => {
        parts.push(
          `<li><b>${esc(i.id)}</b> ${esc(i.text)}${i.note ? `<br><span class="note">${esc(i.note)}</span>` : ''}${
            i.fix ? `<br><span class="fix">→ ${esc(i.fix)}</span>` : ''
          }</li>`,
        )
      })
      parts.push('</ul>')
    }
  } else if (r && isPassError(r.addie)) {
    parts.push(`<p class="err">Checklist could not run: ${esc(r.addie.error)}</p>`)
  }
  parts.push('</section>')
  return parts.join('')
}

/** The whole report as a self-contained, print-ready HTML document. */
export function buildReportHtml(review: IAiReview, generatedAt: Date = new Date()): string {
  const s = review.result
  const words = reportWords(review)
  const c = review.options && review.options.competency
  const summary = s
    ? `<div class="cards">${
        s.addie
          ? `<div class="card"><div class="lbl">CBP / ADDIE checklist</div><div class="big">${esc(s.addie.scorePct ?? '—')}%</div><div>${esc(s.addie.yes)} / ${esc(
              s.addie.applicable,
            )} indicators met</div><div class="muted">${esc(s.addie.bandMessage || '')}</div></div>`
          : ''
      }${
        s.domain
          ? `<div class="card"><div class="lbl">Domain review</div><div class="big">${esc(s.domain.yes)}/${esc(s.domain.applicable)}</div><div>${
              esc(judgedAgainst(review.options)) +
              (roleSummary(review.options) ? `<div class="muted">${esc(roleSummary(review.options))}</div>` : '')
            }</div></div>`
          : ''
      }<div class="card"><div class="lbl">${words.Many}</div><div class="big">${esc(s.reviewed)}</div><div>reviewed${s.failed ? ` · ${esc(s.failed)} could not be reviewed` : ''} · ${esc(s.skipped.length)} not included</div></div></div>${
        s.coverage.length
          ? `<h2>Coverage of the competency level</h2><table><thead><tr><th>What the level needs</th><th>Status</th><th>Covered by</th></tr></thead><tbody>${s.coverage
              .map(
                row =>
                  `<tr><td>${esc(row.component)}</td><td><span class="mark ${esc(row.status)}">${COVERAGE_MARK[row.status] || ''}</span> ${esc(row.status)}</td><td>${esc(
                    row.coveredBy.join(', ') || '—',
                  )}</td></tr>`,
              )
              .join('')}</tbody></table>`
          : ''
      }${
        s.commonGaps.length
          ? `<h2>Most common gaps</h2><ul class="items">${s.commonGaps.map(g => `<li><b>${esc(g.id)}</b> ${esc(g.text)} <span class="muted">×${esc(g.count)}</span></li>`).join('')}</ul>`
          : ''
      }`
    : ''
  const resources = review.items
    .filter(i => i.status !== 'skipped')
    .map(i => resourceHtml(i, words))
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(reportFileName(review, 'pdf').replace(/\.pdf$/, ''))}</title><style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Roboto,'Noto Sans','Noto Sans Devanagari','Segoe UI',Arial,sans-serif;color:#172036;font-size:12.5px;line-height:1.5;margin:0;padding:24px}
.hero{border-radius:14px;padding:20px 24px;color:#fff;background:linear-gradient(135deg,#0b1530,#1e1b4b 60%,#4c1d95)}
.hero .eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a5f3fc}
.hero h1{margin:4px 0 2px;font-size:22px}.hero p{margin:0;color:#e0e7ff}
.tip{margin:12px 0;padding:8px 12px;border-radius:10px;background:#eef2ff;color:#3b5bdb;font-size:12px}
h2{font-size:15px;margin:20px 0 8px}h3{margin:2px 0 0;font-size:14px}h4{font-size:13px;margin:12px 0 6px}
.cards{display:flex;gap:10px;margin-top:16px}.card{flex:1;border:1px solid #e4e8f2;border-radius:12px;padding:12px}
.lbl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#5b6478;font-weight:700}.big{font-size:26px;font-weight:700}
.muted,i{color:#5b6478}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e4e8f2;vertical-align:top}th{font-size:10px;text-transform:uppercase;color:#5b6478;background:#f5f7fc}
.mark{display:inline-block;width:16px;height:16px;border-radius:50%;color:#fff;text-align:center;font-size:10px;line-height:16px}.covered{background:#15803d}.partial{background:#b45309}.missing{background:#b91c1c}
.items{padding-left:0;list-style:none}.items li{border:1px solid #e4e8f2;border-left:3px solid #b91c1c;border-radius:8px;padding:6px 10px;margin-bottom:6px}
.note{color:#5b6478}.fix{color:#15803d;font-weight:500}.err{color:#b91c1c}
.resource{border:1px solid #e4e8f2;border-radius:12px;padding:14px;margin-top:14px;page-break-inside:avoid}
.rhead{display:flex;justify-content:space-between;gap:8px}.kind{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#7c3aed;font-weight:700}
.chip{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:4px;background:#eef2ff;color:#3b5bdb}.chip.green{background:#dcfce7;color:#15803d}.chip.amber{background:#ffedd5;color:#b45309}.chip.red{background:#fee2e2;color:#b91c1c}.chip.violet{background:#f5f3ff;color:#7c3aed}
.domain{background:#f5f3ff;border-radius:10px;padding:8px 12px;margin-top:8px}.cov{list-style:none;padding:0;margin:0}.cov li{padding:3px 0}
footer{margin-top:20px;font-size:10px;color:#5b6478;text-align:center}
@media print{.tip{display:none}body{padding:0}}
</style></head><body>
<div class="hero"><div class="eyebrow">${esc(words.eyebrow)}</div><h1>${esc(review.courseName)}</h1><p>Started by ${esc(review.requestedBy.name || 'a user')} · ${esc(
    new Date(review.createdAt).toLocaleString(),
  )}</p></div>
<div class="tip">To save this report, choose <b>Save as PDF</b> as the destination in the print dialog.</div>
${summary}${resources ? `<h2>Each ${words.one}</h2>` + resources : ''}
<footer>${esc(words.footer)} Generated ${esc(generatedAt.toLocaleString())}.</footer>
</body></html>`
}

/**
 * Opens the report in a new tab and starts the print dialog there. Returns false when the
 * browser blocked the new tab, so the page can say so.
 */
export function openPrintableReport(review: IAiReview, opener: Pick<Window, 'open'> = window): boolean {
  const win = opener.open('', '_blank')
  if (!win) {
    return false
  }
  win.document.open()
  win.document.write(buildReportHtml(review))
  win.document.close()
  win.focus()
  // After layout, so the dialog previews the finished page.
  setTimeout(() => win.print(), 300)
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
      ['ADDIE score %', s.addie.scorePct ?? ''],
      ['Indicators met', `${s.addie.yes} / ${s.addie.applicable}`],
      ['Band', s.addie.bandMessage || ''],
    )
  }
  if (s && s.domain) {
    summary.push(['Domain score', `${s.domain.yes} / ${s.domain.applicable}`])
  }
  if (c || review.options?.levelMode === 'perResource') {
    summary.push(['Judged against', judgedAgainst(review.options)])
  }
  if (roleSummary(review.options)) {
    summary.push(['FRAC role checked', roleSummary(review.options)])
  }
  if (s) {
    summary.push([`${words.Many} reviewed`, s.reviewed], ['Could not be reviewed', s.failed || 0], ['Not included', s.skipped.length])
  }
  const reused = review.items.filter(i => i.result?.cached)
  if (reused.length) {
    summary.push(['Unchanged, earlier result shown', reused.map(i => i.name).join('; ')])
  }

  const checklist: (string | number)[][] = [
    [words.one === 'file' ? 'File' : 'Resource', 'Type', 'Area', 'ID', 'Indicator', 'Verdict', 'Note', 'Suggested fix'],
  ]
  const questions: (string | number)[][] = [
    [words.one === 'file' ? 'File' : 'Resource', 'Q', 'Question', 'Verdict', 'Issues', 'Suggested fix'],
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
      questions.push([item.name, q.n, q.question, q.verdict === 'ok' ? 'OK' : 'Needs attention', q.issues.join('; '), q.fix || '']),
    )
  })

  const coverage: (string | number)[][] = [['What the level needs', 'Status', 'Covered by']]
  ;(s?.coverage || []).forEach(row => coverage.push([row.component, row.status, row.coveredBy.join(', ')]))

  const sheets: Record<string, (string | number)[][]> = { Summary: summary, Checklist: checklist, Coverage: coverage }
  if (questions.length > 1) {
    sheets['Questions'] = questions
  }
  return sheets
}
