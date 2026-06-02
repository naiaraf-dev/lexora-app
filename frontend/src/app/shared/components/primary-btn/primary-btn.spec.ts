import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrimaryBtn } from './primary-btn';

describe('PrimaryBtn', () => {
  let component: PrimaryBtn;
  let fixture: ComponentFixture<PrimaryBtn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimaryBtn],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimaryBtn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
