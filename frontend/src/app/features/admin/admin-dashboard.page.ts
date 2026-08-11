import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBookOpen, LucideCalendarDays, LucideHeartHandshake, LucideSettings, LucideTicket, LucideUsersRound } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'dnms-admin-dashboard-page',
  imports: [RouterLink, LucideUsersRound, LucideTicket, LucideCalendarDays, LucideSettings, LucideHeartHandshake, LucideBookOpen],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  readonly auth = inject(AuthService);
  readonly modules = [
    { label: 'Eventos', path: '/admin/eventos', metric: '2 inscrições abertas', icon: 'ticket', tone: 'primary' },
    { label: 'Membros', path: '/admin/membros', metric: '128 pessoas acompanhadas', icon: 'users', tone: 'default' },
    { label: 'Cursos', path: '/admin/cursos', metric: 'alunos, professores e aulas', icon: 'book', tone: 'primary' },
    { label: 'Agenda', path: '/admin/agenda', metric: '3 rotinas fixas', icon: 'calendar', tone: 'default' },
    { label: 'GCs', path: '/admin/gcs', metric: 'QR e direcionamento', icon: 'users', tone: 'default' },
    { label: 'Voluntariado', path: '/admin/voluntariado', metric: '42 escalas ativas', icon: 'calendar', tone: 'default' },
    { label: 'Configurações', path: '/admin/configuracoes', metric: 'segurança e acesso', icon: 'settings', tone: 'default' },
  ];

  readonly highlights = [
    { label: 'Pedidos de oração', value: '8', detail: 'novos esta semana', icon: 'care' },
    { label: 'Primeiras visitas', value: '5', detail: 'aguardando contato', icon: 'users' },
    { label: 'Eventos ativos', value: '2', detail: 'com inscrição', icon: 'ticket' },
  ];
}
