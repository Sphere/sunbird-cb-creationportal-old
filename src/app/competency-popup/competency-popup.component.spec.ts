import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetencyPopupComponent } from './competency-popup.component';

describe('CompetencyPopupComponent', () => {
  let component: CompetencyPopupComponent;
  let fixture: ComponentFixture<CompetencyPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CompetencyPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CompetencyPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
