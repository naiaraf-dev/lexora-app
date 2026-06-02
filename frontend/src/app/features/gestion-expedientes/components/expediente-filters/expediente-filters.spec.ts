import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpedienteFilters } from './expediente-filters';

describe('ExpedienteFilters', () => {
  let component: ExpedienteFilters;
  let fixture: ComponentFixture<ExpedienteFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteFilters],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
