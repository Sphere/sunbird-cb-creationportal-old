import { randomDigits, randomInt } from './secureRandom'

describe('secureRandom', () => {
  describe('randomInt', () => {
    it('stays within [0, max)', () => {
      for (let i = 0; i < 500; i += 1) {
        const v = randomInt(10)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(10)
        expect(Number.isInteger(v)).toBe(true)
      }
    })

    it('returns 0 for a range of 1', () => {
      expect(randomInt(1)).toBe(0)
    })

    it('returns 0 for nonsensical ranges rather than NaN', () => {
      expect(randomInt(0)).toBe(0)
      expect(randomInt(-5)).toBe(0)
      expect(randomInt(Number.NaN)).toBe(0)
    })

    it('covers the whole range over many draws', () => {
      const seen = new Set<number>()
      for (let i = 0; i < 2000; i += 1) {
        seen.add(randomInt(10))
      }
      // all ten digits should appear; a modulo bias or a stuck byte would not
      expect(seen.size).toBe(10)
    })

    it('is roughly uniform (no modulo bias)', () => {
      const counts = new Array(10).fill(0)
      const draws = 20000
      for (let i = 0; i < draws; i += 1) {
        counts[randomInt(10)] += 1
      }
      const expected = draws / 10
      // generous bound: catches systematic bias, tolerates normal variance
      counts.forEach(c => {
        expect(c).toBeGreaterThan(expected * 0.7)
        expect(c).toBeLessThan(expected * 1.3)
      })
    })
  })

  describe('randomDigits', () => {
    it('produces exactly the requested number of digits', () => {
      expect(randomDigits(16)).toMatch(/^[0-9]{16}$/)
      expect(randomDigits(1)).toMatch(/^[0-9]$/)
    })

    it('matches the shape of the 16-digit content code it replaces', () => {
      for (let i = 0; i < 100; i += 1) {
        const code = randomDigits(16)
        expect(code).toHaveLength(16)
        expect(code).toMatch(/^[0-9]+$/)
      }
    })

    it('returns an empty string for a non-positive length', () => {
      expect(randomDigits(0)).toBe('')
      expect(randomDigits(-1)).toBe('')
    })

    it('does not repeat itself', () => {
      const seen = new Set<string>()
      for (let i = 0; i < 200; i += 1) {
        seen.add(randomDigits(16))
      }
      expect(seen.size).toBe(200)
    })
  })

  describe('when Web Crypto is unavailable', () => {
    it('fails loudly rather than falling back to a weak source', () => {
      const original = (globalThis as any).crypto
      try {
        Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })

        // Silently degrading to Math.random() would reintroduce exactly what
        // this helper exists to remove, so an explicit failure is correct.
        expect(() => randomInt(10)).toThrow(/Web Crypto/)
        expect(() => randomDigits(16)).toThrow(/Web Crypto/)
      } finally {
        Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true })
      }
    })
  })
})
