import { formatOf, kindFromMime, kindLine, kindMeta, pipelineProgress } from './resource-kind'

describe('resource kinds', () => {
  it('describes each kind with a label, an icon and its review steps', () => {
    expect(kindMeta('video')).toMatchObject({ label: 'Video', icon: 'video' })
    expect(kindMeta('video').steps.map(s => s.label)).toEqual(['Download', 'Watch & transcribe', 'Score'])
    expect(kindMeta('pdf').steps.map(s => s.label)).toEqual(['Download', 'Read pages', 'Score'])
    expect(kindMeta('quiz').steps.map(s => s.label)).toEqual(['Load questions', 'Check each question', 'Score'])
    expect(kindMeta('assessment')).toMatchObject({ label: 'Assessment', icon: 'assessment' })
    expect(kindMeta('html').steps).toEqual([])
  })

  it('falls back to a generic resource', () => {
    expect(kindMeta(null)).toMatchObject({ label: 'Resource', icon: 'document' })
    expect(kindMeta('hologram').label).toBe('Resource')
  })

  it('reads the kind from a mimetype', () => {
    expect(kindFromMime('video/mp4')).toBe('video')
    expect(kindFromMime('video/x-youtube')).toBe('video')
    expect(kindFromMime('application/pdf')).toBe('pdf')
    expect(kindFromMime('application/json')).toBe('quiz')
    expect(kindFromMime('audio/mpeg')).toBe('audio')
    expect(kindFromMime('application/vnd.ekstep.html-archive')).toBe('html')
    expect(kindFromMime('text/x-url')).toBe('link')
    expect(kindFromMime(undefined)).toBe('other')
  })

  it('writes a type line without repeats or JSON', () => {
    expect(kindLine('video', 'video/mp4')).toBe('Video · MP4')
    expect(kindLine('pdf', 'application/pdf')).toBe('PDF')
    expect(kindLine('quiz', 'application/json')).toBe('Quiz')
    expect(kindLine('assessment', 'application/json')).toBe('Assessment')
    expect(kindLine(null, undefined)).toBe('Resource')
    expect(kindMeta('quiz').plural).toBe('Quizzes')
  })

  it('names the file format', () => {
    expect(formatOf('video/mp4')).toBe('MP4')
    expect(formatOf('application/pdf')).toBe('PDF')
    expect(formatOf('application/vnd.ekstep.html-archive')).toBe('HTML')
    expect(formatOf('image/png')).toBe('PNG')
    expect(formatOf('application/vnd.something-very-long')).toBe('')
    expect(formatOf(null)).toBe('')
  })

  it("maps every kind's stage wording onto the three steps", () => {
    expect(pipelineProgress({ status: 'queued', stage: null })).toBe(-1)
    expect(pipelineProgress({ status: 'running', stage: 'Downloading the PDF…' })).toBe(0)
    expect(pipelineProgress({ status: 'running', stage: 'Reading the pages…' })).toBe(1)
    expect(pipelineProgress({ status: 'running', stage: 'Loading the questions and answer key…' })).toBe(0)
    expect(pipelineProgress({ status: 'running', stage: 'Checking each question and its answer…' })).toBe(1)
    expect(pipelineProgress({ status: 'running', stage: 'Scoring and judging against the competency…' })).toBe(2)
    expect(pipelineProgress({ status: 'done', stage: null })).toBe(3)
  })
})
