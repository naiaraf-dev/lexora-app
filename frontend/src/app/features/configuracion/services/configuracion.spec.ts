import { TestBed } from '@angular/core/testing';

import { Configuracion } from './configuracion';

describe('Configuracion', () => {
  let service: Configuracion;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Configuracion);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
