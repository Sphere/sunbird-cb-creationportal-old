import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceModuleComponent } from './resource-module.component';

describe('ResourceModuleComponent', () => {
  let component: ResourceModuleComponent;
  let fixture: ComponentFixture<ResourceModuleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ResourceModuleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResourceModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
