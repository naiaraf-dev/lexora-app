import { TestBed } from '@angular/core/testing';

import { Log } from './log';

describe('Log', () => {
  let service: Log;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Log);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
