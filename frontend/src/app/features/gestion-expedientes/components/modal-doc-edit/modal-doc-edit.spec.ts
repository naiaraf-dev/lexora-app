import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDocEdit } from './modal-doc-edit';

describe('ModalDocEdit', () => {
  let component: ModalDocEdit;
  let fixture: ComponentFixture<ModalDocEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDocEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
