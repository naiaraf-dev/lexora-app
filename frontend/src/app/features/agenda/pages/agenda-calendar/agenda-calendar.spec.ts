import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgendaCalendar } from './agenda-calendar';

describe('AgendaCalendar', () => {
  let component: AgendaCalendar;
  let fixture: ComponentFixture<AgendaCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaCalendar],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
