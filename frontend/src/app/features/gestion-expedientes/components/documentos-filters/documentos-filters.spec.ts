import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosFilters } from './documentos-filters';

describe('DocumentosFilters', () => {
  let component: DocumentosFilters;
  let fixture: ComponentFixture<DocumentosFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
