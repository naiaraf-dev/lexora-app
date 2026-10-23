import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ExpedienteTabs } from './expediente-tabs';

describe('ExpedienteTabs', () => {
  let component: ExpedienteTabs;
  let fixture: ComponentFixture<ExpedienteTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpedienteTabs],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpedienteTabs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
