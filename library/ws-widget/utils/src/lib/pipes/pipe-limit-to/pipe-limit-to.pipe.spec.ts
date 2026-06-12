import { PipeLimitToPipe } from './pipe-limit-to.pipe'

describe('PipeLimitToPipe', () => {
  const pipe = new PipeLimitToPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns null for empty/falsy input', () => {
    expect(pipe.transform(null)).toBeNull()
    expect(pipe.transform([])).toBeNull()
    expect(pipe.transform('')).toBeNull()
  })

  describe('arrays', () => {
    it('slices an array longer than the limit', () => {
      expect(pipe.transform([1, 2, 3, 4], 2)).toEqual([1, 2])
    })

    it('returns the whole array when shorter than the limit', () => {
      expect(pipe.transform([1, 2], 5)).toEqual([1, 2])
    })

    it('defaults the limit to 5', () => {
      expect(pipe.transform([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('strings', () => {
    it('truncates and appends an ellipsis when longer than the limit', () => {
      expect(pipe.transform('abcdefgh', 3)).toBe('abc...')
    })

    it('does not append an ellipsis when within the limit', () => {
      expect(pipe.transform('abc', 5)).toBe('abc')
    })
  })

  it('returns null for unsupported types (e.g. a number)', () => {
    expect(pipe.transform(42 as any)).toBeNull()
  })
})
