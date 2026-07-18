import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCalendarDays, LucidePencil, LucidePlus, LucideTicket, LucideTrash2 } from '@lucide/angular';

import { DnmsApiService } from '../../core/api/dnms-api.service';
import { EventPayload, EventSummary } from '../../core/models/platform.models';

const labels: Record<string, string> = {
  membros: 'Membros',
  eventos: 'Eventos',
  agenda: 'Agenda',
  gcs: 'GCs',
  voluntariado: 'Voluntariado',
  configuracoes: 'Configurações',
};

@Component({
  selector: 'dnms-admin-module-page',
  imports: [RouterLink, ReactiveFormsModule, LucideTicket, LucidePlus, LucidePencil, LucideTrash2, LucideCalendarDays],
  templateUrl: './admin-module.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminModulePage implements OnInit {
  private readonly api = inject(DnmsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly eventsState = signal<EventSummary[]>([]);

  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly title = computed(() => labels[this.route.snapshot.paramMap.get('module') ?? ''] ?? 'Módulo');
  readonly moduleKey = computed(() => this.route.snapshot.paramMap.get('module') ?? '');
  readonly isEventsModule = computed(() => this.moduleKey() === 'eventos');
  readonly events = this.eventsState.asReadonly();

  readonly eventForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    startsAt: ['', [Validators.required]],
    endsAt: [''],
    registrationUrl: ['', [Validators.required]],
  });

  ngOnInit() {
    if (this.isEventsModule()) {
      this.loadEvents();
    }
  }

  saveEvent() {
    this.eventForm.markAllAsTouched();
    if (this.eventForm.invalid) {
      return;
    }

    const value: EventPayload = this.eventForm.getRawValue();
    const editingId = this.editingId();
    this.isSaving.set(true);

    if (editingId) {
      this.api.updateEvent(editingId, value).subscribe({
        next: (saved) => {
          this.eventsState.update((events) => events.map((event) => (event.id === editingId ? saved : event)));
          this.finishEditing();
        },
        error: () => this.isSaving.set(false),
      });
    } else {
      this.api.createEvent(value).subscribe({
        next: (saved) => {
          this.eventsState.update((events) => [...events, saved]);
          this.finishEditing();
        },
        error: () => this.isSaving.set(false),
      });
    }
  }

  editEvent(event: EventSummary) {
    this.editingId.set(event.id);
    this.eventForm.setValue({
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationUrl: event.registrationUrl,
    });
  }

  deleteEvent(id: string) {
    this.api.deleteEvent(id).subscribe({
      next: () => {
        this.eventsState.update((events) => events.filter((event) => event.id !== id));
        if (this.editingId() === id) {
          this.finishEditing();
        }
      },
    });
  }

  private loadEvents() {
    this.api.listAdminEvents().subscribe({
      next: (events) => this.eventsState.set(events),
      error: () => this.eventsState.set([]),
    });
  }

  private finishEditing() {
    this.editingId.set(null);
    this.eventForm.reset();
    this.isSaving.set(false);
  }
}
