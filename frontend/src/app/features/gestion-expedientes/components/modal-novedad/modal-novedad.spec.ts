import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ModalNovedad } from './modal-novedad';

describe('ModalNovedad', () => {
  let component: ModalNovedad;
  let fixture: ComponentFixture<ModalNovedad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalNovedad],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalNovedad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
