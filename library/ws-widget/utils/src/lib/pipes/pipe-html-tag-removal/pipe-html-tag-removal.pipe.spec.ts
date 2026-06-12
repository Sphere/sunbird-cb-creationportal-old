import { PipeHtmlTagRemovalPipe } from './pipe-html-tag-removal.pipe'

describe('PipeHtmlTagRemovalPipe', () => {
  const pipe = new PipeHtmlTagRemovalPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('strips a single tag pair', () => {
    expect(pipe.transform('<p>Hello</p>')).toBe('Hello')
  })

  it('strips multiple/nested tags', () => {
    expect(pipe.transform('<div><b>Bold</b> and <i>italic</i></div>')).toBe('Bold and italic')
  })

  it('leaves plain text untouched', () => {
    expect(pipe.transform('just text')).toBe('just text')
  })

  it('returns an empty string for null/undefined/empty input', () => {
    expect(pipe.transform(null as any)).toBe('')
    expect(pipe.transform(undefined as any)).toBe('')
    expect(pipe.transform('')).toBe('')
  })
})
