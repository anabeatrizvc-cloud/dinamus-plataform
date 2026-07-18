import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalendarDays, LucideTicket, LucideUsersRound } from '@lucide/angular';

import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-home-page',
  imports: [RouterLink, BottomNavComponent, LucideUsersRound, LucideCalendarDays, LucideTicket],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly cards = [
    {
      label: 'GCs',
      description: 'Encontre um grupo perto de você',
      path: '/gcs',
      icon: 'users',
      aria: 'Abrir GCs',
    },
    {
      label: 'Agenda',
      description: 'Veja nossos encontros fixos',
      path: '/agenda',
      icon: 'calendar',
      aria: 'Abrir Agenda',
    },
    {
      label: 'Eventos',
      description: 'Inscrições e próximos movimentos',
      path: '/eventos',
      icon: 'ticket',
      aria: 'Abrir Eventos',
    },
  ];
}
