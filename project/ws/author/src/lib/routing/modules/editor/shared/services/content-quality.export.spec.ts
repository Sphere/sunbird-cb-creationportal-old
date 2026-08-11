import { of } from 'rxjs'

import { ContentQualityService } from './content-quality.service'

/**
 * Wave 18 — the spreadsheet export of ContentQualityService: `s2ab`,
 * `downloadFile` and both sheet layouts of `getFile`.
 */
describe('ContentQualityService (export)', () => {
  let http: { post: jest.Mock }
  let svc: ContentQualityService

  beforeEach(() => {
    http = { post: jest.fn(() => of({ result: { resources: [] } })) }
    svc = new ContentQualityService(http as any)
    ;(global as any).URL.createObjectURL = jest.fn().mockReturnValue('blob:report')
  })

  afterEach(() => jest.restoreAllMocks())

  describe('s2ab', () => {
    it('packs a binary string into a byte buffer', () => {
      const buffer = svc.s2ab('AB')
      expect(buffer.byteLength).toBe(2)
      expect(Array.from(new Uint8Array(buffer))).toEqual([65, 66])
    })

    it('produces an empty buffer for an empty string', () => {
      expect(svc.s2ab('').byteLength).toBe(0)
    })

    it('masks each character down to a single byte', () => {
      expect(Array.from(new Uint8Array(svc.s2ab('Ł')))).toEqual([0x41])
    })
  })

  describe('downloadFile', () => {
    it('clicks a temporary anchor and tidies it away', () => {
      const click = jest.fn()
      const anchor: any = { click }
      jest.spyOn(window.document, 'createElement').mockReturnValue(anchor)
      const append = jest.spyOn(document.body, 'appendChild').mockImplementation((n: any) => n)
      const remove = jest.spyOn(document.body, 'removeChild').mockImplementation((n: any) => n)

      svc.downloadFile('blob:report', 'quality.xlsx')

      expect(anchor.href).toBe('blob:report')
      expect(anchor.download).toBe('quality.xlsx')
      expect(append).toHaveBeenCalledWith(anchor)
      expect(click).toHaveBeenCalled()
      expect(remove).toHaveBeenCalledWith(anchor)
    })
  })

  describe('getFile', () => {
    /** Lets the dynamic xlsx import resolve. */
    const settle = async () => {
      for (let i = 0; i < 6; i += 1) {
        await Promise.resolve()
      }
    }

    it('writes a single sheet for a flat report', async () => {
      const download = jest.spyOn(svc, 'downloadFile').mockImplementation(() => undefined)
      svc.getFile([{ name: 'A resource', score: 5 }], 'quality', false)
      await settle()
      expect(download).toHaveBeenCalledWith('blob:report', 'quality.xlsx')
    })

    it('writes one sheet per group for a split report', async () => {
      const download = jest.spyOn(svc, 'downloadFile').mockImplementation(() => undefined)
      svc.getFile({ Courses: [{ name: 'A course' }], Resources: [{ name: 'A resource' }] }, 'quality', true)
      await settle()
      expect(download).toHaveBeenCalledWith('blob:report', 'quality.xlsx')
    })

    it('falls back to a blank sheet name', async () => {
      const download = jest.spyOn(svc, 'downloadFile').mockImplementation(() => undefined)
      svc.getFile([{ name: 'A resource' }], '' as any, false)
      await settle()
      expect(download).toHaveBeenCalledWith('blob:report', '.xlsx')
    })
  })

  describe('reset', () => {
    it('forgets the cached scores and the active content', () => {
      svc.calculateScore({ result: { resources: [{ resourceId: 'r1', score: 5 }] } })
      svc.currentContent = 'do_1'
      svc.reset()
      expect(svc.curationData).toEqual({})
      expect(svc.currentContent).toBe('')
    })
  })
})
