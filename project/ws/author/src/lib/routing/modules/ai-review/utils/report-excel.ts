import type ExcelJSType from 'exceljs'
import { IAiReview, IAiReviewAddie, IAiReviewAlignment, IAiReviewDomain, IAiReviewItem, isPassError } from '../models/ai-review.model'
import { coverageSources, locateText, Place, placeLabel, placeLink } from './report-detail'
import { buildWorkbookSheets, judgedAgainst, levelText, mediaNotes, reportWords, roleSummary } from './report-export'
import { kindLine, kindMeta } from './resource-kind'
import { costBreakdown, providerLabel, stepLabel } from './usage'
import { checklistTotalOf, fixGroupsOf, inShortOf, scoreNote, scoreRowsOf } from './report-summary'

/**
 * The review as a formatted Excel workbook, for reviewers who track fixes in a spreadsheet:
 *
 *  - Summary: the scores, what was judged, each resource at a glance, and links to every sheet;
 *  - To fix: each resource's findings, once each, grouped as on the report screen, with the fix
 *    and a link that opens the resource at the moment or page;
 *  - Resources, Checklist, Domain review, Coverage, Questions (and Course alignment and HTML
 *    packages when present): every detail the PDF has.
 *
 * Coloured headers, wrapped text, frozen header rows and filters, so it reads well as it opens.
 */

type Workbook = ExcelJSType.Workbook
type Worksheet = ExcelJSType.Worksheet
type Row = ExcelJSType.Row

const C = {
  head: 'FF1C5D95',
  headText: 'FFFFFFFF',
  title: 'FF172036',
  muted: 'FF5B6478',
  line: 'FFE4E8F2',
  band: 'FFF5F7FC',
  link: 'FF3B5BDB',
  green: 'FF15803D',
  greenBg: 'FFE7F6EC',
  amber: 'FFB45309',
  amberBg: 'FFFFF4E5',
  red: 'FFB91C1C',
  redBg: 'FFFDECEC',
  violet: 'FF7C3AED',
  violetBg: 'FFF5F3FF',
}

const TONE: Record<string, [string, string]> = {
  Met: [C.green, C.greenBg],
  'Not met': [C.red, C.redBg],
  'N/A': [C.muted, C.band],
  covered: [C.green, C.greenBg],
  partial: [C.amber, C.amberBg],
  missing: [C.red, C.redBg],
  OK: [C.green, C.greenBg],
  'Needs attention': [C.red, C.redBg],
  'Fits the course': [C.green, C.greenBg],
  'Partly fits the course': [C.amber, C.amberBg],
  Missing: [C.red, C.redBg],
  Partial: [C.amber, C.amberBg],
  'Off topic for this course': [C.red, C.redBg],
  fits: [C.green, C.greenBg],
  below: [C.amber, C.amberBg],
  above: [C.amber, C.amberBg],
  mixed: [C.amber, C.amberBg],
  green: [C.green, C.greenBg],
  amber: [C.amber, C.amberBg],
  red: [C.red, C.redBg],
  Done: [C.green, C.greenBg],
  'Could not be reviewed': [C.red, C.redBg],
  Covered: [C.green, C.greenBg],
  'Pitched at the right level': [C.green, C.greenBg],
  'Pitched below the level': [C.amber, C.amberBg],
  'Pitched above the level': [C.amber, C.amberBg],
  'Pitched at mixed levels': [C.amber, C.amberBg],
  'Could not run': [C.red, C.redBg],
}

/** The words the screen and the PDF use, so the workbook reads the same. */
const LEVEL_FIT_LABEL: Record<string, string> = {
  fits: 'Pitched at the right level',
  below: 'Pitched below the level',
  above: 'Pitched above the level',
  mixed: 'Pitched at mixed levels',
}
const COVERAGE_LABEL: Record<string, string> = { covered: 'Covered', partial: 'Partial', missing: 'Missing' }

