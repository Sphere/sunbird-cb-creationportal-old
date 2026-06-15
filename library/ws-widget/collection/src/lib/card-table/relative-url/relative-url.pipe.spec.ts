import { RelativeUrlTablePipe } from './relative-url.pipe'

describe('RelativeUrlTablePipe', () => {
  const pipe = new RelativeUrlTablePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns an empty string for a falsy value', () => {
    expect(pipe.transform('')).toBe('')
  })

  it('prefixes the auth-content base and URI-encodes the value', () => {
    expect(pipe.transform('a b')).toBe(`/apis/authContent/${encodeURIComponent('a b')}`)
  })
})
