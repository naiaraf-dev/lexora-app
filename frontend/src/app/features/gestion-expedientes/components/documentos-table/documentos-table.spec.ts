import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DocumentosTable } from './documentos-table';

describe('DocumentosTable', () => {
  let component: DocumentosTable;
  let fixture: ComponentFixture<DocumentosTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosTable],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
