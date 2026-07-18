import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideCalendarDays } from '@lucide/angular';

import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-agenda-page',
  imports: [BottomNavComponent, LucideCalendarDays],
  templateUrl: './agenda.page.html',
  styleUrl: './agenda.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaPage {
  readonly schedule = [
    { day: 'Domingo', items: ['Culto — 09:00', 'Culto — 11:10', 'Culto — 17:00'] },
    { day: 'Quarta-feira', items: ['Culto Fire — 19:48 — a cada 15 dias'] },
    { day: 'Quinta ou sexta-feira', items: ['GC — 19:48 — a cada 15 dias'] },
  ];
}
