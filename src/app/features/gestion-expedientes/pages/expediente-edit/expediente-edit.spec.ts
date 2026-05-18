import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteEdit } from './expediente-edit';

describe('ExpedienteEdit', () => {
  let component: ExpedienteEdit;
  let fixture: ComponentFixture<ExpedienteEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
