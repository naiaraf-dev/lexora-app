import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UiBadge } from './ui-badge';

describe('UiBadge', () => {
  let component: UiBadge;
  let fixture: ComponentFixture<UiBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiBadge],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UiBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
