/**
 * Bulk question upload (Excel) for quizzes and assessments.
 *
 * Columns, one question per row (row 1 is the header):
 *   Question | Option 1..6 | Correct Answer          -- as before, unchanged
 *   Hint 1..6                                       -- optional, the hint shown for that option
 *   Duration (Minutes) | Random Count | Pass Percentage
 *                                                   -- optional settings, read from the first
 *                                                      row that fills them in
 *
 * Sheets made from the old template (no hint or settings columns) import exactly as before.
 */

export const OPTION_COUNT = 6

export const SETTING_COLUMNS = {
  duration: 'Duration (Minutes)',
  randomCount: 'Random Count',
  passPercentage: 'Pass Percentage',
} as const

export const QUESTION_COLUMNS = [
  'Question',
  ...Array.from({ length: OPTION_COUNT }, (_, i) => `Option ${i + 1}`),
  'Correct Answer',
  ...Array.from({ length: OPTION_COUNT }, (_, i) => `Hint ${i + 1}`),
]

export const ALL_COLUMNS = [...QUESTION_COLUMNS, SETTING_COLUMNS.duration, SETTING_COLUMNS.randomCount, SETTING_COLUMNS.passPercentage]

export interface SheetSettings {
  duration?: number
  randomCount?: number
  passPercentage?: number
}

/** Header names are matched without regard to case or extra spaces. */
export function normaliseHeader(header: unknown): string {
  return String(header ?? '')
    .trim()
    .replaceAll(/\s+/g, ' ')
    .toLowerCase()
}

/** Reads a cell by column name, tolerant of header case and spacing. */
export function cell(rowData: { [key: string]: unknown }, column: string): string {
  const wanted = normaliseHeader(column)
  const key = Object.keys(rowData).find(k => normaliseHeader(k) === wanted)
  const value = key === undefined ? undefined : rowData[key]
  return value === undefined || value === null ? '' : String(value).trim()
}

/** Plain text from the sheet as the HTML the hint editor stores; markup in the text stays literal. */
export function hintTextToHtml(text: string): string {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll(/\r?\n/g, '<br>')
  return `<p>${escaped}</p>`
}

/** A stored hint (editor HTML) as plain text for the sheet. */
export function hintHtmlToText(html: unknown): string {
  if (typeof html !== 'string' || html === '') {
    return ''
  }
  const withBreaks = html.replaceAll(/<br\s*\/?>/gi, '\n').replaceAll(/<\/p>\s*<p[^>]*>/gi, '\n')
  const stripped = withBreaks.replaceAll(/<[^>]*>/g, '')
  return stripped
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .trim()
}

/**
 * The settings columns, taken from the first row that fills each one in. Invalid values are
 * left out with a warning, so the author fixes them in the form rather than saving bad data.
 */
export function readSheetSettings(
  rows: { [key: string]: unknown }[],
  questionCount: number,
  isAssessment: boolean,
): { settings: SheetSettings; warnings: string[] } {
  const settings: SheetSettings = {}
  const warnings: string[] = []
  const first = (column: string) => {
    for (const row of rows) {
      const value = cell(row, column)
      if (value !== '') {
        return value
      }
    }
    return ''
  }

  const duration = first(SETTING_COLUMNS.duration)
  if (duration !== '') {
    const minutes = Number(duration)
    if (Number.isFinite(minutes) && minutes > 0) {
      settings.duration = minutes
    } else {
      warnings.push(`Duration "${duration}" is not a positive number of minutes`)
    }
  }

  const randomCount = first(SETTING_COLUMNS.randomCount)
  if (randomCount !== '') {
    const count = Number(randomCount)
    if (Number.isInteger(count) && count >= 1 && count <= questionCount) {
      settings.randomCount = count
    } else {
      warnings.push(`Random Count "${randomCount}" must be a whole number from 1 to ${questionCount}`)
    }
  }

  const pass = first(SETTING_COLUMNS.passPercentage)
  if (pass !== '' && isAssessment) {
    const percentage = Number(pass)
    if (Number.isFinite(percentage) && percentage >= 0 && percentage <= 100) {
      settings.passPercentage = percentage
    } else {
      warnings.push(`Pass Percentage "${pass}" must be from 0 to 100`)
    }
  }

  return { settings, warnings }
}

