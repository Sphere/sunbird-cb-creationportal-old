import { parseCertTemplates } from './certificate-templates'

describe('parseCertTemplates', () => {
  const ok = { id: 'classic', name: 'Classic', description: 'Framed', url: 'https://bucket/classic.svg' }

  it('keeps well-formed entries, in order', () => {
    const second = { ...ok, id: 'modern', name: 'Modern', url: 'https://bucket/modern.svg' }
    expect(parseCertTemplates([ok, second])).toEqual([ok, second])
  })

  it('treats a missing or malformed list as no designs', () => {
    ;[undefined, null, {}, 'x', 3].forEach(raw => expect(parseCertTemplates(raw)).toEqual([]))
  })

  it('drops entries with no id, no name, or no https link', () => {
    expect(
      parseCertTemplates([
        null,
        'classic',
        { ...ok, id: '' },
        { ...ok, name: '  ' },
        { ...ok, url: undefined },
        { ...ok, url: 'http://bucket/classic.svg' },
        { ...ok, url: 'javascript:alert(1)' },
      ]),
    ).toEqual([])
  })

  it('keeps only the first entry for a repeated id', () => {
    expect(parseCertTemplates([ok, { ...ok, name: 'Again' }])).toEqual([ok])
  })

  it('trims values and defaults a missing description', () => {
    expect(parseCertTemplates([{ id: ' a ', name: ' A ', url: ' https://b/a.svg ' }])).toEqual([
      { id: 'a', name: 'A', description: '', url: 'https://b/a.svg' },
    ])
  })
})
