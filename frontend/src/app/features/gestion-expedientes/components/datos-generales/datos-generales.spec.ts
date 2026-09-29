import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DatosGenerales } from './datos-generales';

describe('DatosGenerales', () => {
  let component: DatosGenerales;
  let fixture: ComponentFixture<DatosGenerales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGenerales],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DatosGenerales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
