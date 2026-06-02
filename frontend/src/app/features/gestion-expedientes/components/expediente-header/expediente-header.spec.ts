import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteHeader } from './expediente-header';

describe('ExpedienteHeader', () => {
  let component: ExpedienteHeader;
  let fixture: ComponentFixture<ExpedienteHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
