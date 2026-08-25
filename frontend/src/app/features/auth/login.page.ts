import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLoaderCircle, LucideLockKeyhole, LucideLogIn, LucideMail } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'dnms-login-page',
  imports: [ReactiveFormsModule, RouterLink, LucideLogIn, LucideMail, LucideLockKeyhole, LucideEye, LucideEyeOff, LucideLoaderCircle],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['admin@dinamus.local', [Validators.required, Validators.email]],
    password: ['dnms-admin', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Informe email e senha para continuar.');
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.error.set('');
    this.isSubmitting.set(true);
    this.auth.login(email, password).subscribe({
      next: (session) => void this.router.navigateByUrl(session.user.roles.includes('ADMIN') ? '/admin/dashboard' : '/'),
      error: () => {
        this.isSubmitting.set(false);
        this.error.set('Não foi possível entrar com essas credenciais.');
      },
    });
  }

  togglePassword() {
    this.showPassword.update((value) => !value);
  }
}
