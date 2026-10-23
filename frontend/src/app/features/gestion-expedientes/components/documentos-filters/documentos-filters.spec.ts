import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DocumentosFilters } from './documentos-filters';

describe('DocumentosFilters', () => {
  let component: DocumentosFilters;
  let fixture: ComponentFixture<DocumentosFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosFilters],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
