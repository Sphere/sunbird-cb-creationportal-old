import { TestBed } from '@angular/core/testing'

import { CompetencyByIdResolverService } from './competency-by-id-resolver.service'

describe('CompetencyByIdResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: CompetencyByIdResolverService = TestBed.get(CompetencyByIdResolverService)
    expect(service).toBeTruthy()
  })
})
