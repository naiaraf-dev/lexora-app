import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiTable } from './ui-table';

describe('UiTable', () => {
  let component: UiTable;
  let fixture: ComponentFixture<UiTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiTable],
    }).compileComponents();

    fixture = TestBed.createComponent(UiTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
