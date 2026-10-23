import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ModalDocAlta } from './modal-doc-alta';

describe('ModalDocAlta', () => {
  let component: ModalDocAlta;
  let fixture: ComponentFixture<ModalDocAlta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDocAlta],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocAlta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
