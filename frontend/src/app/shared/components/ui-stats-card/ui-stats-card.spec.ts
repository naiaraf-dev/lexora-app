import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UiStatCard } from './ui-stats-card';

describe('UiStatCard', () => {
  let component: UiStatCard;
  let fixture: ComponentFixture<UiStatCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiStatCard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiStatCard);
    component = fixture.componentInstance;
    // label y value son inputs obligatorios
    fixture.componentRef.setInput('label', 'Total');
    fixture.componentRef.setInput('value', 0);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
