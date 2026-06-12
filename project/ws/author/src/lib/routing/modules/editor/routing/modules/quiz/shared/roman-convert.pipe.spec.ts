import { RomanConvertPipe } from './roman-convert.pipe'

describe('RomanConvertPipe', () => {
  let pipe: RomanConvertPipe

  beforeEach(() => (pipe = new RomanConvertPipe()))

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('converts simple numerals', () => {
    expect(pipe.transform(1)).toBe('I')
    expect(pipe.transform(3)).toBe('III')
    expect(pipe.transform(5)).toBe('V')
    expect(pipe.transform(10)).toBe('X')
  })

  it('converts subtractive forms', () => {
    expect(pipe.transform(4)).toBe('IV')
    expect(pipe.transform(9)).toBe('IX')
    expect(pipe.transform(40)).toBe('XL')
    expect(pipe.transform(90)).toBe('XC')
  })

  it('converts compound numbers', () => {
    expect(pipe.transform(2023)).toBe('MMXXIII')
    expect(pipe.transform(1990)).toBe('MCMXC')
  })

  it('returns an empty string for zero', () => {
    expect(pipe.transform(0)).toBe('')
  })

  it('resets state between calls (no leakage from the previous value)', () => {
    expect(pipe.transform(4)).toBe('IV')
    expect(pipe.transform(6)).toBe('VI')
  })
})
