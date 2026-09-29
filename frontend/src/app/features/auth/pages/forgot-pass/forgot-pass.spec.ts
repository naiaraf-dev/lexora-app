import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ForgotPass } from './forgot-pass';

describe('ForgotPass', () => {
  let component: ForgotPass;
  let fixture: ComponentFixture<ForgotPass>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForgotPass],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPass);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
