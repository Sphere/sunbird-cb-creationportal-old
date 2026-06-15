import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { AIHubService } from './aihub.service'

describe('AIHubService', () => {
  let service: AIHubService

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(AIHubService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
