export type Role = 'PUBLIC' | 'ADMIN' | 'LEADER' | 'VOLUNTEER' | 'PROFESSOR' | 'MEMBRO';

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

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export interface DisciplineSummary {
  id: string;
  courseId: string;
  title: string;
  description: string;
  teacherIds: string[];
  maxAbsences: number;
  usesGrades: boolean;
}

export interface LessonSummary {
  id: string;
  disciplineId: string;
  title: string;
  lessonDate: string;
  attendanceToken: string;
  attendanceTokenExpiresAt: string;
}

export interface MaterialSummary {
  id: string;
  disciplineId: string;
  lessonId: string;
  title: string;
  url: string;
}

export interface EvaluationSummary {
  id: string;
  disciplineId: string;
  title: string;
  weight: number;
  maxScore: number;
}

export interface EnrollmentSummary {
  id: string;
  disciplineId: string;
  studentId: string;
  status: string;
}

export interface GradeEntry {
  id: string;
  evaluationId: string;
  studentId: string;
  score: number;
}

export interface AttendanceEntry {
  id: string;
  lessonId: string;
  studentId: string;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED';
  scannedAt: string;
  validatedAt: string;
}

export interface ClassroomDashboard {
  courses: CourseSummary[];
  enrolledDisciplines: DisciplineSummary[];
  teachingDisciplines: DisciplineSummary[];
}

export interface DisciplineWorkspace {
  course: CourseSummary;
  discipline: DisciplineSummary;
  students: MemberSummary[];
  lessons: LessonSummary[];
  materials: MaterialSummary[];
  evaluations: EvaluationSummary[];
  grades: GradeEntry[];
  attendance: AttendanceEntry[];
}

export interface CoursePayload {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  status: string;
}

export interface DisciplinePayload {
  courseId: string;
  title: string;
  description: string;
  teacherIds: string[];
  maxAbsences: number;
  usesGrades: boolean;
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
