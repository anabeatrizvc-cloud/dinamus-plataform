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

export type MissionBaseStageStatus = 'EM_BREVE' | 'EM_ANDAMENTO' | 'CONCLUIDA';

export interface MissionBaseStage {
  id: string;
  name: string;
  description: string;
  goalCents: number;
  raisedCents: number;
  percent: number;
  goalExceeded: boolean;
  status: MissionBaseStageStatus;
  icon: string;
  sortOrder: number;
  current: boolean;
  visible: boolean;
  remainingCents?: number | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface MissionBaseCampaign {
  id: string;
  title: string;
  description: string;
  active: boolean;
  totalGoalCents: number;
  totalRaisedCents: number;
  percent: number;
  goalExceeded: boolean;
  stages: MissionBaseStage[];
  updatedAt?: string | null;
  version: number;
}

export interface MissionBaseStagePayload {
  id: string;
  name: string;
  description: string;
  goalCents: number;
  raisedCents: number;
  visible: boolean;
  sortOrder: number;
}

export interface MissionBaseCampaignPayload {
  title: string;
  description: string;
  active: boolean;
  version: number;
  stages: MissionBaseStagePayload[];
}

export interface MissionBasePixPayload {
  stageId: string;
  amountCents: number;
}

export interface MissionBasePix {
  stageId: string;
  stageName: string;
  amountCents: number;
  txid: string;
  pixPayload: string;
}
