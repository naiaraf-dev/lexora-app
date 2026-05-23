import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalNovedad } from './modal-novedad';

describe('ModalNovedad', () => {
  let component: ModalNovedad;
  let fixture: ComponentFixture<ModalNovedad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalNovedad],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalNovedad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
