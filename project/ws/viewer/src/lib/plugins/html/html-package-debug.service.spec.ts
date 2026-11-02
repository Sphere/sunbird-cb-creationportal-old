import { HtmlPackageDebugService } from './html-package-debug.service'

describe('HtmlPackageDebugService', () => {
  let service: HtmlPackageDebugService

  beforeEach(() => {
    service = new HtmlPackageDebugService()
  })

  it('reports that nothing was received for an unknown package', () => {
    expect(service.eventsFor('do_1')).toEqual([])
    expect(service.progressFor('do_1')).toBeNull()
    expect(service.summary('do_1')).toContain('No progress received')
  })

  it('keeps events per content and the latest progress', () => {
    service.record('do_1', { type: 'MODULE_START', extra: { units: 11 } })
    service.record('do_1', { type: 'PROGRESS', extra: { pct: 9 } })
    service.record('do_1', { type: 'PROGRESS', extra: { pct: 18 } })
    service.record('do_2', { type: 'PROGRESS', extra: { pct: 50 } })

    expect(service.eventsFor('do_1').length).toBe(3)
    expect(service.progressFor('do_1')).toBe(18)
    expect(service.progressFor('do_2')).toBe(50)
    const summary = service.summary('do_1')
    expect(summary).toContain('Progress: 18%')
    expect(summary).toContain('Events received: 3')
    expect(summary).toContain('MODULE_START {"units":11}')
  })

  it('says progress was not reported when only other events arrived', () => {
    service.record('do_1', { type: 'VIDEO_START' })
    expect(service.summary('do_1')).toContain('Progress: not reported')
  })

  it('keeps only the latest 50 events but counts every one', () => {
    for (let i = 0; i < 55; i += 1) {
      service.record('do_1', { type: 'PROGRESS', extra: { pct: i } })
    }
    expect(service.eventsFor('do_1').length).toBe(50)
    expect(service.progressFor('do_1')).toBe(54)
    expect(service.report('do_1').total).toBe(55)
    expect(service.summary('do_1')).toContain('Events received: 55')
  })

  it('builds a report with position, checks and newest-first rows', () => {
    service.record('do_1', { type: 'MODULE_START', id: 'pkg', extra: { units: 11, sections: [{ id: 's1' }, { id: 's2' }] } })
    service.record('do_1', { type: 'PROGRESS', extra: { pct: 40, section: 's2', phase: 'quiz' } })
    service.record('do_1', { type: 'STATE', extra: { state: { si: 1, qi: 0 } } })

    const report = service.report('do_1')
    expect(report.total).toBe(3)
    expect(report.progress).toBe(40)
    expect(report.position).toBe('section s2 · phase quiz')
    expect(report.reportsProgress).toBe(true)
    expect(report.savesResumeState).toBe(true)
    expect(report.completed).toBe(false)
    expect(report.lastAt).toEqual(expect.any(Number))
    expect(report.rows.map(r => r.type)).toEqual(['STATE', 'PROGRESS', 'MODULE_START'])
    // objects and arrays are summarised, with the JSON kept to expand
    expect(report.rows[0].fields[0]).toEqual({ key: 'state', text: '2 fields', json: JSON.stringify({ si: 1, qi: 0 }, null, 2) })
    expect(report.rows[2].fields).toEqual([
      { key: 'units', text: '11' },
      { key: 'sections', text: '2 items', json: expect.any(String) },
    ])
  })

  it('marks the package completed at 100% and reports an empty package', () => {
    expect(service.report('do_1')).toEqual(
      expect.objectContaining({
        total: 0,
        progress: null,
        position: null,
        reportsProgress: false,
        savesResumeState: false,
        completed: false,
        lastAt: null,
        rows: [],
      }),
    )
    service.record('do_1', { type: 'PROGRESS', extra: { pct: 100 } })
    expect(service.report('do_1').completed).toBe(true)
  })

  it('emits changes and clears a package log', () => {
    const seen: string[] = []
    service.changes$.subscribe(id => seen.push(id))
    service.record('do_1', { type: 'VIDEO_START' })
    service.clear('do_1')
    expect(seen).toEqual(['do_1', 'do_1'])
    expect(service.eventsFor('do_1')).toEqual([])
    expect(service.report('do_1').total).toBe(0)
  })
})
