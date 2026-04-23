import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteDetail } from './cliente-detail';

describe('ClienteDetail', () => {
  let component: ClienteDetail;
  let fixture: ComponentFixture<ClienteDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
