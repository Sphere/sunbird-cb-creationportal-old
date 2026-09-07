import { FilterStateService } from './filter-state.service'

describe('FilterStateService', () => {
  let svc: FilterStateService

  beforeEach(() => {
    svc = new FilterStateService()
  })

  it('should be created with empty defaults', () => {
    expect(svc).toBeTruthy()
    expect(svc.getFilters()).toEqual([])
    expect(svc.getSourceName()).toBe('')
    expect(svc.getLanguage()).toBe('')
  })

  it('setFilters/getFilters round-trips and emits on filterState$', done => {
    const filters = [{ key: 'status', value: 'Live' }]
    svc.filterState$.subscribe(v => {
      if (v && v.length) {
        expect(v).toEqual(filters)
        expect(svc.getFilters()).toEqual(filters)
        done()
      }
    })
    svc.setFilters(filters)
  })

  it('setSourceName/getSourceName round-trips', () => {
    svc.setSourceName('catalog')
    expect(svc.getSourceName()).toBe('catalog')
  })

  it('setLanguage/getLanguage round-trips', () => {
    svc.setLanguage('en')
    expect(svc.getLanguage()).toBe('en')
  })

  it('clearFilters resets all three subjects', () => {
    svc.setFilters([{ a: 1 }])
    svc.setSourceName('x')
    svc.setLanguage('hi')
    svc.clearFilters()
    expect(svc.getFilters()).toEqual([])
    expect(svc.getSourceName()).toBe('')
    expect(svc.getLanguage()).toBe('')
  })

  it('language$ emits latest value to late subscribers', done => {
    svc.setLanguage('fr')
    svc.language$.subscribe(v => {
      expect(v).toBe('fr')
      done()
    })
  })
})
