import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AgendaCalendar } from './agenda-calendar';

describe('AgendaCalendar', () => {
  let component: AgendaCalendar;
  let fixture: ComponentFixture<AgendaCalendar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaCalendar],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaCalendar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
