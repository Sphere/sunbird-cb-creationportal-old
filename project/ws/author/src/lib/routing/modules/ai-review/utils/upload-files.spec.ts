import { IAiReviewUploadContext } from '../models/ai-review.model'
import { ACCEPT_ATTRIBUTE, estimateFor, extOf, fileProblem, formatBytes, kindForFile, readQuizSheet } from './upload-files'

const sheetRows = { current: [] as unknown[][] }
const readFails = { current: false }
jest.mock('xlsx', () => ({
  read: jest.fn(() => {
    if (readFails.current) {
      throw new Error('bad zip')
    }
    return { SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }
  }),
  utils: { sheet_to_json: jest.fn(() => sheetRows.current) },
}))

/** A picked file, as far as these helpers read it (jsdom's Blob has no arrayBuffer). */
const picked = (): Blob => ({ arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as Blob

const text = (blob: Blob): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })

const MB = 1024 * 1024
const accepted: IAiReviewUploadContext['accepted'] = {
  video: { extensions: ['.mp4'], maxBytes: 300 * MB },
  pdf: { extensions: ['.pdf'], maxBytes: 300 * MB },
  quiz: { extensions: ['.xlsx', '.xls'], maxBytes: 5 * MB },
  assessment: { extensions: ['.xlsx', '.xls'], maxBytes: 5 * MB },
}

describe('upload files', () => {
  beforeEach(() => {
    sheetRows.current = []
    readFails.current = false
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  it('takes a file by its extension, whatever its case, and offers every kind in the picker', () => {
    expect(extOf('Clip.Final.MP4')).toBe('.mp4')
    expect(extOf('README')).toBe('')
    expect(kindForFile('bp.mov')).toBe('video')
    expect(kindForFile('notes.PDF')).toBe('pdf')
    expect(kindForFile('quiz.xlsx')).toBe('quiz')
    expect(kindForFile('old.xls')).toBe('quiz')
    expect(kindForFile('slides.pptx')).toBeNull()
    expect(ACCEPT_ATTRIBUTE.split(',')).toEqual(expect.arrayContaining(['.mp4', '.pdf', '.xlsx']))
  })

  it('writes sizes people read at a glance', () => {
    expect(formatBytes(0)).toBe('')
    expect(formatBytes(null)).toBe('')
    expect(formatBytes(300)).toBe('1 KB')
    expect(formatBytes(820 * 1024)).toBe('820 KB')
    expect(formatBytes(1.4 * MB)).toBe('1.4 MB')
    expect(formatBytes(240 * MB)).toBe('240 MB')
  })

  it('says why a file cannot be added: its type, that it is empty, or its size', () => {
    expect(fileProblem({ name: 'deck.pptx', size: 10 }, accepted)).toMatch(/Not a file the review takes/)
    expect(fileProblem({ name: 'a.mp4', size: 0 }, accepted)).toBe('This file is empty.')
    expect(fileProblem({ name: 'a.mp4', size: 301 * MB }, accepted)).toBe('Larger than 300 MB, the most one file may be.')
    expect(fileProblem({ name: 'a.mp4', size: 10 * MB }, accepted)).toBeNull()
    // A sheet is sent as its questions, so the sheet's own size is not the limit.
    expect(fileProblem({ name: 'big.xlsx', size: 50 * MB }, accepted)).toBeNull()
    // Without the server's limits, only type and emptiness are checked.
    expect(fileProblem({ name: 'a.pdf', size: 900 * MB }, null)).toBeNull()
  })

  it('adds up the estimate for the reviews switched on', () => {
    const parts = [
      { base: 0.01, addie: 0.05, domain: 0.1, watch: 0.2 },
      { base: 0.01, addie: 0.04, domain: 0.08, watch: 0 },
    ]
    expect(estimateFor(parts, { addie: true, domain: true, watch: true })).toBe(0.49)
    expect(estimateFor(parts, { addie: true, domain: false, watch: false })).toBe(0.11)
    expect(estimateFor(parts, { addie: false, domain: false, watch: true })).toBe(0)
    expect(estimateFor([], { addie: true, domain: true, watch: true })).toBe(0)
  })

  describe('reading a quiz sheet', () => {
    const header = ['Question', 'Option 1', 'Option 2', 'Option 3', 'Correct Answer', 'Hint 1']

    it("reads the questions with Course Builder's parser and sends them as JSON", async () => {
      sheetRows.current = [header, ['Normal BP?', '120/80', '160/110', '', '1', 'Think of the textbook value']]
      const read = await readQuizSheet(picked(), 'quiz')
      expect(read.error).toBeNull()
      expect(read.warning).toBeNull()
      expect(read.body.type).toBe('application/json')
      const sent = JSON.parse(await text(read.body))
      expect(sent.questions).toHaveLength(1)
      expect(sent.questions[0].question).toBe('Normal BP?')
      expect(sent.questions[0].options.map((o: { text: string; isCorrect: boolean }) => [o.text, o.isCorrect])).toEqual([
        ['120/80', true],
        ['160/110', false],
      ])
    })

    it('says so when the sheet has no questions in the template', async () => {
      sheetRows.current = [['Something else'], ['x']]
      const read = await readQuizSheet(picked(), 'assessment')
      expect(read.error).toMatch(/No questions were found/)
    })

    it('says so when the file is not a readable workbook', async () => {
      readFails.current = true
      const read = await readQuizSheet(picked(), 'quiz')
      expect(read.error).toMatch(/could not be read/)
    })

    it('warns that only the first 500 rows are read', async () => {
      sheetRows.current = [header, ...Array.from({ length: 501 }, (_, i) => [`Q${i}`, 'a', 'b', '', '1', ''])]
      const read = await readQuizSheet(picked(), 'quiz')
      expect(read.error).toBeNull()
      expect(read.warning).toMatch(/Only the first 500 rows/)
      expect(read.sheet.questions).toHaveLength(500)
    })
  })
})
