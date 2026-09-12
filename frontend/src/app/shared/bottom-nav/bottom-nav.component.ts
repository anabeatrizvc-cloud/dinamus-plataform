import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideArrowLeft, LucideCalendarDays, LucideHome, LucideMapPinned, LucideTicket, LucideUsersRound } from '@lucide/angular';

type NavItem = {
  label: string;
  path: string;
  icon: 'home' | 'users' | 'calendar' | 'ticket' | 'mission' | 'back';
};

@Component({
  selector: 'dnms-bottom-nav',
  imports: [RouterLink, RouterLinkActive, LucideHome, LucideUsersRound, LucideCalendarDays, LucideTicket, LucideMapPinned, LucideArrowLeft],
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
    { label: 'Missão', path: '/base-missionaria', icon: 'mission' },
    { label: 'Voltar', path: '/', icon: 'back' },
  ];
}
