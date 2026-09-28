import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ConfiguracionView } from './configuracion';

describe('ConfiguracionView', () => {
  let component: ConfiguracionView;
  let fixture: ComponentFixture<ConfiguracionView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionView],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
