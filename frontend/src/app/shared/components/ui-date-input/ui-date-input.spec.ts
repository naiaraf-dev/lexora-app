import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UiDateInput } from './ui-date-input';

describe('UiDateInput', () => {
  let component: UiDateInput;
  let fixture: ComponentFixture<UiDateInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiDateInput],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiDateInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