/** Why a resource was not (fully) reviewed: its own error and each check that could not run. */
function problemsOf(item: IAiReviewItem): string {
  const r = item.result
  const passes: [string, unknown][] = [
    ['Checklist', r?.addie],
    ['Domain review', r?.domain],
    ['Course alignment', r?.alignment],
  ]
  return [
    item.error || '',
    ...passes.filter(([, p]) => isPassError(p)).map(([label, p]) => `${label}: ${(p as { error: string }).error}`),
    r?.questionsError ? `Question check: ${r.questionsError}` : '',
    ...mediaNotes(item)
      .filter(n => n.tone === 'error')
      .map(n => n.text),
  ]
    .filter(Boolean)
    .join('\n')
}

const VERDICT: Record<string, string> = { yes: 'Met', no: 'Not met', na: 'N/A' }
const FIT: Record<string, string> = {
  aligned: 'Fits the course',
  partial: 'Partly fits the course',
  off_topic: 'Off topic for this course',
}
const BORDER = { style: 'thin' as const, color: { argb: C.line } }

const addieOf = (i: IAiReviewItem): IAiReviewAddie | null => (i.result?.addie && !isPassError(i.result.addie) ? i.result.addie : null)
const domainOf = (i: IAiReviewItem): IAiReviewDomain | null => (i.result?.domain && !isPassError(i.result.domain) ? i.result.domain : null)
const alignmentOf = (i: IAiReviewItem): IAiReviewAlignment | null =>
  i.result?.alignment && !isPassError(i.result.alignment) ? i.result.alignment : null

/** A sheet with a coloured, frozen, filterable header row and set column widths. */
function table(wb: Workbook, name: string, columns: { header: string; width: number }[]): Worksheet {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }], properties: { defaultRowHeight: 18 } })
  ws.columns = columns.map(c => ({ header: c.header, width: c.width }))
  const head = ws.getRow(1)
  head.height = 24
  head.eachCell(cell => {
    cell.font = { bold: true, color: { argb: C.headText }, name: 'Calibri', size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.head } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = { bottom: BORDER }
  })
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  return ws
}

/** Adds a body row: wrapped, top-aligned, with thin row lines. */
function addRow(ws: Worksheet, values: unknown[]): Row {
  const row = ws.addRow(values)
  row.eachCell({ includeEmpty: true }, cell => {
    cell.alignment = { vertical: 'top', wrapText: true }
    cell.border = { bottom: BORDER }
  })
  return row
}

/** Colours a cell by its value (Met, missing, …). */
function tone(row: Row, col: number): void {
  const cell = row.getCell(col)
  const t = TONE[String(cell.value ?? '')]
  if (t) {
    cell.font = { bold: true, color: { argb: t[0] } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: t[1] } }
  }
}

/** A clickable cell: a link out (to the resource at a place) or to another sheet. */
function link(row: Row, col: number, text: string, target: string | null): void {
  const cell = row.getCell(col)
  if (!target) {
    cell.value = text === 'Open' ? '' : text
    return
  }
  cell.value = { text, hyperlink: target }
  cell.font = { color: { argb: C.link }, underline: true }
}

const sheetLink = (name: string) => `#'${name.replace(/'/g, "''")}'!A1`

/** Where a scored item is, from its own fields. */
const placeOf = (i: { at?: string; atSec?: number; page?: number }): Place => ({ at: i.at, atSec: i.atSec, page: i.page })

