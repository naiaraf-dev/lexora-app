import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ModalDocEdit } from './modal-doc-edit';

describe('ModalDocEdit', () => {
  let component: ModalDocEdit;
  let fixture: ComponentFixture<ModalDocEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDocEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
