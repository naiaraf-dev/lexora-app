import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Novedad, NovedadesCard } from './novedades-card';

describe('NovedadesCard', () => {
  let component: NovedadesCard;
  let fixture: ComponentFixture<NovedadesCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovedadesCard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('numero', 1);
    fixture.componentRef.setInput('novedad', { titulo: 'Novedad de prueba', tipoLabel: 'Otro' } as Novedad);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
