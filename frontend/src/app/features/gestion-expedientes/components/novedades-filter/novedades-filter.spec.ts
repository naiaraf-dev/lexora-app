import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NovedadesFilter } from './novedades-filter';

describe('NovedadesFilter', () => {
  let component: NovedadesFilter;
  let fixture: ComponentFixture<NovedadesFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovedadesFilter],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
