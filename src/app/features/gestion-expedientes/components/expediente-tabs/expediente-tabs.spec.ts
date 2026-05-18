import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteTabs } from './expediente-tabs';

describe('ExpedienteTabs', () => {
  let component: ExpedienteTabs;
  let fixture: ComponentFixture<ExpedienteTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteTabs],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteTabs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
