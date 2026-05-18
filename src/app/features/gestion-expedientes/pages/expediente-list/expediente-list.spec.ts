import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteList } from './expediente-list';

describe('ExpedienteList', () => {
  let component: ExpedienteList;
  let fixture: ComponentFixture<ExpedienteList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteList],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
