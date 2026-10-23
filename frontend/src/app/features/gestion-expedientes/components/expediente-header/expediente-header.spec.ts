import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpedienteHeader } from './expediente-header';

describe('ExpedienteHeader', () => {
  let component: ExpedienteHeader;
  let fixture: ComponentFixture<ExpedienteHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteHeader],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
