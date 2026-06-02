import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientesList } from './clientes-list';

describe('ClientesList', () => {
  let component: ClientesList;
  let fixture: ComponentFixture<ClientesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesList],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