/** Rows for "Download questions": every question with its hints; settings on the first row. */
export function questionsToSheetRows(questions: any[], settings: SheetSettings, toText: (html: string) => string): any[] {
  return questions.map((question, index) => {
    const options: any[] = Array.isArray(question.options) ? question.options : []
    const row: any = { Question: toText(question.question || '') }
    for (let i = 0; i < OPTION_COUNT; i++) {
      row[`Option ${i + 1}`] = options[i] ? options[i].text : ''
    }
    row['Correct Answer'] = options
      .map((option, i) => (option.isCorrect ? i + 1 : null))
      .filter(n => n !== null)
      .join(', ')
    for (let i = 0; i < OPTION_COUNT; i++) {
      row[`Hint ${i + 1}`] = options[i] ? hintHtmlToText(options[i].hint) : ''
    }
    row[SETTING_COLUMNS.duration] = index === 0 && settings.duration ? settings.duration : ''
    row[SETTING_COLUMNS.randomCount] = index === 0 && settings.randomCount ? settings.randomCount : ''
    row[SETTING_COLUMNS.passPercentage] =
      index === 0 && settings.passPercentage !== undefined && settings.passPercentage !== null ? settings.passPercentage : ''
    return row
  })
}

/** Example rows for the downloadable template. */
export function templateRows(): any[] {
  const blank = (row: any) => {
    ALL_COLUMNS.forEach(column => {
      if (!(column in row)) {
        row[column] = ''
      }
    })
    return row
  }
  return [
    blank({
      Question: 'Which vitamin does sunlight help the body make?',
      'Option 1': 'Vitamin A',
      'Option 2': 'Vitamin C',
      'Option 3': 'Vitamin D',
      'Option 4': 'Vitamin K',
      'Correct Answer': '3',
      'Hint 1': 'Vitamin A comes mainly from food such as carrots.',
      'Hint 3': 'Correct: skin makes vitamin D in sunlight.',
      [SETTING_COLUMNS.duration]: 30,
      [SETTING_COLUMNS.randomCount]: 2,
      [SETTING_COLUMNS.passPercentage]: 60,
    }),
    blank({
      Question: 'Which of these are danger signs in pregnancy? (select all)',
      'Option 1': 'Severe headache',
      'Option 2': 'Mild tiredness',
      'Option 3': 'Bleeding',
      'Correct Answer': '1, 3',
      'Hint 2': 'Mild tiredness is common and usually not a danger sign.',
    }),
  ]
}

/** The "How to fill" sheet that goes with the template. */
export function templateInstructions(): { Column: string; 'How to fill': string }[] {
  return [
    { Column: 'Question', 'How to fill': 'Required. One question per row.' },
    { Column: 'Option 1 - Option 6', 'How to fill': 'At least two options. Leave unused options empty.' },
    {
      Column: 'Correct Answer',
      'How to fill': 'Required. The option number, e.g. 3. For several correct options: 1, 3 (makes it multi-select).',
    },
    { Column: 'Hint 1 - Hint 6', 'How to fill': 'Optional. The hint shown to the learner for that option.' },
    { Column: SETTING_COLUMNS.duration, 'How to fill': 'Optional. Fill once, on the first row. Minutes, e.g. 30.' },
    {
      Column: SETTING_COLUMNS.randomCount,
      'How to fill': 'Optional. Fill once, on the first row. How many questions each learner gets, from 1 to the number of questions.',
    },
    {
      Column: SETTING_COLUMNS.passPercentage,
      'How to fill': 'Optional, assessments only. Fill once, on the first row. From 0 to 100.',
    },
    { Column: 'Limit', 'How to fill': 'Up to 500 questions per upload.' },
  ]
}
