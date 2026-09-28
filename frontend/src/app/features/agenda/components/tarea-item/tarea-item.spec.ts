import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { TareaItem } from './tarea-item';
import { TareaAgenda } from '../../services/agenda';

describe('TareaItem', () => {
  let component: TareaItem;
  let fixture: ComponentFixture<TareaItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TareaItem],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TareaItem);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tarea', { id: 1, titulo: 'Tarea de prueba', estado: 'Pendiente', prioridad: 'Media' } as TareaAgenda);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