export async function buildExcelWorkbook(
  review: IAiReview,
  ExcelJS: typeof ExcelJSType,
  generatedAt: Date = new Date(),
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Aastrika AI Review'
  wb.created = generatedAt
  const words = reportWords(review)
  const s = review.result
  const items = review.items.filter(i => i.status !== 'skipped')
  const resourceCol = words.one === 'file' ? 'File' : 'Resource'

  // ---- Summary (filled last for its sheet links, but added first so it opens first) ------
  const summary = wb.addWorksheet('Summary', { properties: { defaultRowHeight: 18 } })
  summary.columns = [{ width: 30 }, { width: 70 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 18 }, { width: 12 }]

  // ---- To fix: the same list as each resource's block on screen, each finding once ----------
  const groups = fixGroupsOf(review, words.one)
  const scoreRows = scoreRowsOf(review, groups)
  const issues = table(wb, 'To fix', [
    { header: resourceCol, width: 34 },
    { header: 'Review', width: 26 },
    { header: 'ID', width: 8 },
    { header: 'What is checked', width: 46 },
    { header: 'Verdict', width: 16 },
    { header: 'Finding', width: 60 },
    { header: 'Suggested fix', width: 50 },
    { header: 'Where', width: 10 },
    { header: 'Open', width: 10 },
  ])
  for (const item of items) {
    for (const g of groups.get(item.contentId) || []) {
      for (const x of g.issues) {
        const finding = x.check ? `${x.finding}${x.finding ? '\n' : ''}Check by hand: ${x.check}` : x.finding
        const row = addRow(issues, [
          x.item.name,
          g.label,
          x.id,
          x.what + (x.borderline ? ' (borderline)' : ''),
          x.verdict,
          finding,
          x.fix,
          placeLabel(x.place),
          '',
        ])
        tone(row, 5)
        link(
          row,
          9,
          'Open',
          x.source === 'question' || x.source === 'answerKey' || x.source === 'noSound' ? null : placeLink(x.item, x.place),
        )
      }
    }
  }
  if (issues.rowCount === 1) {
    addRow(issues, ['Nothing to fix was found.'])
  }

  // ---- Resources ---------------------------------------------------------------------------
  const resources = table(wb, words.Many, [
    { header: resourceCol, width: 34 },
    { header: 'Type', width: 18 },
    { header: 'Status', width: 14 },
    { header: 'ADDIE %', width: 10 },
    { header: 'Domain', width: 10 },
    { header: 'Level fit', width: 12 },
    { header: 'Fits the course', width: 18 },
    { header: 'Questions needing attention', width: 14 },
    { header: 'Checklist summary', width: 60 },
    { header: 'Domain summary', width: 60 },
    { header: 'Could not run', width: 50 },
    { header: 'Cost (USD)', width: 11 },
    { header: 'Open', width: 10 },
  ])
  for (const item of items) {
    const a = addieOf(item)
    const d = domainOf(item)
    const al = alignmentOf(item)
    const qs = item.result?.questions
    const row = addRow(resources, [
      item.name,
      kindLine(item.kind, item.mimeType),
      item.status === 'done' ? 'Done' : 'Could not be reviewed',
      a ? (a.score.scorePct ?? '') : '',
      d ? `${d.score.yes}/${d.score.applicable}` : '',
      d?.levelFit ? LEVEL_FIT_LABEL[d.levelFit.verdict] || d.levelFit.verdict : '',
      al ? FIT[al.verdict] || al.verdict : '',
      qs ? `${qs.filter(q => q.verdict === 'issue').length} of ${qs.length}` : '',
      a?.summary || '',
      d?.summary || '',
      problemsOf(item),
      item.result?.costUsd ?? '',
      '',
    ])
    tone(row, 3)
    tone(row, 6)
    tone(row, 7)
    row.getCell(12).numFmt = '$0.00'
    link(row, 13, 'Open', placeLink(item))
  }

  // ---- Checklist: every verdict ----------------------------------------------------------
  const checklist = table(wb, 'Checklist', [
    { header: resourceCol, width: 30 },
    { header: 'Area', width: 20 },
    { header: 'ID', width: 7 },
    { header: 'Indicator', width: 50 },
    { header: 'Verdict', width: 11 },
    { header: 'Note', width: 60 },
    { header: 'Suggested fix', width: 46 },
    { header: 'Where', width: 10 },
    { header: 'Open', width: 10 },
  ])
  for (const item of items) {
    addieOf(item)?.score.areas.forEach(area =>
      area.items.forEach(i => {
        const row = addRow(checklist, [
          item.name,
          area.area,
          i.id,
          i.text,
          VERDICT[i.verdict] || i.verdict,
          i.note,
          i.fix || '',
          placeLabel(placeOf(i)),
          '',
        ])
        tone(row, 5)
        link(row, 9, 'Open', i.verdict === 'na' ? null : placeLink(item, placeOf(i)))
      }),
    )
  }

  // ---- Domain review: verdicts and each resource's coverage, with evidence ---------------
  const domain = table(wb, 'Domain review', [
    { header: resourceCol, width: 30 },
    { header: 'Kind', width: 14 },
    { header: 'ID', width: 7 },
    { header: 'What is checked', width: 54 },
    { header: 'Verdict / status', width: 14 },
    { header: 'Note / evidence', width: 60 },
    { header: 'Suggested fix', width: 46 },
    { header: 'Where', width: 10 },
    { header: 'Open', width: 10 },
  ])
  for (const item of items) {
    const d = domainOf(item)
    if (!d) {
      continue
    }
    if (d.levelFit) {
      const row = addRow(domain, [
        item.name,
        'Level fit',
        '',
        `Best fit: Level ${d.levelFit.bestFitLevel ?? '—'}`,
        LEVEL_FIT_LABEL[d.levelFit.verdict] || d.levelFit.verdict,
        d.levelFit.rationale,
        '',
        '',
        '',
      ])
      tone(row, 5)
    }
    d.score.areas.forEach(area =>
      area.items.forEach(i => {
        const row = addRow(domain, [
          item.name,
          'Indicator',
          i.id,
          i.text,
          VERDICT[i.verdict] || i.verdict,
          i.note,
          i.fix || '',
          placeLabel(placeOf(i)),
          '',
        ])
        tone(row, 5)
        link(row, 9, 'Open', i.verdict === 'na' ? null : placeLink(item, placeOf(i)))
      }),
    )
    d.coverage.forEach(c => {
      const place = locateText(c.evidence || '')
      const row = addRow(domain, [
        item.name,
        'Coverage',
        '',
        c.component,
        COVERAGE_LABEL[c.status] || c.status,
        c.evidence,
        '',
        placeLabel(place),
        '',
      ])
      tone(row, 5)
      link(row, 9, 'Open', placeLink(item, place))
    })
  }

  // ---- Coverage of the level across the course, with each resource's evidence -------------
  const coverage = table(wb, 'Coverage', [
    { header: 'What the level needs', width: 50 },
    { header: 'Status', width: 12 },
    { header: 'Covered by', width: 40 },
    { header: 'Evidence from each ' + words.one, width: 80 },
  ])
  for (const c of s?.coverage || []) {
    const sources = coverageSources(review, c.component)
    const evidence = sources.map(x => `${x.item.name} (${x.row.status}): ${x.row.evidence || '—'}`).join('\n')
    const row = addRow(coverage, [c.component, COVERAGE_LABEL[c.status] || c.status, c.coveredBy.join(', ') || '—', evidence])
    tone(row, 2)
  }

  // ---- Questions, course alignment, HTML packages: the rows the PDF has --------------------
  const plain = buildWorkbookSheets(review)
  const copy = (name: string, widths: number[], toneCols: number[] = []) => {
    const rows = plain[name]
    if (!rows || rows.length < 2) {
      return null
    }
    const ws = table(
      wb,
      name,
      rows[0].map((h, i) => ({ header: String(h), width: widths[i] || 20 })),
    )
    rows.slice(1).forEach(values => {
      const row = addRow(ws, values)
      toneCols.forEach(col => tone(row, col))
    })
    return ws
  }
  copy('Questions', [30, 6, 60, 16, 60, 50, 18], [4])
  copy('Course alignment', [16, 40, 16, 70, 46])
  copy('HTML packages', [34, 8, 8, 12, 8, 10, 30, 24])

  // ---- Costs: every AI call, while the service sends them ------------------------------------
  const costs = costBreakdown(review)
  if (costs) {
    const ws = table(wb, 'Costs', [
      { header: resourceCol, width: 34 },
      { header: 'Step', width: 32 },
      { header: 'Provider', width: 12 },
      { header: 'Model', width: 22 },
      { header: 'Calls', width: 8 },
      { header: 'Input tokens', width: 13 },
      { header: 'Of which cached', width: 13 },
      { header: 'Output tokens', width: 13 },
      { header: 'Audio (s)', width: 10 },
      { header: 'Cost (USD)', width: 12 },
    ])
    for (const g of costs.groups) {
      if (g.reused) {
        addRow(ws, [g.name, 'Unchanged since an earlier review: its result was reused', '', '', 0, 0, 0, 0, 0, 0])
        continue
      }
      for (const l of g.lines) {
        const row = addRow(ws, [
          g.name,
          stepLabel(l.step),
          providerLabel(l.provider),
          l.model,
          l.calls,
          l.inputTokens,
          l.cachedTokens,
          l.outputTokens,
          l.audioSec || '',
          l.costUsd,
        ])
        row.getCell(10).numFmt = '$0.0000'
        ;[6, 7, 8].forEach(c => (row.getCell(c).numFmt = '#,##0'))
      }
    }
    const total = (label: string, usd: number) => {
      const row = ws.addRow([label, '', '', '', '', '', '', '', '', usd])
      row.font = { bold: true }
      row.getCell(10).numFmt = '$0.0000'
      row.eachCell({ includeEmpty: true }, cell => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.band } }))
    }
    ws.addRow([])
    costs.byProvider.forEach(p => total(`${p.label} (${p.calls} calls)`, p.costUsd))
    total('Total', costs.totalUsd)
  }

  // ---- Summary sheet -----------------------------------------------------------------------
  const title = summary.addRow([`${words.eyebrow}: ${review.courseName}`])
  title.font = { bold: true, size: 16, color: { argb: C.title } }
  title.height = 28
  summary.mergeCells(title.number, 1, title.number, 4)
  const sub = summary.addRow([
    `Started by ${review.requestedBy.name || 'a user'} · ${new Date(review.createdAt).toLocaleString()} · status ${review.status}`,
  ])
  sub.font = { color: { argb: C.muted } }
  summary.mergeCells(sub.number, 1, sub.number, 4)
  summary.addRow([])

  const kv = (label: string, value: unknown, toneKey?: string) => {
    const row = summary.addRow([label, value])
    row.getCell(1).font = { bold: true, color: { argb: C.muted } }
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    const t = toneKey ? TONE[toneKey] : undefined
    if (t) {
      row.getCell(2).font = { bold: true, color: { argb: t[0] } }
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: t[1] } }
    }
    return row
  }
  const totalFixes = scoreRows.reduce((n, r) => n + r.fixes, 0)
  const inShort = inShortOf(review, words, totalFixes)
  if (inShort.length) {
    const row = kv('In short', inShort.join('\n'))
    // Tall enough for the wrapped lines too (the column holds about 70 characters a line).
    row.height = 16 * inShort.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 70)), 0) + 6
  }
  const checklistTotal = checklistTotalOf(review)
  if (s?.addie) {
    kv(
      'CBP / ADDIE checklist',
      `${s.addie.scorePct ?? '—'}% · ${s.addie.yes} of ${s.addie.applicable} checks met${checklistTotal ? ` (${checklistTotal}-point checklist, added up over ${s.reviewed} ${s.reviewed === 1 ? words.one : words.many})` : ''}${
        // With a course verdict the band message is left out, as on screen: the two can disagree.
        !s.verdict && s.addie.bandMessage ? ` · ${s.addie.bandMessage}` : ''
      }`,
      s.addie.band || undefined,
    )
  }
  if (s?.domain) {
    kv(
      'Domain review',
      `${s.domain.yes} of ${s.domain.applicable} domain checks met (by a subject expert), added up over the ${words.many}`,
    )
  }
  if (judgedAgainst(review.options)) {
    kv('Judged against', judgedAgainst(review.options))
  } else if (review.options?.competency) {
    kv('Judged against', `${review.options.competency.label} · ${levelText(review.options.competency)}`)
  }
  if (review.options?.audience) {
    kv('Audience', review.options.audience)
  }
  if (roleSummary(review.options)) {
    kv('FRAC role checked', roleSummary(review.options))
  }
  const al = s?.alignment
  if (al && !isPassError(al)) {
    kv(
      'Course alignment',
      `${{ delivers: 'Delivers', partly: 'Partly delivers', does_not: 'Does not deliver' }[al.verdict]} what its description promises. ${al.summary}`,
      al.verdict === 'delivers' ? 'green' : al.verdict === 'partly' ? 'amber' : 'red',
    )
  }
  if (s?.alignment && isPassError(s.alignment)) {
    kv('Course alignment', `Could not run: ${s.alignment.error}`, 'red')
  }
  if (review.error) {
    kv('Review problem', review.error, 'red')
  }
  const notRun = items.map(i => ({ name: i.name, why: problemsOf(i) })).filter(x => x.why)
  if (notRun.length) {
    const row = kv('Not fully reviewed', notRun.map(x => `${x.name}: ${x.why.replace(/\n/g, '; ')}`).join('\n'), 'amber')
    row.height = 32 * notRun.length + 4
  }
  if (s?.skipped.length) {
    kv('Left out of the review', s.skipped.map(k => `${k.name} (${k.reason})`).join('\n'))
  }
  kv('Cost', `$${Number(review.costUsd || 0).toFixed(2)}`)
  summary.addRow([])

  // Score by resource, with the course total: where the course numbers come from.
  const scoreHead = summary.addRow([`Score by ${words.one}`])
  scoreHead.font = { bold: true, size: 12 }
  const head = summary.addRow([resourceCol, 'Type', 'CBP checks met', 'CBP %', 'Domain checks met', 'To fix', 'Status'])
  head.eachCell(cell => {
    cell.font = { bold: true, color: { argb: C.headText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.head } }
  })
  for (const r of scoreRows) {
    const row = summary.addRow([
      '',
      kindMeta(r.item.kind).label,
      r.addie ? `${r.addie.yes} of ${r.addie.applicable}` : '',
      r.addie ? (r.addie.pct ?? '') : '',
      r.domain ? `${r.domain.yes} of ${r.domain.applicable}` : '',
      r.failed ? '' : r.fixes,
      r.failed ? 'Could not be reviewed' : 'Done',
    ])
    link(row, 1, r.item.name, placeLink(r.item))
    tone(row, 7)
    row.eachCell({ includeEmpty: true }, cell => (cell.border = { bottom: BORDER }))
  }
  if (s) {
    const total = summary.addRow([
      'Total',
      '',
      s.addie ? `${s.addie.yes} of ${s.addie.applicable}` : '',
      s.addie ? (s.addie.scorePct ?? '') : '',
      s.domain ? `${s.domain.yes} of ${s.domain.applicable}` : '',
      totalFixes,
      '',
    ])
    total.font = { bold: true }
    total.eachCell({ includeEmpty: true }, cell => (cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.band } }))
  }
  if (s?.addie && checklistTotal) {
    const note = summary.addRow([scoreNote(checklistTotal, words.one)])
    summary.mergeCells(note.number, 1, note.number, 7)
    note.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    note.getCell(1).font = { italic: true, color: { argb: C.muted } }
    note.height = 32
  }
  summary.addRow([])
  const sheetsHead = summary.addRow(['In this workbook'])
  sheetsHead.font = { bold: true, size: 12 }
  const about: Record<string, string> = {
    'To fix': `Each ${words.one}'s findings, once each, with the fix. "Open" takes you to the ${words.one} at that moment or page.`,
    [words.Many]: `Each ${words.one} at a glance: scores, fit and the reviewers' summaries.`,
    Checklist: 'Every CBP checklist verdict, with its note and fix.',
    'Domain review': 'The subject expert’s verdicts, level fit and the coverage of the level, with evidence.',
    Coverage: `What the competency level needs, across the whole set, with each ${words.one}'s evidence.`,
    Questions: 'Every quiz and assessment question checked, with its issues and fix.',
    'Course alignment': 'Whether the content delivers what the course name and description promise.',
    'HTML packages': 'What each interactive package holds, and whether it reports progress.',
    Costs: 'Every AI call the review made: provider, model, step, tokens and cost.',
  }
  for (const ws of wb.worksheets) {
    if (ws.name === 'Summary') {
      continue
    }
    const row = summary.addRow(['', about[ws.name] || ''])
    link(row, 1, ws.name, sheetLink(ws.name))
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
  }
  if (review.source === 'upload') {
    const note = summary.addRow([
      '',
      'Links to uploaded files are signed: they stop working about an hour after the report was last opened in the portal. Open the report there again for links that work.',
    ])
    note.getCell(2).font = { italic: true, color: { argb: C.muted } }
  }
  const foot = summary.addRow(['', `${words.footer} Generated ${generatedAt.toLocaleString()}.`])
  foot.getCell(2).font = { italic: true, color: { argb: C.muted } }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

/** The ExcelJS module from a dynamic import, wherever the bundler put it. */
export function excelJsApi(mod: unknown): typeof ExcelJSType {
  const m = mod as (typeof ExcelJSType & { default?: typeof ExcelJSType }) | null
  if (m && m.Workbook) {
    return m
  }
  if (m && m.default && m.default.Workbook) {
    return m.default
  }
  throw new Error('The Excel library did not load.')
}
