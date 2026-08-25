import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideKeyRound } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'dnms-setup-password-page',
  imports: [ReactiveFormsModule, RouterLink, LucideKeyRound],
  templateUrl: './setup-password.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    token: [this.route.snapshot.queryParamMap.get('token') ?? '', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    this.auth.setupPassword(value.token, value.password).subscribe({
      next: (session) => void this.router.navigateByUrl(session.user.roles.includes('ADMIN') ? '/admin/dashboard' : '/'),
    });
  }
}
