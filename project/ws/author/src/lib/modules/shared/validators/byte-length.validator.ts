import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'

/**
 * Max UTF-8 byte length for rich-text/description fields (e.g. course `instructions`).
 *
 * Elasticsearch keyword sub-fields (the composite-search `instructions.raw`) reject any
 * single term whose UTF-8 encoding exceeds 32,766 bytes with an `illegal_argument_exception`
 * ("immense term"), which crash-loops the Sunbird search-indexer Flink job and stops ALL
 * content from being indexed. We cap well under that limit, leaving headroom for HTML markup
 * and multibyte scripts (e.g. Devanagari is ~3 bytes/char).
 */
export const MAX_INSTRUCTIONS_BYTES = 24000

/** UTF-8 byte length of a string (multibyte-safe). Empty/null => 0. */
export function utf8ByteLength(value: string | null | undefined): number {
  if (!value) {
    return 0
  }
  return new TextEncoder().encode(value).length
}

/**
 * Validator that fails when the control value's UTF-8 byte length exceeds `maxBytes`.
 * Error shape: `{ maxByteLength: { maxBytes, actualBytes } }`.
 */
export function maxByteLengthValidator(maxBytes: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actualBytes = utf8ByteLength(control.value)
    return actualBytes > maxBytes ? { maxByteLength: { maxBytes, actualBytes } } : null
  }
}
