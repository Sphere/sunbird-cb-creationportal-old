import { PipeListFilterPipe } from './pipe-list-filter.pipe'

describe('PipeListFilterPipe', () => {
  const pipe = new PipeListFilterPipe()
  const list = [
    { name: 'Apple', desc: 'a red fruit' },
    { name: 'Banana', desc: 'a yellow fruit' },
    { name: 'Carrot', desc: 'an orange veg' },
  ]

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns the value unchanged when there is no search term', () => {
    expect(pipe.transform(list, 'name', '')).toBe(list)
  })

  it('filters by a single key, case-insensitively', () => {
    expect(pipe.transform(list, 'name', 'app')).toEqual([{ name: 'Apple', desc: 'a red fruit' }])
  })

  it('matches across multiple comma-separated keys', () => {
    expect(pipe.transform(list, 'name,desc', 'orange')).toEqual([
      { name: 'Carrot', desc: 'an orange veg' },
    ])
  })

  it('returns an empty array when nothing matches', () => {
    expect(pipe.transform(list, 'name', 'zzz')).toEqual([])
  })

  it('handles a null list when a term is given', () => {
    expect(pipe.transform(null as any, 'name', 'x')).toEqual([])
  })
})
