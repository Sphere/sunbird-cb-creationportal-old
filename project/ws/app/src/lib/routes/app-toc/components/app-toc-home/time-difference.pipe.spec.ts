import moment from 'moment-timezone'

import { TimeDifferencePipe } from './time-difference.pipe'

describe('TimeDifferencePipe', () => {
  const pipe = new TimeDifferencePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns the relative time of a UTC value in Asia/Kolkata', () => {
    const value = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const expected = moment.utc(value).tz('Asia/Kolkata').fromNow()
    expect(pipe.transform(value)).toBe(expected)
  })
})
