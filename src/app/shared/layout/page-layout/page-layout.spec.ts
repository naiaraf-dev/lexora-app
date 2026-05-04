import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageLayout } from './page-layout';

describe('PageLayout', () => {
  let component: PageLayout;
  let fixture: ComponentFixture<PageLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(PageLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
