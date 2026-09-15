/**
 * Helpers for the CBP contact metadata fields -- `reviewer`, `creatorContacts`,
 * `creatorDetails` and `publisherDetails`.
 *
 * The legacy platform returned these as JSON strings. Sunbird Spark returns
 * them as arrays: they are absent from the deployed content schema, so whatever
 * was last written round-trips verbatim instead of being coerced to a string.
 *
 * `JSON.parse` on an array first stringifies it to "[object Object]" and then
 * throws, so the old `jsonVerify(x) ? JSON.parse(x) : []` idiom quietly yielded
 * `[]` and dropped the selected reviewers.
 */

/** Read a contact field that may arrive as a JSON string, an array or an object. */
export function parseJsonList(raw: unknown): any[] {
  if (raw === null || raw === undefined || raw === '') {
    return []
  }
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw === 'object') {
    return [raw]
  }
  try {
    const parsed = JSON.parse(raw as string)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return parsed === null || parsed === undefined ? [] : [parsed]
  } catch {
    return []
  }
}

/**
 * `reviewer` is the one contact field the content schema types as a string, so
 * sending an array fails content/v3/update with "Metadata reviewer should be
 * a/an String value". Always hand the API a JSON string.
 */
export function toJsonString(raw: unknown): unknown {
  if (raw === null || raw === undefined || typeof raw === 'string') {
    return raw
  }
  return JSON.stringify(raw)
}
