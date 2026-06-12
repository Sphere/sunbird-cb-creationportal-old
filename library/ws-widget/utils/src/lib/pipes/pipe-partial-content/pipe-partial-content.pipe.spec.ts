import { PipePartialContentPipe } from './pipe-partial-content.pipe'

describe('PipePartialContentPipe', () => {
  const pipe = new PipePartialContentPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('picks only the requested keys', () => {
    expect(pipe.transform({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('omits keys whose value is falsy', () => {
    expect(pipe.transform({ a: 1, b: 0, c: '' }, ['a', 'b', 'c'])).toEqual({ a: 1 })
  })

  it('omits keys not present on the source object', () => {
    expect(pipe.transform({ a: 'x' }, ['a', 'b'])).toEqual({ a: 'x' })
  })

  it('returns an empty object when no keys match', () => {
    expect(pipe.transform({ a: 1 }, ['b', 'c'])).toEqual({})
  })
})
