import { TestBed } from '@angular/core/testing';

import { Agenda } from './agenda';

describe('Agenda', () => {
  let service: Agenda;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Agenda);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
