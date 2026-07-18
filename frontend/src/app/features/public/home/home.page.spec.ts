import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomePage } from './home.page';

describe('HomePage', () => {
  it('renders the approved primary actions', async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('DINAMUS RECIFE');
    expect(fixture.nativeElement.querySelectorAll('.home-card').length).toBe(3);
  });
});
