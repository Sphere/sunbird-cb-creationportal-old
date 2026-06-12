import { PipeCountTransformPipe } from './pipe-count-transform.pipe'

describe('PipeCountTransformPipe', () => {
  const pipe = new PipeCountTransformPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns "0" for zero or negative values', () => {
    expect(pipe.transform(0)).toBe('0')
    expect(pipe.transform(-5)).toBe('0')
  })

  it('returns the plain number below 1000', () => {
    expect(pipe.transform(1)).toBe('1')
    expect(pipe.transform(999)).toBe('999')
  })

  it('formats thousands with a K suffix, dropping a trailing .0', () => {
    expect(pipe.transform(1000)).toBe('1K')
    expect(pipe.transform(1500)).toBe('1.5K')
    expect(pipe.transform(999999)).toBe('1000K')
  })

  it('formats millions with an M suffix, dropping a trailing .0', () => {
    expect(pipe.transform(1000000)).toBe('1M')
    expect(pipe.transform(2500000)).toBe('2.5M')
    expect(pipe.transform(1200000)).toBe('1.2M')
  })
})
