import { TestBed } from '@angular/core/testing'

import { CompetencyResolverService } from './competency-resolver.service'

describe('CompetencyResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: CompetencyResolverService = TestBed.get(CompetencyResolverService)
    expect(service).toBeTruthy()
  })
})
