import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ClienteModal } from './cliente-modal';

describe('ClienteModal', () => {
  let component: ClienteModal;
  let fixture: ComponentFixture<ClienteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
