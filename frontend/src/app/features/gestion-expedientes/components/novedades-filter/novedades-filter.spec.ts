import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovedadesFilter } from './novedades-filter';

describe('NovedadesFilter', () => {
  let component: NovedadesFilter;
  let fixture: ComponentFixture<NovedadesFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovedadesFilter],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesFilter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
