import { PipeFilterSearchPipe } from './pipe-filter-search.pipe'

describe('PipeFilterSearchPipe', () => {
  const pipe = new PipeFilterSearchPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns an empty array when items is null', () => {
    expect(pipe.transform(null as any, 'x')).toEqual([])
  })

  it('returns the items unchanged when there is no search text', () => {
    const items = [{ title: 'A' }]
    expect(pipe.transform(items, '')).toBe(items)
  })

  it('filters by title (case-insensitive) when no keys are given', () => {
    const items = [{ title: 'Apple' }, { title: 'Banana' }]
    expect(pipe.transform(items, 'app')).toEqual([{ title: 'Apple' }])
  })

  describe('with a personalDetails key', () => {
    const people = [
      { personalDetails: { firstName: 'John' } },
      { personalDetails: { firstName: 'Jane' } },
    ]

    it('filters by the nested key', () => {
      expect(pipe.transform(people, 'john', 'firstName')).toEqual([
        { personalDetails: { firstName: 'John' } },
      ])
    })

    it('returns [-1] when nothing matches', () => {
      expect(pipe.transform(people, 'zzz', 'firstName')).toEqual([-1])
    })
  })
})
