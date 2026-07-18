import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  AgendaItem,
  AuthSession,
  EventSummary,
  FirstVisitPayload,
  GrowthGroup,
  PrayerRequestPayload,
} from '../models/platform.models';

@Injectable({ providedIn: 'root' })
export class DnmsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  login(email: string, password: string) {
    return this.http.post<AuthSession>(`${this.baseUrl}/auth/login`, { email, password });
  }

  listAgenda() {
    return this.http.get<AgendaItem[]>(`${this.baseUrl}/agenda`);
  }

  listEvents() {
    return this.http.get<EventSummary[]>(`${this.baseUrl}/events`);
  }

  listGrowthGroups() {
    return this.http.get<GrowthGroup[]>(`${this.baseUrl}/growth-groups`);
  }

  requestPrayer(payload: PrayerRequestPayload) {
    return this.http.post<{ id: string; status: string }>(`${this.baseUrl}/prayer-requests`, payload);
  }

  registerFirstVisit(payload: FirstVisitPayload) {
    return this.http.post<{ id: string; status: string }>(`${this.baseUrl}/first-visits`, payload);
  }
}
