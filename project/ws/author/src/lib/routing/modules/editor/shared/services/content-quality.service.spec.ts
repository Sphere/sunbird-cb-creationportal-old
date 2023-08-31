import { TestBed } from '@angular/core/testing'

import { ContentQualityService } from './content-quality.service'

describe('SelfCurationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: ContentQualityService = TestBed.get(ContentQualityService)
    expect(service).toBeTruthy()
  })
})
