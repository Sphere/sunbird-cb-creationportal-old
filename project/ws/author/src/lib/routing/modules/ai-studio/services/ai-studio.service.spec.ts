import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { AIStudioService } from './ai-studio.service'

describe('AIStudioService', () => {
  let service: AIStudioService

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    service = TestBed.inject(AIStudioService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
