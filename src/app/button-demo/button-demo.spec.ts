import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonDemo } from './button-demo';

describe('ButtonDemo', () => {
  let component: ButtonDemo;
  let fixture: ComponentFixture<ButtonDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonDemo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
