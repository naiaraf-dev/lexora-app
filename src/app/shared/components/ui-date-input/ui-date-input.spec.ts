import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiDateInput } from './ui-date-input';

describe('UiDateInput', () => {
  let component: UiDateInput;
  let fixture: ComponentFixture<UiDateInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiDateInput],
    }).compileComponents();

    fixture = TestBed.createComponent(UiDateInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
