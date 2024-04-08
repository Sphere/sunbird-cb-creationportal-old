import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AIHubDashboardComponent } from './aihub-dashboard.component';

describe('AIHubDashboardComponent', () => {
  let component: AIHubDashboardComponent;
  let fixture: ComponentFixture<AIHubDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AIHubDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AIHubDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
