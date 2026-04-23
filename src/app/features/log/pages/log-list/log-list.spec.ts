import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogList } from './log-list';

describe('LogList', () => {
  let component: LogList;
  let fixture: ComponentFixture<LogList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogList],
    }).compileComponents();

    fixture = TestBed.createComponent(LogList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
