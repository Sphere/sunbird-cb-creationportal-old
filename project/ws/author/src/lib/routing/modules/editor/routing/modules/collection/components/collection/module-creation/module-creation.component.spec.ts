import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { ModuleCreationComponent } from './module-creation.component'

describe('ModuleCreationComponent', () => {
  let component: ModuleCreationComponent
  let fixture: ComponentFixture<ModuleCreationComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ModuleCreationComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ModuleCreationComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
