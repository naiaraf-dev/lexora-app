import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpedienteTable } from './expediente-table';

describe('ExpedienteTable', () => {
  let component: ExpedienteTable;
  let fixture: ComponentFixture<ExpedienteTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteTable],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
