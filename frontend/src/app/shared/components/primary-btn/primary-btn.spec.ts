import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PrimaryBtn } from './primary-btn';

describe('PrimaryBtn', () => {
  let component: PrimaryBtn;
  let fixture: ComponentFixture<PrimaryBtn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimaryBtn],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimaryBtn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
