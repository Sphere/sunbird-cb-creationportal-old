import { PipeMetaPipe } from './pipe-table-meta.pipe'

class UpperPipe {
  transform(v: string) {
    return v.toUpperCase()
  }
}

class ExclaimPipe {
  transform(v: string) {
    return `${v}!`
  }
}

describe('PipeMetaPipe', () => {
  const pipe = new PipeMetaPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('returns the value unchanged when no pipes are supplied', () => {
    expect(pipe.transform('hello', [])).toBe('hello')
  })

  it('applies each pipe in sequence', () => {
    expect(pipe.transform('hello', [UpperPipe, ExclaimPipe])).toBe('HELLO!')
  })
})
