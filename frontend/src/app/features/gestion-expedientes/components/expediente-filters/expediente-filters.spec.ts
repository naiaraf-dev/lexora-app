import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpedienteFilters } from './expediente-filters';

describe('ExpedienteFilters', () => {
  let component: ExpedienteFilters;
  let fixture: ComponentFixture<ExpedienteFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteFilters],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
