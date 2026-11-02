import {
  ALL_COLUMNS,
  SETTING_COLUMNS,
  cell,
  hintHtmlToText,
  hintTextToHtml,
  questionsToSheetRows,
  readSheetSettings,
  templateInstructions,
  templateRows,
} from './quiz-sheet.util'

describe('quiz-sheet.util', () => {
  describe('cell', () => {
    it('matches a column regardless of case and extra spaces', () => {
      expect(cell({ ' hint  1 ': 'x' }, 'Hint 1')).toBe('x')
      expect(cell({ 'RANDOM COUNT': 5 }, 'Random Count')).toBe('5')
    })

    it('returns an empty string for a missing or empty cell', () => {
      expect(cell({}, 'Hint 1')).toBe('')
      expect(cell({ 'Hint 1': null }, 'Hint 1')).toBe('')
    })
  })

  describe('hints', () => {
    it('stores sheet text as the HTML the hint editor uses, keeping markup literal', () => {
      expect(hintTextToHtml('Because 2 < 3 & 4 > 1')).toBe('<p>Because 2 &lt; 3 &amp; 4 &gt; 1</p>')
      expect(hintTextToHtml('line one\nline two')).toBe('<p>line one<br>line two</p>')
    })

    it('turns stored hint HTML back into plain text, round-tripping', () => {
      const text = 'Because 2 < 3 & 4 > 1\nsecond line'
      expect(hintHtmlToText(hintTextToHtml(text))).toBe(text)
      expect(hintHtmlToText('<p>One</p><p>Two&nbsp;words</p>')).toBe('One\nTwo words')
      expect(hintHtmlToText(undefined)).toBe('')
    })
  })

  describe('readSheetSettings', () => {
    const rows = (...values: any[]) => values

    it('takes each setting from the first row that fills it in', () => {
      const { settings, warnings } = readSheetSettings(
        rows(
          { [SETTING_COLUMNS.duration]: '', [SETTING_COLUMNS.randomCount]: 3 },
          { [SETTING_COLUMNS.duration]: 45, [SETTING_COLUMNS.passPercentage]: 70 },
          { [SETTING_COLUMNS.duration]: 99 },
        ),
        10,
        true,
      )
      expect(settings).toEqual({ duration: 45, randomCount: 3, passPercentage: 70 })
      expect(warnings).toEqual([])
    })

    it('returns no settings for a sheet from the old template', () => {
      expect(readSheetSettings(rows({ Question: 'Q' }), 5, true)).toEqual({ settings: {}, warnings: [] })
    })

    it('accepts a duration over 100 minutes', () => {
      expect(readSheetSettings(rows({ [SETTING_COLUMNS.duration]: 150 }), 5, true).settings.duration).toBe(150)
    })

    it('rejects invalid values with a warning instead of saving them', () => {
      const { settings, warnings } = readSheetSettings(
        rows({ [SETTING_COLUMNS.duration]: 'abc', [SETTING_COLUMNS.randomCount]: 12, [SETTING_COLUMNS.passPercentage]: 140 }),
        10,
        true,
      )
      expect(settings).toEqual({})
      expect(warnings).toHaveLength(3)
      expect(warnings[1]).toContain('from 1 to 10')
    })

    it('rejects a zero, negative or fractional random count', () => {
      for (const bad of [0, -2, 2.5]) {
        expect(readSheetSettings(rows({ [SETTING_COLUMNS.randomCount]: bad }), 10, true).settings.randomCount).toBeUndefined()
      }
    })

    it('ignores Pass Percentage for a quiz', () => {
      const { settings, warnings } = readSheetSettings(rows({ [SETTING_COLUMNS.passPercentage]: 140 }), 5, false)
      expect(settings).toEqual({})
      expect(warnings).toEqual([])
    })
  })

  describe('questionsToSheetRows', () => {
    const questions = [
      {
        question: '<p>2 + 2?</p>',
        options: [
          { text: '4', isCorrect: true, hint: '<p>Correct</p>' },
          { text: '5', isCorrect: false },
        ],
      },
      {
        question: 'Pick two',
        options: [
          { text: 'a', isCorrect: true },
          { text: 'b', isCorrect: true },
        ],
      },
    ]
    const strip = (html: string) => html.replaceAll(/<[^>]*>/g, '')

    it('exports options, correct answers and hints in the upload format', () => {
      const [first, second] = questionsToSheetRows(questions, {}, strip)
      expect(first.Question).toBe('2 + 2?')
      expect(first['Option 1']).toBe('4')
      expect(first['Option 3']).toBe('')
      expect(first['Correct Answer']).toBe('1')
      expect(first['Hint 1']).toBe('Correct')
      expect(first['Hint 2']).toBe('')
      expect(second['Correct Answer']).toBe('1, 2')
    })

    it('puts the settings on the first row only', () => {
      const [first, second] = questionsToSheetRows(questions, { duration: 30, randomCount: 1, passPercentage: 0 }, strip)
      expect(first[SETTING_COLUMNS.duration]).toBe(30)
      expect(first[SETTING_COLUMNS.randomCount]).toBe(1)
      expect(first[SETTING_COLUMNS.passPercentage]).toBe(0)
      expect(second[SETTING_COLUMNS.duration]).toBe('')
    })
  })

  describe('template', () => {
    it('has every column, and example rows that import cleanly', () => {
      const rows = templateRows()
      rows.forEach(row => expect(Object.keys(row).sort()).toEqual([...ALL_COLUMNS].sort()))
      const { settings, warnings } = readSheetSettings(rows, rows.length, true)
      expect(warnings).toEqual([])
      expect(settings.randomCount).toBeLessThanOrEqual(rows.length)
    })

    it('explains every column group', () => {
      const columns = templateInstructions().map(i => i.Column)
      expect(columns).toEqual(expect.arrayContaining(['Question', 'Correct Answer', 'Hint 1 - Hint 6', SETTING_COLUMNS.randomCount]))
    })
  })
})
