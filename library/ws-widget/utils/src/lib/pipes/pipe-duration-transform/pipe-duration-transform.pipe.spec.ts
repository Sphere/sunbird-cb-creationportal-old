import { PipeDurationTransformPipe } from './pipe-duration-transform.pipe'

describe('PipeDurationTransformPipe', () => {
  const pipe = new PipeDurationTransformPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns an empty string for zero/negative durations', () => {
    expect(pipe.transform(0, 'hms')).toBe('')
    expect(pipe.transform(-10, 'hms')).toBe('')
  })

  describe('hms format', () => {
    it('shows only hours when minutes/seconds are zero', () => {
      expect(pipe.transform(3600, 'hms')).toBe('1h')
    })
    it('combines hours and minutes (seconds omitted once hours present)', () => {
      expect(pipe.transform(3661, 'hms')).toBe('1h 1m')
    })
    it('shows minutes and seconds when under an hour', () => {
      expect(pipe.transform(90, 'hms')).toBe('1m 30s')
    })
    it('shows only seconds when under a minute', () => {
      expect(pipe.transform(45, 'hms')).toBe('45s')
    })
  })

  describe('HMS format', () => {
    it('combines hours and minutes', () => {
      expect(pipe.transform(3661, 'HMS')).toBe('1Hour(s) 1Minutes')
    })
    it('combines minutes and seconds under an hour', () => {
      expect(pipe.transform(90, 'HMS')).toBe('1Minutes 30Seconds')
    })
  })

  describe('hour format', () => {
    it('says "less than an hour" below 3600s', () => {
      expect(pipe.transform(1800, 'hour')).toBe('less than an hour')
    })
    it('uses singular for exactly one hour', () => {
      expect(pipe.transform(3600, 'hour')).toBe('1 hour')
    })
    it('uses plural for multiple hours', () => {
      expect(pipe.transform(7200, 'hour')).toBe('2 hours')
    })
  })
})
