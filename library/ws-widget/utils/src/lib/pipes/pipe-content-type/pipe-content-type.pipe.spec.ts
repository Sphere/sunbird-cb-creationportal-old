import { PipeContentTypePipe } from './pipe-content-type.pipe'

describe('PipeContentTypePipe', () => {
  const pipe = new PipeContentTypePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('maps learning path (either casing) to Program', () => {
    expect(pipe.transform('Learning Path')).toBe('Program')
    expect(pipe.transform('learning path')).toBe('Program')
  })

  it('maps collection to Module', () => {
    expect(pipe.transform('Collection')).toBe('Module')
    expect(pipe.transform('collection')).toBe('Module')
  })

  it('keeps Course / Resource / Certification labels', () => {
    expect(pipe.transform('course')).toBe('Course')
    expect(pipe.transform('resource')).toBe('Resource')
    expect(pipe.transform('certification')).toBe('Certification')
  })

  it('returns the original value for unknown types', () => {
    expect(pipe.transform('Podcast')).toBe('Podcast')
  })

  it('returns an empty string for falsy input', () => {
    expect(pipe.transform('')).toBe('')
    expect(pipe.transform(null)).toBe('')
  })
})
