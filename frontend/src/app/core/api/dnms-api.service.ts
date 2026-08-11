import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  AgendaItem,
  AuthSession,
  AttendanceEntry,
  ClassroomDashboard,
  CoursePayload,
  CourseSummary,
  DisciplinePayload,
  DisciplineSummary,
  DisciplineWorkspace,
  EventPayload,
  EventSummary,
  EvaluationSummary,
  FirstVisitPayload,
  GradeEntry,
  GrowthGroup,
  LessonSummary,
  MaterialSummary,
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

  deleteMember(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/admin/members/${id}`);
  }

  listAdminCourses() {
    return this.http.get<CourseSummary[]>(`${this.baseUrl}/admin/academic/courses`);
  }

  listAdminDisciplines() {
    return this.http.get<DisciplineSummary[]>(`${this.baseUrl}/admin/academic/disciplines`);
  }

  createCourse(payload: CoursePayload) {
    return this.http.post<CourseSummary>(`${this.baseUrl}/admin/academic/courses`, payload);
  }

  createDiscipline(payload: DisciplinePayload) {
    return this.http.post<DisciplineSummary>(`${this.baseUrl}/admin/academic/disciplines`, payload);
  }

  enrollStudent(disciplineId: string, studentId: string) {
    return this.http.post(`${this.baseUrl}/admin/academic/enrollments`, { disciplineId, studentId });
  }

  classroomDashboard() {
    return this.http.get<ClassroomDashboard>(`${this.baseUrl}/classroom`);
  }

  disciplineWorkspace(disciplineId: string) {
    return this.http.get<DisciplineWorkspace>(`${this.baseUrl}/classroom/disciplines/${disciplineId}`);
  }

  scanAttendance(token: string) {
    return this.http.post<AttendanceEntry>(`${this.baseUrl}/classroom/attendance/scan`, { token });
  }

  createLesson(disciplineId: string, title: string, lessonDate: string) {
    return this.http.post<LessonSummary>(`${this.baseUrl}/classroom/teacher/lessons`, { disciplineId, title, lessonDate });
  }

  addMaterial(disciplineId: string, lessonId: string, title: string, url: string) {
    return this.http.post<MaterialSummary>(`${this.baseUrl}/classroom/teacher/materials`, { disciplineId, lessonId, title, url });
  }

  addEvaluation(disciplineId: string, title: string, weight: number, maxScore: number) {
    return this.http.post<EvaluationSummary>(`${this.baseUrl}/classroom/teacher/evaluations`, { disciplineId, title, weight, maxScore });
  }

  saveGrade(evaluationId: string, studentId: string, score: number) {
    return this.http.post<GradeEntry>(`${this.baseUrl}/classroom/teacher/grades`, { evaluationId, studentId, score });
  }

  generateAttendanceToken(lessonId: string) {
    return this.http.post<LessonSummary>(`${this.baseUrl}/classroom/teacher/lessons/${lessonId}/attendance-token`, {});
  }

  validateAttendance(attendanceId: string, present: boolean) {
    return this.http.post<AttendanceEntry>(`${this.baseUrl}/classroom/teacher/attendance/${attendanceId}/validate`, { present });
  }

  validateAllAttendance(lessonId: string) {
    return this.http.post<AttendanceEntry[]>(`${this.baseUrl}/classroom/teacher/lessons/${lessonId}/attendance/validate-all`, {});
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
