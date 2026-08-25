import { of } from 'rxjs'

import { LicenseComponent } from './license.component'

describe('LicenseComponent', () => {
  let valueSvc: any
  let route: any

  const build = () => new LicenseComponent(valueSvc, route)

  beforeEach(() => {
    valueSvc = {
      isXSmall$: of(false),
    }
    route = {
      queryParams: of({ license: 'CC-BY-4.0' }),
    }
  })

  it('should create and set isXSmall from valueSvc in constructor', () => {
    valueSvc.isXSmall$ = of(true)
    const component = build()

    expect(component).toBeTruthy()
    expect(component.isXSmall).toBe(true)
  })

  it('should set isXSmall false when isXSmall$ emits false', () => {
    valueSvc.isXSmall$ = of(false)
    const component = build()

    expect(component.isXSmall).toBe(false)
  })

  describe('ngOnInit', () => {
    it('should set licenseName from query params and call getLicenseConfig', () => {
      const component = build()
      const spy = jest.spyOn(component, 'getLicenseConfig')

      component.ngOnInit()

      expect(component.licenseName).toBe('CC-BY-4.0')
      expect(spy).toHaveBeenCalled()
    })

    it('should set licenseName undefined when no license param', () => {
      route.queryParams = of({})
      const component = build()

      component.ngOnInit()

      expect(component.licenseName).toBeUndefined()
    })
  })

  describe('getLicenseConfig', () => {
    it('should not throw and return undefined', () => {
      const component = build()
      expect(component.getLicenseConfig()).toBeUndefined()
    })
  })
})
