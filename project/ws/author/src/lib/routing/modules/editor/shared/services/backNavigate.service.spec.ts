import { from } from 'rxjs'

import { NavigationEnd } from '@angular/router'

import { BackNavigateService } from './backNavigate.service'

describe('BackNavigateService', () => {
  let router: { events: any; navigateByUrl: jest.Mock }

  const buildService = (events: any) => {
    router = { events, navigateByUrl: jest.fn() }
    return new BackNavigateService(router as any)
  }

  it('is created and records NavigationEnd urls, ignoring other events', () => {
    const service = buildService(from([{ id: 1 } as any, new NavigationEnd(1, '/a', '/a')]))
    expect(service).toBeTruthy()
    expect((service as any).history).toEqual(['/a'])
  })

  it('navigates to the author home on back()', () => {
    const service = buildService(from([]))
    service.back()
    expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
  })
})
