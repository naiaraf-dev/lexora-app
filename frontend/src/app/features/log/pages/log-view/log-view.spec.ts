import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogView } from './log-view';

describe('LogView', () => {
  let component: LogView;
  let fixture: ComponentFixture<LogView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogView],
    }).compileComponents();

    fixture = TestBed.createComponent(LogView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
