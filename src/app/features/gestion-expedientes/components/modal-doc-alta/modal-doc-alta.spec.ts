import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDocAlta } from './modal-doc-alta';

describe('ModalDocAlta', () => {
  let component: ModalDocAlta;
  let fixture: ComponentFixture<ModalDocAlta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDocAlta],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocAlta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
