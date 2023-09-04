import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserIndexConfirmComponent } from './user-index-confirm.component';

describe('UserIndexConfirmComponent', () => {
  let component: UserIndexConfirmComponent;
  let fixture: ComponentFixture<UserIndexConfirmComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserIndexConfirmComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserIndexConfirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
