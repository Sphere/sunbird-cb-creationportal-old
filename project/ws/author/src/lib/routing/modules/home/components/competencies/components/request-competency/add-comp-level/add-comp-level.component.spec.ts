import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { AddCompLevelComponent } from './add-comp-level.component'

describe('AddCompLevelComponent', () => {
  let component: AddCompLevelComponent
  let fixture: ComponentFixture<AddCompLevelComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AddCompLevelComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AddCompLevelComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
