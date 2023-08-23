import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CertificateStatusDialogComponentDialogComponent } from './cert-upload-status-dialogcomponent'

describe('RestoreDialogComponent', () => {
  let component: CertificateStatusDialogComponentDialogComponent
  let fixture: ComponentFixture<CertificateStatusDialogComponentDialogComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CertificateStatusDialogComponentDialogComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CertificateStatusDialogComponentDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
