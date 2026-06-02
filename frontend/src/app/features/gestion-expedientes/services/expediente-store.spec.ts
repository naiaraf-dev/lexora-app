import { TestBed } from '@angular/core/testing';

import { ExpedienteStore } from './expediente-store';

describe('ExpedienteStore', () => {
  let service: ExpedienteStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExpedienteStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
