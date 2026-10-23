import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UiSelect } from './ui-select';

describe('UiSelect', () => {
  let component: UiSelect;
  let fixture: ComponentFixture<UiSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiSelect],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
