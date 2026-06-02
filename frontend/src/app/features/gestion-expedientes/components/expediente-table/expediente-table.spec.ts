import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteTable } from './expediente-table';

describe('ExpedienteTable', () => {
  let component: ExpedienteTable;
  let fixture: ComponentFixture<ExpedienteTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteTable],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
