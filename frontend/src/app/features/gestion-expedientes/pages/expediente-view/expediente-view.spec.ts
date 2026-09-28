import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpedienteView } from './expediente-view';

describe('ExpedienteView', () => {
  let component: ExpedienteView;
  let fixture: ComponentFixture<ExpedienteView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteView],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
