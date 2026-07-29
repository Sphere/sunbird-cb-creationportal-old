import { ProgressSpinnerComponent } from './progress-spinner.component'

describe('ProgressSpinnerComponent', () => {
  const build = () => new ProgressSpinnerComponent()

  it('should construct with default input values', () => {
    const comp = build()
    expect(comp).toBeTruthy()
    expect(comp.spinMode).toBe('indeterminate')
    expect(comp.spinSize).toBe('medium')
    expect(comp.spinWidth).toBe('medium')
    expect(comp.spinColor).toBe('accent')
    expect(comp.spinValue).toBe(0)
  })

  it('should expose the size lookup hash', () => {
    const comp = build()
    expect(comp.spinSizeHash).toEqual({
      small: 40,
      medium: 60,
      large: 75,
      xlarge: 90,
    })
  })

  it('should expose the width lookup hash', () => {
    const comp = build()
    expect(comp.spinWidthHash).toEqual({
      thin: 3,
      medium: 5,
      thick: 8,
    })
  })

  it('should have a no-op ngOnInit', () => {
    const comp = build()
    expect(() => comp.ngOnInit()).not.toThrow()
  })

  it('should reflect assigned input values', () => {
    const comp = build()
    comp.spinMode = 'determinate'
    comp.spinSize = 'xlarge'
    comp.spinWidth = 'thick'
    comp.spinColor = 'primary'
    comp.spinValue = 75
    expect(comp.spinSizeHash[comp.spinSize]).toBe(90)
    expect(comp.spinWidthHash[comp.spinWidth]).toBe(8)
    expect(comp.spinValue).toBe(75)
  })
})
