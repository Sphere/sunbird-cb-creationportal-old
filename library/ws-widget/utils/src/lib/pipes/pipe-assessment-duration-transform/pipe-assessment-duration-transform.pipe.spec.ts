import { PipeAssessmentDurationTransformPipe } from './pipe-assessment-duration-transform.pipe'

describe('PipeAssessmentDurationTransformPipe', () => {
  const pipe = new PipeAssessmentDurationTransformPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns an empty string for zero/negative durations', () => {
    expect(pipe.transform(0, 'hms')).toBe('')
    expect(pipe.transform(-1, 'hms')).toBe('')
  })

  describe('hms format', () => {
    it('shows hours only', () => {
      expect(pipe.transform(3600, 'hms')).toBe('1h')
    })
    it('combines hours and minutes', () => {
      expect(pipe.transform(3661, 'hms')).toBe('1h 1m')
    })
    it('combines minutes and seconds under an hour', () => {
      expect(pipe.transform(90, 'hms')).toBe('1m 30s')
    })
    it('shows seconds only under a minute', () => {
      expect(pipe.transform(45, 'hms')).toBe('45s')
    })
  })

  describe('mnts format (numbers only)', () => {
    it('shows seconds only under a minute', () => {
      expect(pipe.transform(45, 'mnts')).toBe('45')
    })
    it('joins minutes and seconds with a space', () => {
      expect(pipe.transform(90, 'mnts')).toBe('1 30')
    })
    it('joins hours and minutes with a space', () => {
      expect(pipe.transform(3661, 'mnts')).toBe('1 1')
    })
  })

  describe('hour format', () => {
    it('says "less than an hour" below 3600s', () => {
      expect(pipe.transform(1800, 'hour')).toBe('less than an hour')
    })
    it('singular vs plural hours', () => {
      expect(pipe.transform(3600, 'hour')).toBe('1 hour')
      expect(pipe.transform(7200, 'hour')).toBe('2 hours')
    })
  })
})
