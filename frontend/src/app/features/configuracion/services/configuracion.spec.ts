import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Configuracion } from './configuracion';

describe('Configuracion', () => {
  let service: Configuracion;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(Configuracion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
