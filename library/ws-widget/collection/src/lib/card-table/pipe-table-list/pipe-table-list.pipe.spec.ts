import { PipeListPipe } from './pipe-table-list.pipe'

describe('PipeListPipe', () => {
  const pipe = new PipeListPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('maps the given key and joins the values with line breaks', () => {
    const value = [{ name: 'Alpha' }, { name: 'Beta' }]
    expect(pipe.transform(value, 'name')).toBe('Alpha<br />Beta')
  })

  it('returns an empty string for an empty list', () => {
    expect(pipe.transform([], 'name')).toBe('')
  })
})
