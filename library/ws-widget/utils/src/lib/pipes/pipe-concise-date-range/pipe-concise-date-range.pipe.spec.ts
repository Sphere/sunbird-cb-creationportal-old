import { PipeConciseDateRangePipe } from './pipe-concise-date-range.pipe'

describe('PipeConciseDateRangePipe', () => {
  const pipe = new PipeConciseDateRangePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns a single date when from and to are the same instant', () => {
    const d = new Date(2024, 0, 5)
    expect(pipe.transform({ fromDate: d, toDate: d })).toBe('5 Jan 2024')
  })

  it('collapses the month when from and to share the same month', () => {
    const fromDate = new Date(2024, 0, 5)
    const toDate = new Date(2024, 0, 9)
    expect(pipe.transform({ fromDate, toDate })).toBe('5 - 9 Jan 2024')
  })

  it('shows both months when from and to differ', () => {
    const fromDate = new Date(2024, 0, 5)
    const toDate = new Date(2024, 1, 9)
    expect(pipe.transform({ fromDate, toDate })).toBe('5 Jan - 9 Feb 2024')
  })

  it('still produces a range string for malformed dates', () => {
    const result = pipe.transform({ fromDate: 'invalid' as any, toDate: 'invalid' as any } as any)
    expect(result).toContain(' - ')
  })
})
