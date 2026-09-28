import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ClienteTable } from './cliente-table';

describe('ClienteTable', () => {
  let component: ClienteTable;
  let fixture: ComponentFixture<ClienteTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteTable],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteTable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
