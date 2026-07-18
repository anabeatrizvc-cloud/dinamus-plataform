export type Role = 'PUBLIC' | 'ADMIN' | 'LEADER' | 'VOLUNTEER';

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
  title: string;
  date: string;
  location: string;
  status: 'scheduled' | 'open' | 'closed';
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
