import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UiPagination } from './ui-pagination';

describe('UiPagination', () => {
  let component: UiPagination;
  let fixture: ComponentFixture<UiPagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiPagination],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiPagination);
    component = fixture.componentInstance;
    // paginaActual y totalPaginas son inputs obligatorios
    fixture.componentRef.setInput('paginaActual', 1);
    fixture.componentRef.setInput('totalPaginas', 1);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
