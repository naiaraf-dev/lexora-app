import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDocView } from './modal-doc-view';

describe('ModalDocView', () => {
  let component: ModalDocView;
  let fixture: ComponentFixture<ModalDocView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDocView],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDocView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
