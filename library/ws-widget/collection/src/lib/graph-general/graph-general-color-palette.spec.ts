import { COLOR_PALETTE, GRAPH_TYPES, colorPalettes } from './graph-general-color-palette'

describe('graph-general-color-palette constants', () => {
  it('COLOR_PALETTE exposes the expected palette keys', () => {
    expect(COLOR_PALETTE).toEqual(['default', 'palette1', 'palette2', 'palette3', 'palette4'])
    expect(COLOR_PALETTE).toHaveLength(5)
  })

  it('GRAPH_TYPES exposes the expected chart types', () => {
    expect(GRAPH_TYPES).toEqual(['pie', 'bar', 'horizontalBar', 'doughnut', 'bubble'])
    expect(GRAPH_TYPES).toContain('doughnut')
  })

  it('colorPalettes has an entry for every key in COLOR_PALETTE', () => {
    COLOR_PALETTE.forEach(key => {
      expect(colorPalettes[key]).toBeDefined()
      expect(Array.isArray(colorPalettes[key])).toBe(true)
      expect(colorPalettes[key].length).toBeGreaterThan(0)
    })
  })

  it('every palette contains only valid hex colour strings', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/
    Object.values(colorPalettes).forEach(palette => {
      palette.forEach(color => {
        expect(typeof color).toBe('string')
        expect(color).toMatch(hexRegex)
      })
    })
  })

  it('exposes representative values for each palette', () => {
    expect(colorPalettes['default'][0]).toBe('#6F1E51')
    expect(colorPalettes['palette1'][0]).toBe('#4D8FAC')
    expect(colorPalettes['palette2'][0]).toBe('#7A942E')
    expect(colorPalettes['palette3'][0]).toBe('#875F9A')
    expect(colorPalettes['palette4'][0]).toBe('#ff9ff3')
    expect(colorPalettes['palette4']).toContain('#222f3e')
  })

  it('has the expected palette lengths', () => {
    expect(colorPalettes['default']).toHaveLength(22)
    expect(colorPalettes['palette1']).toHaveLength(26)
    expect(colorPalettes['palette2']).toHaveLength(30)
    expect(colorPalettes['palette3']).toHaveLength(22)
    expect(colorPalettes['palette4']).toHaveLength(20)
  })
})
