import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoCard } from './info-card';

describe('InfoCard', () => {
  let component: InfoCard;
  let fixture: ComponentFixture<InfoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoCard],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
