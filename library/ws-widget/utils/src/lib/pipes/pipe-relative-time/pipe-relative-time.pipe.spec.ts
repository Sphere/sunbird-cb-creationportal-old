import moment from 'moment'

import { PipeRelativeTimePipe } from './pipe-relative-time.pipe'

describe('PipeRelativeTimePipe', () => {
  const pipe = new PipeRelativeTimePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns the relative time for a given timestamp', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    expect(pipe.transform(twoHoursAgo)).toBe(moment(new Date(twoHoursAgo)).fromNow())
  })

  it('falls back to the start of the current hour when no value is given', () => {
    expect(pipe.transform(0)).toBe(moment().startOf('hour').fromNow())
  })
})
