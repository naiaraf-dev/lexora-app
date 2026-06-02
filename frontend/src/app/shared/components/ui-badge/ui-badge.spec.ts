import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiBadge } from './ui-badge';

describe('UiBadge', () => {
  let component: UiBadge;
  let fixture: ComponentFixture<UiBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(UiBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
