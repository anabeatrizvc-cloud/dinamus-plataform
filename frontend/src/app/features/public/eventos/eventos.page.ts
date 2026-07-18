import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { LucideTicket } from '@lucide/angular';

import { DnmsApiService } from '../../../core/api/dnms-api.service';
import { EventSummary } from '../../../core/models/platform.models';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-eventos-page',
  imports: [BottomNavComponent, LucideTicket],
  templateUrl: './eventos.page.html',
  styleUrl: './eventos.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventosPage implements OnInit {
  private readonly api = inject(DnmsApiService);

  readonly events = signal<EventSummary[]>([]);

  ngOnInit() {
    this.api.listEvents().subscribe({
      next: (events) => this.events.set(events),
      error: () => this.events.set([]),
    });
  }

  formatDate(value: string) {
    if (!value) {
      return '';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(date);
  }
}
