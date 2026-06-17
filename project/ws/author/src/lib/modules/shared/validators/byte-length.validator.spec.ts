import { FormControl } from '@angular/forms'

import { MAX_INSTRUCTIONS_BYTES, maxByteLengthValidator, utf8ByteLength } from './byte-length.validator'

describe('byte-length.validator', () => {
  describe('utf8ByteLength', () => {
    it('returns 0 for null / undefined / empty', () => {
      expect(utf8ByteLength(null)).toBe(0)
      expect(utf8ByteLength(undefined)).toBe(0)
      expect(utf8ByteLength('')).toBe(0)
    })

    it('counts ASCII as 1 byte/char', () => {
      expect(utf8ByteLength('hello')).toBe(5)
    })

    it('counts Devanagari (Hindi) as ~3 bytes/char', () => {
      // "स्तन" — multibyte; must be > its character length
      const text = 'स्तन'
      expect(utf8ByteLength(text)).toBeGreaterThan(text.length)
      expect(utf8ByteLength('क')).toBe(3)
    })
  })

  describe('maxByteLengthValidator', () => {
    const validate = maxByteLengthValidator(MAX_INSTRUCTIONS_BYTES)

    it('passes when under the byte limit', () => {
      expect(validate(new FormControl('a short description'))).toBeNull()
    })

    it('passes for empty value (required-ness is a separate validator)', () => {
      expect(validate(new FormControl(''))).toBeNull()
    })

    it('fails when over the byte limit and reports actual/max bytes', () => {
      const big = 'a'.repeat(MAX_INSTRUCTIONS_BYTES + 1)
      const result = validate(new FormControl(big))
      expect(result).toEqual({ maxByteLength: { maxBytes: MAX_INSTRUCTIONS_BYTES, actualBytes: MAX_INSTRUCTIONS_BYTES + 1 } })
    })

    it('measures bytes (not characters) — multibyte content trips the limit sooner', () => {
      // ~9,000 Devanagari chars => ~27,000 bytes (> 24,000) even though char count < limit
      const hindi = 'क'.repeat(9000)
      expect(hindi.length).toBeLessThan(MAX_INSTRUCTIONS_BYTES)
      const result = maxByteLengthValidator(MAX_INSTRUCTIONS_BYTES)(new FormControl(hindi))
      expect(result).not.toBeNull()
      expect(result!['maxByteLength'].actualBytes).toBe(27000)
    })

    it('stays under the Elasticsearch 32,766-byte keyword limit with headroom', () => {
      expect(MAX_INSTRUCTIONS_BYTES).toBeLessThan(32766)
    })
  })
})
