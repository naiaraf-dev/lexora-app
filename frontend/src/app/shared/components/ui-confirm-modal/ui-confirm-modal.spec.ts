import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UiConfirmModal } from './ui-confirm-modal';

describe('UiConfirmModal', () => {
  let component: UiConfirmModal;
  let fixture: ComponentFixture<UiConfirmModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiConfirmModal],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiConfirmModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
