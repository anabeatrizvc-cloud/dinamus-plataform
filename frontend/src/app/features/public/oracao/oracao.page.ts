import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideHeartHandshake } from '@lucide/angular';

import { DnmsApiService } from '../../../core/api/dnms-api.service';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-oracao-page',
  imports: [ReactiveFormsModule, BottomNavComponent, LucideHeartHandshake],
  templateUrl: './oracao.page.html',
  styleUrl: '../public-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OracaoPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DnmsApiService);
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    message: ['', [Validators.required, Validators.minLength(12)]],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.api.requestPrayer(this.form.getRawValue()).subscribe({
      next: () => this.submitted.set(true),
      error: () => this.submitted.set(true),
    });
  }
}
