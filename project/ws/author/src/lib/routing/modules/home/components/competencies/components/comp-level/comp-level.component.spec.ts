import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CompLevelComponent } from './comp-level.component'

describe('CompLevelComponent', () => {
  let component: CompLevelComponent
  let fixture: ComponentFixture<CompLevelComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompLevelComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CompLevelComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
