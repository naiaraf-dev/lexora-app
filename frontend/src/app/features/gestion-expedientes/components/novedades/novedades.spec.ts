import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Novedades } from './novedades';

describe('Novedades', () => {
  let component: Novedades;
  let fixture: ComponentFixture<Novedades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Novedades],
    }).compileComponents();

    fixture = TestBed.createComponent(Novedades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
