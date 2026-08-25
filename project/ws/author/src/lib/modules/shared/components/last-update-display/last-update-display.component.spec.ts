import { LastUpdateDisplayComponent } from './last-update-display.component'

describe('LastUpdateDisplayComponent', () => {
  let component: LastUpdateDisplayComponent
  let accessService: { convertToISODate: jest.Mock }

  beforeEach(() => {
    accessService = {
      convertToISODate: jest.fn(),
    }
    component = new LastUpdateDisplayComponent(accessService as any)
  })

  it('should create with default values', () => {
    expect(component).toBeTruthy()
    expect(component.difference).toBe(0)
    expect(component.perspective).toBe('lastUpdated')
    expect(component.timeDuration).toBe('second')
  })

  describe('ngOnInit - expires perspective', () => {
    it('should set convertedExpiryDate from accessService', () => {
      const expiry = new Date('2030-01-01T00:00:00.000Z')
      accessService.convertToISODate.mockReturnValue(expiry)
      component.perspective = 'expires'
      component.expiryDate = '20300101T000000'

      component.ngOnInit()

      expect(accessService.convertToISODate).toHaveBeenCalledWith('20300101T000000')
      expect(component.convertedExpiryDate).toBe(expiry)
    })
  })

  describe('ngOnInit - elapsed time perspective', () => {
    const setLastUpdated = (msAgo: number) => {
      accessService.convertToISODate.mockReturnValue(new Date(Date.now() - msAgo))
    }

    it('should compute seconds when difference < 1 minute', () => {
      setLastUpdated(30 * 1000)
      component.perspective = 'lastUpdated'

      component.ngOnInit()

      expect(component.timeDuration).toBe('second')
      expect(component.difference).toBe(30)
    })

    it('should compute minutes when difference < 1 hour', () => {
      setLastUpdated(5 * 60 * 1000)
      component.ngOnInit()

      expect(component.timeDuration).toBe('minute')
      expect(component.difference).toBe(5)
    })

    it('should compute hours when difference < 1 day', () => {
      setLastUpdated(3 * 60 * 60 * 1000)
      component.ngOnInit()

      expect(component.timeDuration).toBe('hour')
      expect(component.difference).toBe(3)
    })

    it('should compute days when difference < 1 month', () => {
      setLastUpdated(5 * 24 * 60 * 60 * 1000)
      component.ngOnInit()

      expect(component.timeDuration).toBe('day')
      expect(component.difference).toBe(5)
    })

    it('should compute months when difference < 1 year', () => {
      setLastUpdated(90 * 24 * 60 * 60 * 1000)
      component.ngOnInit()

      expect(component.timeDuration).toBe('month')
      expect(component.difference).toBe(3)
    })

    it('should compute years when difference >= 1 year', () => {
      setLastUpdated(730 * 24 * 60 * 60 * 1000)
      component.ngOnInit()

      expect(component.timeDuration).toBe('year')
      expect(component.difference).toBe(2)
    })
  })
})
