import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideArrowLeft, LucideCalendarDays, LucideHome, LucideTicket, LucideUsersRound } from '@lucide/angular';

type NavItem = {
  label: string;
  path: string;
  icon: 'home' | 'users' | 'calendar' | 'ticket' | 'back';
};

@Component({
  selector: 'dnms-bottom-nav',
  imports: [RouterLink, RouterLinkActive, LucideHome, LucideUsersRound, LucideCalendarDays, LucideTicket, LucideArrowLeft],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  readonly compact = input(false);

  readonly items: NavItem[] = [
    { label: 'Início', path: '/', icon: 'home' },
    { label: 'GCs', path: '/gcs', icon: 'users' },
    { label: 'Agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Eventos', path: '/eventos', icon: 'ticket' },
    { label: 'Voltar', path: '/', icon: 'back' },
  ];
}
