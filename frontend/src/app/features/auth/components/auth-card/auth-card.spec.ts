import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthCard } from './auth-card';

describe('AuthCard', () => {
  let component: AuthCard;
  let fixture: ComponentFixture<AuthCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthCard],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
