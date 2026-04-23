import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ForgotPass } from './forgot-pass';

describe('ForgotPass', () => {
  let component: ForgotPass;
  let fixture: ComponentFixture<ForgotPass>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPass],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPass);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
