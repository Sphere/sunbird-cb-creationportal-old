import moment from 'moment-timezone'

import { MomentDatePipe } from './moment-date.pipe'

describe('MomentDatePipe', () => {
  const pipe = new MomentDatePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns the value unchanged when falsy', () => {
    expect(pipe.transform('')).toBe('')
    expect(pipe.transform(null)).toBeNull()
  })

  it('formats a UTC value in the Asia/Kolkata timezone', () => {
    const value = '2024-01-05T00:00:00Z'
    const expected = moment.utc(value).tz('Asia/Kolkata').format('DD/MM/YY hh:mm:ss A')
    expect(pipe.transform(value)).toBe(expected)
  })

  it('honours a custom format string', () => {
    const value = '2024-01-05T00:00:00Z'
    const expected = moment.utc(value).tz('Asia/Kolkata').format('YYYY-MM-DD')
    expect(pipe.transform(value, 'YYYY-MM-DD')).toBe(expected)
  })
})
