import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CompetenciesAreaComponent } from './competencies-area.component'

describe('CompetenciesAreaComponent', () => {
  let component: CompetenciesAreaComponent
  let fixture: ComponentFixture<CompetenciesAreaComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompetenciesAreaComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CompetenciesAreaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
