import { AUTHORING_CONTENT_BASE } from '@ws/author/src/lib/constants/apiEndpoints'

import { RelativeUrlPipe } from './relative-url.pipe'

describe('RelativeUrlPipe', () => {
  const pipe = new RelativeUrlPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns an empty string for a falsy value', () => {
    expect(pipe.transform('')).toBe('')
    expect(pipe.transform(undefined as any)).toBe('')
  })

  it('prefixes the base and URI-encodes the value', () => {
    expect(pipe.transform('a b/c')).toBe(`${AUTHORING_CONTENT_BASE}${encodeURIComponent('a b/c')}`)
  })
})
