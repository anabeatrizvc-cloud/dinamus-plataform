import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  AgendaItem,
  AuthSession,
  EventPayload,
  EventSummary,
  FirstVisitPayload,
  GrowthGroup,
  MemberPayload,
  MemberSummary,
  PrayerRequestPayload,
} from '../models/platform.models';

@Injectable({ providedIn: 'root' })
export class DnmsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  login(email: string, password: string) {
    return this.http.post<AuthSession>(`${this.baseUrl}/auth/login`, { email, password });
  }

  setupPassword(token: string, password: string) {
    return this.http.post<AuthSession>(`${this.baseUrl}/auth/setup-password`, { token, password });
  }

  listAgenda() {
    return this.http.get<AgendaItem[]>(`${this.baseUrl}/agenda`);
  }

  listEvents() {
    return this.http.get<EventSummary[]>(`${this.baseUrl}/events`);
  }

  listAdminEvents() {
    return this.http.get<EventSummary[]>(`${this.baseUrl}/admin/events`);
  }

  createEvent(payload: EventPayload) {
    return this.http.post<EventSummary>(`${this.baseUrl}/admin/events`, payload);
  }

  updateEvent(id: string, payload: EventPayload) {
    return this.http.put<EventSummary>(`${this.baseUrl}/admin/events/${id}`, payload);
  }

  deleteEvent(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/admin/events/${id}`);
  }

  listMembers() {
    return this.http.get<MemberSummary[]>(`${this.baseUrl}/admin/members`);
  }

  createMember(payload: MemberPayload) {
    return this.http.post<MemberSummary>(`${this.baseUrl}/admin/members`, payload);
  }

  updateMember(id: string, payload: MemberPayload) {
    return this.http.put<MemberSummary>(`${this.baseUrl}/admin/members/${id}`, payload);
  }

  resendMemberInvite(id: string) {
    return this.http.post<MemberSummary>(`${this.baseUrl}/admin/members/${id}/invite`, {});
  }

  deleteMember(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/admin/members/${id}`);
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
