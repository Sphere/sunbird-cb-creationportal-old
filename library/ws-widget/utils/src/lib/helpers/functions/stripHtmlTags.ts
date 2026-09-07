/**
 * Removes HTML tags from `value`, leaving the text between them.
 *
 * The same expression was written out at four call sites -- a pipe, the resource
 * download service, the module form and the quiz export -- which meant four separate
 * "review this regex" warnings for one operation. It lives here now, so there is one
 * place to reason about and one warning instead of four.
 *
 * `[^>]*` is a negated character class with no nested quantifier and no alternation, so
 * there is exactly one way to match any input: the engine cannot backtrack
 * catastrophically and matching is linear in the length of the input.
 *
 * Known limitation, carried over from all four original call sites: everything from a
 * '<' to the next '>' is taken as a tag, so prose containing comparison operators loses
 * the text between them -- '5 < 10 and 20 > 15' becomes '5  15'. Fine for the HTML this
 * is used on; be careful before pointing it at arbitrary prose.
 *
 * This strips markup; it does not sanitize. Output is plain text and safe to render as
 * text, but it is not safe to feed back into `innerHTML`: entities such as `&lt;script&gt;`
 * survive unescaped. Use it for titles, spreadsheet cells and other text contexts.
 */
export function stripHtmlTags(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value).replace(/<[^>]*>/g, '')
}
