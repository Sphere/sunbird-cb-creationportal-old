import { fixFor, jumpTo } from './jump-to'

describe('taking the user to what needs fixing', () => {
  afterEach(() => (document.body.innerHTML = ''))

  it('names the place for each blocked Start that has one', () => {
    expect(
      fixFor('Pick the audience: who the content is for (a position from the list, or type your own).', 'air-resources', 'resource'),
    ).toEqual({
      id: 'air-audience',
      label: 'Go to Audience',
    })
    expect(fixFor('Tick at least one file to review.', 'air-files-pick', 'file')).toEqual({ id: 'air-files-pick', label: 'Choose files' })
    expect(fixFor('One review covers up to 20 files. Untick 2.', 'air-files-pick', 'file')?.label).toBe('Choose files')
    expect(fixFor("You're offline. Reconnect to the internet to start a review.", 'air-resources', 'resource')).toBeNull()
  })

  it('scrolls to the section, focuses its first control and highlights it', () => {
    document.body.innerHTML = '<section id="air-resources"><input type="checkbox" disabled /><input type="checkbox" id="first" /></section>'
    const section = document.getElementById('air-resources')!
    section.scrollIntoView = jest.fn()
    jumpTo(document, 'air-resources')
    expect(section.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement?.id).toBe('first')
    expect(section.classList.contains('air-flash')).toBe(true)
  })

  it('does nothing for a section that is not on the page', () => {
    expect(() => jumpTo(document, 'missing')).not.toThrow()
  })
})
