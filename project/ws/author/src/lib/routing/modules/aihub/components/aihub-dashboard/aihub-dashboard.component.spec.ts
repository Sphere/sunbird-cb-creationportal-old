import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'

import { AIHubDashboardComponent } from './aihub-dashboard.component'

describe('AIHubDashboardComponent', () => {
  let component: AIHubDashboardComponent
  let fixture: ComponentFixture<AIHubDashboardComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AIHubDashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AIHubDashboardComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
