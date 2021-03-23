import { TestBed } from '@angular/core/testing'

import { CompetenciesResolverService } from './competencies-resolver.service'

describe('CompetenciesResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: CompetenciesResolverService = TestBed.get(CompetenciesResolverService)
    expect(service).toBeTruthy()
  })
})
