import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalExptes } from './modal-exptes';

describe('ModalExptes', () => {
  let component: ModalExptes;
  let fixture: ComponentFixture<ModalExptes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalExptes],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalExptes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
