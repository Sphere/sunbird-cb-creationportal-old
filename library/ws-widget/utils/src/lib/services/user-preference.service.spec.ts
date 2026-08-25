import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { UserPreferenceService } from './user-preference.service'
import { ConfigurationsService } from './configurations.service'

const PREF_URL = '/apis/protected/v8/user/preference'

describe('UserPreferenceService', () => {
  let service: UserPreferenceService
  let httpMock: HttpTestingController
  let configStub: any

  beforeEach(() => {
    configStub = {
      userPreference: null,
      isDarkMode: false,
      isRTL: false,
      activeThemeObject: { themeClass: 'theme-orange' },
      activeFontObject: { fontClass: 'roboto' },
      completedTour: {},
      profileSettings: {},
    }
    TestBed.configureTestingModule({
      providers: [
        UserPreferenceService,
        { provide: ConfigurationsService, useValue: configStub },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(UserPreferenceService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchUserPreference GETs the preference endpoint', async () => {
    const promise = service.fetchUserPreference()
    const req = httpMock.expectOne(PREF_URL)
    expect(req.request.method).toBe('GET')
    req.flush({ isDarkMode: true })
    await expect(promise).resolves.toEqual({ isDarkMode: true })
  })

  it('saveUserPreference returns false when nothing changed', async () => {
    await expect(service.saveUserPreference()).resolves.toBe(false)
    httpMock.expectNone(PREF_URL)
  })

  it('saveUserPreference PUTs the merged preference and stores it', async () => {
    const promise = service.saveUserPreference({ pinnedApps: 'app1' })
    const req = httpMock.expectOne(PREF_URL)
    expect(req.request.method).toBe('PUT')
    expect(req.request.body.pinnedApps).toBe('app1')
    expect(req.request.body.selectedTheme).toBe('theme-orange')
    req.flush({})
    await expect(promise).resolves.toBe(true)
    expect(configStub.userPreference.pinnedApps).toBe('app1')
  })
})
