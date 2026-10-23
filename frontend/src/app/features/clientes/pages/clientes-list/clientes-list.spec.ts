import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ClientesList } from './clientes-list';

describe('ClientesList', () => {
  let component: ClientesList;
  let fixture: ComponentFixture<ClientesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
