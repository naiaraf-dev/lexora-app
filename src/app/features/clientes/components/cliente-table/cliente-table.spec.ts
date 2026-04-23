import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteTable } from './cliente-table';

describe('ClienteTable', () => {
  let component: ClienteTable;
  let fixture: ComponentFixture<ClienteTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteTable],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
