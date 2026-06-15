import { PipeDateConcatPipe } from './pipe-date-concat.pipe'

describe('PipeDateConcatPipe', () => {
  const pipe = new PipeDateConcatPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('formats day, month name and year', () => {
    expect(pipe.transform({ day: 5, month: 1, year: 2024 })).toBe('5 Jan 2024')
    expect(pipe.transform({ day: 31, month: 12, year: 2023 })).toBe('31 Dec 2023')
  })

  it('appends the time zone when provided', () => {
    expect(pipe.transform({ day: 1, month: 6, year: 2024, timeZone: 'IST' })).toBe('1 Jun 2024 IST')
  })
})
