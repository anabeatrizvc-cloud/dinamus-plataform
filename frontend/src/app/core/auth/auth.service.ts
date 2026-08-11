import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { DnmsApiService } from '../api/dnms-api.service';
import { AuthSession } from '../models/platform.models';

const STORAGE_KEY = 'dnms.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(DnmsApiService);
  private readonly router = inject(Router);
  private readonly sessionState = signal<AuthSession | null>(this.readSession());

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.sessionState()?.accessToken));
  readonly userName = computed(() => this.sessionState()?.user.name ?? '');

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(tap((session) => this.persist(session)));
  }

  setupPassword(token: string, password: string) {
    return this.api.setupPassword(token, password).pipe(tap((session) => this.persist(session)));
  }

  hasRole(role: string) {
    return Boolean(this.sessionState()?.user.roles.some((item) => item === role));
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionState.set(null);
    void this.router.navigateByUrl('/');
  }

  accessToken() {
    return this.sessionState()?.accessToken ?? null;
  }

  private persist(session: AuthSession) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionState.set(session);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
