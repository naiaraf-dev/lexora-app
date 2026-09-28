import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExpedientesService } from './expedientes.service';

describe('ExpedientesService', () => {
  let service: ExpedientesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExpedientesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
