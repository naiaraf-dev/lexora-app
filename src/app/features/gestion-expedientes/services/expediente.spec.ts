import { TestBed } from '@angular/core/testing';

import { Expediente } from './expediente';

describe('Expediente', () => {
  let service: Expediente;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Expediente);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
