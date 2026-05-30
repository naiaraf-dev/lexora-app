import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovedadesCard } from './novedades-card';

describe('NovedadesCard', () => {
  let component: NovedadesCard;
  let fixture: ComponentFixture<NovedadesCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovedadesCard],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
