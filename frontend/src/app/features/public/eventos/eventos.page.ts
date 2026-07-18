import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideTicket } from '@lucide/angular';

import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-eventos-page',
  imports: [BottomNavComponent, LucideTicket],
  templateUrl: './eventos.page.html',
  styleUrl: './eventos.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventosPage {
  readonly events = [
    { id: 'connect', name: 'Connect Night', startsAt: '14 setembro', registrationUrl: 'https://dinamus.recife/eventos/connect' },
    {
      id: 'volunteers',
      name: 'Treinamento de voluntários',
      startsAt: '21 setembro',
      endsAt: '22 setembro',
      registrationUrl: 'https://dinamus.recife/eventos/voluntarios',
    },
  ];
}
