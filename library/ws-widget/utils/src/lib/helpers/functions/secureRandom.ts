/**
 * Cryptographically-strong replacements for `Math.random()`.
 *
 * None of the call sites in this app are security sensitive — they generate
 * Sunbird content `code` fields, quiz option ids and shuffle indices. But
 * `Math.random()` trips Sonar's S2245 everywhere it appears, and the Web Crypto
 * API is available in every browser this app supports, so there is no reason to
 * keep the weaker primitive.
 *
 * `crypto.getRandomValues` is synchronous and needs no polyfill: every browser
 * Angular 21 supports provides it, and there is no server-side rendering here
 * (dist/server.js only serves static files). Deliberately no `Math.random()`
 * fallback — that would reintroduce the very thing this replaces, and silently
 * producing predictable values is worse than failing loudly.
 */

function randomBytes(count: number): Uint8Array {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('secureRandom: Web Crypto (crypto.getRandomValues) is unavailable')
  }
  const buffer = new Uint8Array(count)
  cryptoObj.getRandomValues(buffer)
  return buffer
}

/**
 * An integer in `[0, maxExclusive)`.
 *
 * Rejection sampling keeps the distribution uniform: taking a plain modulo of a
 * byte would bias the low values whenever 256 is not a multiple of the range.
 */
export function randomInt(maxExclusive: number): number {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
    return 0
  }
  const range = Math.floor(maxExclusive)
  if (range === 1) {
    return 0
  }
  // Largest multiple of `range` that fits in a byte; values above it are re-drawn.
  const limit = Math.floor(256 / range) * range
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const byte = randomBytes(1)[0]
    if (byte < limit) {
      return byte % range
    }
  }
  return randomBytes(1)[0] % range
}

/**
 * A string of exactly `length` decimal digits, e.g. `randomDigits(16)`.
 *
 * Replaces the `for (…16…) { randomNumber += Math.floor(Math.random() * 10) }`
 * loop that builds Sunbird content `code` values.
 */
export function randomDigits(length: number): string {
  if (!Number.isFinite(length) || length <= 0) {
    return ''
  }
  let out = ''
  for (let i = 0; i < Math.floor(length); i += 1) {
    out += String(randomInt(10))
  }
  return out
}
