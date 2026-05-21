import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosTable } from './documentos-table';

describe('DocumentosTable', () => {
  let component: DocumentosTable;
  let fixture: ComponentFixture<DocumentosTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentosTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
