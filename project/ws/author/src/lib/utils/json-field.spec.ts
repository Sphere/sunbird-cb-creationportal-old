import { parseJsonList, toJsonString } from './json-field'

describe('parseJsonList', () => {
  it('parses a JSON string, as the legacy platform returns it', () => {
    expect(parseJsonList('[{"id":"r1","name":"Reviewer One"}]')).toEqual([{ id: 'r1', name: 'Reviewer One' }])
  })

  it('passes an array straight through, as Sunbird Spark returns it', () => {
    const spark = [{ id: '346de755', name: 'Reviewer Aastrika' }]
    expect(parseJsonList(spark)).toEqual(spark)
  })

  it('wraps a bare object in an array', () => {
    expect(parseJsonList({ id: 'r1' })).toEqual([{ id: 'r1' }])
  })

  it('wraps a JSON string holding a single object', () => {
    expect(parseJsonList('{"id":"r1"}')).toEqual([{ id: 'r1' }])
  })

  it.each([
    ['malformed JSON', 'not json'],
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['the JSON literal null', 'null'],
  ])('returns an empty list for %s', (_label, raw) => {
    expect(parseJsonList(raw)).toEqual([])
  })

  it('keeps an already-empty array empty', () => {
    expect(parseJsonList([])).toEqual([])
  })
})

describe('toJsonString', () => {
  it('stringifies an array so the content schema accepts it', () => {
    expect(toJsonString([{ id: 'r1' }])).toBe('[{"id":"r1"}]')
  })

  it('stringifies a bare object', () => {
    expect(toJsonString({ id: 'r1' })).toBe('{"id":"r1"}')
  })

  it('leaves an existing JSON string untouched', () => {
    expect(toJsonString('[{"id":"r1"}]')).toBe('[{"id":"r1"}]')
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('leaves %s untouched so the field is not invented', (_label, raw) => {
    expect(toJsonString(raw)).toBe(raw)
  })
})
