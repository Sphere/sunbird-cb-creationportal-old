import { stripHtmlTags } from './stripHtmlTags'

/**
 * Consolidated from four call sites that each wrote the expression out: the
 * html-tag-removal pipe, the resource download service, the module form and the quiz
 * export.
 */
describe('stripHtmlTags', () => {
  it.each([
    ['a simple tag', '<p>hello</p>', 'hello'],
    ['nested tags', '<div><p>hello <b>there</b></p></div>', 'hello there'],
    ['a tag with attributes', '<a href="http://x" target="_blank">link</a>', 'link'],
    ['a self-closing tag', 'before<br/>after', 'beforeafter'],
    ['a multi-line tag', '<p\n  class="x"\n>text</p>', 'text'],
    ['text with no tags', 'just text', 'just text'],
    ['tags spanning lines', '<p>one</p>\n<p>two</p>', 'one\ntwo'],
  ])('strips %s', (_label, input, expected) => {
    expect(stripHtmlTags(input)).toBe(expected)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
  ])('returns an empty string for %s', (_label, input) => {
    expect(stripHtmlTags(input as any)).toBe('')
  })

  it('coerces a non-string rather than throwing', () => {
    expect(stripHtmlTags(42 as any)).toBe('42')
  })

  // The pipe previously used <[^>]+>, which required at least one character inside the
  // brackets and so left a bare '<>' in place. The shared expression uses * and strips
  // it. '<>' is not a valid tag, so this only affects malformed markup.
  it('strips a bare <>, which the pipe used to leave behind', () => {
    expect(stripHtmlTags('a<>b')).toBe('ab')
  })

  // Everything between a '<' and the next '>' is treated as a tag, so prose containing
  // comparison operators loses the text between them. All four original call sites
  // behaved this way, so this pins existing behaviour rather than blessing it -- worth
  // knowing before using this on arbitrary prose.
  it('eats text between comparison operators, treating it as a tag', () => {
    expect(stripHtmlTags('5 < 10 and 20 > 15')).toBe('5  15')
  })

  it('leaves a lone < or > alone when there is no closing bracket', () => {
    expect(stripHtmlTags('5 < 10')).toBe('5 < 10')
    expect(stripHtmlTags('20 > 15')).toBe('20 > 15')
  })

  it('is linear on a long tagless input, so no catastrophic backtracking', () => {
    const input = `${'a'.repeat(50000)}<p>x</p>`
    const started = process.hrtime.bigint()
    expect(stripHtmlTags(input)).toBe(`${'a'.repeat(50000)}x`)
    const ms = Number(process.hrtime.bigint() - started) / 1e6
    expect(ms).toBeLessThan(1000)
  })

  // This removes markup, it does not sanitize: the result is safe as text but must not
  // be fed back into innerHTML.
  it('does not decode entities, so it is not a sanitizer', () => {
    expect(stripHtmlTags('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
