import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ModalExptes } from './modal-exptes';

describe('ModalExptes', () => {
  let component: ModalExptes;
  let fixture: ComponentFixture<ModalExptes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalExptes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalExptes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
