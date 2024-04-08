import { TestBed } from '@angular/core/testing'

import { AIHubService } from './aihub.service'

describe('AIHubService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: AIHubService = TestBed.get(AIHubService)
    expect(service).toBeTruthy()
  })
})
