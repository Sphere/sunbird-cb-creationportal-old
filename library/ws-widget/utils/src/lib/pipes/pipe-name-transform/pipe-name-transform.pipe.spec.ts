import { PipeNameTransformPipe } from './pipe-name-transform.pipe'

describe('PipeNameTransformPipe', () => {
  const pipe = new PipeNameTransformPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('joins first and last name', () => {
    expect(pipe.transform({ firstName: 'John', lastName: 'Doe', email: 'j@x.com' })).toBe('John Doe')
  })

  it('uses only the first name when there is no last name', () => {
    expect(pipe.transform({ firstName: 'John', lastName: '', email: 'j@x.com' })).toBe('John')
  })

  it('does not duplicate when last name equals first name', () => {
    expect(pipe.transform({ firstName: 'John', lastName: 'John', email: 'j@x.com' })).toBe('John')
  })

  it('falls back to the email when no name is present', () => {
    expect(pipe.transform({ firstName: '', lastName: '', email: 'j@x.com' })).toBe('j@x.com')
  })

  it('falls back to "Anonymous User" when nothing is present', () => {
    expect(pipe.transform({ firstName: '', lastName: '', email: '' })).toBe('Anonymous User')
  })
})
