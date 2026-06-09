import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiConfirmModal } from './ui-confirm-modal';

describe('UiConfirmModal', () => {
  let component: UiConfirmModal;
  let fixture: ComponentFixture<UiConfirmModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiConfirmModal],
    }).compileComponents();

    fixture = TestBed.createComponent(UiConfirmModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
