import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteView } from './expediente-view';

describe('ExpedienteView', () => {
  let component: ExpedienteView;
  let fixture: ComponentFixture<ExpedienteView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteView],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
