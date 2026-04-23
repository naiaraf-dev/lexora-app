import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TareaItem } from './tarea-item';

describe('TareaItem', () => {
  let component: TareaItem;
  let fixture: ComponentFixture<TareaItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TareaItem],
    }).compileComponents();

    fixture = TestBed.createComponent(TareaItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
