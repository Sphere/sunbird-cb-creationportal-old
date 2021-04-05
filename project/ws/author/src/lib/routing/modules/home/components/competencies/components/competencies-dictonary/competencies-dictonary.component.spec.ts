import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CompetenciesDictonaryComponent } from './competencies-dictonary.component'

describe('CompetenciesDictonaryComponent', () => {
  let component: CompetenciesDictonaryComponent
  let fixture: ComponentFixture<CompetenciesDictonaryComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompetenciesDictonaryComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CompetenciesDictonaryComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
