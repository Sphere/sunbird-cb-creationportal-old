import { PipeFilterPipe } from './pipe-filter.pipe'

describe('PipeFilterPipe', () => {
  const pipe = new PipeFilterPipe()
  const list = [{ type: 'Apple' }, { type: 'Banana' }, { type: 'apricot' }]

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns the value unchanged when there is no term', () => {
    expect(pipe.transform(list, 'type', '')).toBe(list)
  })

  it('matches a key exactly (case-insensitive)', () => {
    expect(pipe.transform(list, 'type', 'apple')).toEqual([{ type: 'Apple' }])
  })

  it('does not match on a partial term (anchored regex)', () => {
    expect(pipe.transform(list, 'type', 'app')).toEqual([])
  })

  it('returns an empty array for a null list with a term', () => {
    expect(pipe.transform(null as any, 'type', 'apple')).toEqual([])
  })
})
