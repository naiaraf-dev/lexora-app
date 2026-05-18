import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatosGenerales } from './datos-generales';

describe('DatosGenerales', () => {
  let component: DatosGenerales;
  let fixture: ComponentFixture<DatosGenerales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGenerales],
    }).compileComponents();

    fixture = TestBed.createComponent(DatosGenerales);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
