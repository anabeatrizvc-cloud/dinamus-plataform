export type Role = 'PUBLIC' | 'ADMIN' | 'LEADER' | 'VOLUNTEER' | 'MEMBRO';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles: Role[];
  };
}

export interface EventSummary {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  registrationUrl: string;
}

export interface EventPayload {
  name: string;
  startsAt: string;
  endsAt: string;
  registrationUrl: string;
}

export interface EcoLesson {
  id: string;
  title: string;
  lessonDate: string;
}

export type EcoAttendanceStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';

export interface EcoAttendance {
  id: string;
  lessonId: string;
  lessonDate: string;
  name: string;
  phone: string;
  photoDataUrl: string;
  status: EcoAttendanceStatus;
  createdAt: string;
  validatedAt: string;
}

export interface EcoAttendancePayload {
  name: string;
  phone: string;
  lessonDate: string;
  photoDataUrl: string;
}

export interface EcoStudentSuggestion {
  name: string;
  phone: string;
}

export interface MemberSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  roles: Role[];
  active: boolean;
  invitePending: boolean;
  setupToken: string;
}

export interface MemberPayload {
  name: string;
  phone: string;
  email: string;
  roles: Role[];
  active: boolean;
}

export interface AgendaItem {
  id: string;
  title: string;
  startsAt: string;
  ministry: string;
}

export interface GrowthGroup {
  id: string;
  name: string;
  neighborhood: string;
  dayOfWeek: string;
  leader: string;
}

export interface PrayerRequestPayload {
  name: string;
  phone: string;
  message: string;
}

export interface FirstVisitPayload {
  name: string;
  phone: string;
  email: string;
  visitDate: string;
}
