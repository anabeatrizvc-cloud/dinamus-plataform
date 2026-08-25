import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideArrowRight, LucideHeartHandshake, LucideQrCode, LucideShieldCheck, LucideTicket, LucideUsersRound } from '@lucide/angular';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'dnms-admin-dashboard-page',
  imports: [RouterLink, RouterLinkActive, LucideUsersRound, LucideTicket, LucideQrCode, LucideHeartHandshake, LucideShieldCheck, LucideArrowRight],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  readonly auth = inject(AuthService);

  readonly modules = [
    {
      label: 'Eventos',
      path: '/admin/eventos',
      detail: 'Crie, edite e publique inscrições da igreja.',
      icon: 'ticket',
      tone: 'primary',
    },
    {
      label: 'Membros',
      path: '/admin/membros',
      detail: 'Gerencie cadastros, funções e convites de acesso.',
      icon: 'users',
      tone: 'default',
    },
    {
      label: 'Eco',
      path: '/admin/eco',
      detail: 'Valide presenças da aula a partir das selfies enviadas.',
      icon: 'eco',
      tone: 'default',
    },
  ];

  readonly notes = [
    { label: 'Operação enxuta', detail: 'Somente módulos ativos aparecem no painel.', icon: 'shield' },
    { label: 'Acesso protegido', detail: 'A administração continua restrita a usuários autorizados.', icon: 'care' },
  ];
}
