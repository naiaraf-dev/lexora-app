import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiStatsCard } from './ui-stats-card';

describe('UiStatsCard', () => {
  let component: UiStatsCard;
  let fixture: ComponentFixture<UiStatsCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiStatsCard],
    }).compileComponents();

    fixture = TestBed.createComponent(UiStatsCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
