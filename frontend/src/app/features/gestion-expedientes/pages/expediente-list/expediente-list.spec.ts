import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpedienteList } from './expediente-list';

describe('ExpedienteList', () => {
  let component: ExpedienteList;
  let fixture: ComponentFixture<ExpedienteList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
