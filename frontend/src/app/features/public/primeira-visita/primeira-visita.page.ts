import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideChurch } from '@lucide/angular';

import { DnmsApiService } from '../../../core/api/dnms-api.service';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-primeira-visita-page',
  imports: [ReactiveFormsModule, BottomNavComponent, LucideChurch],
  templateUrl: './primeira-visita.page.html',
  styleUrl: '../public-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrimeiraVisitaPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DnmsApiService);
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    email: ['', [Validators.required, Validators.email]],
    visitDate: ['', [Validators.required]],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.api.registerFirstVisit(this.form.getRawValue()).subscribe({
      next: () => this.submitted.set(true),
      error: () => this.submitted.set(true),
    });
  }
}
