import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleDespensaPage } from './detalle-despensa.page';

describe('DetalleDespensaPage', () => {
  let component: DetalleDespensaPage;
  let fixture: ComponentFixture<DetalleDespensaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleDespensaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
