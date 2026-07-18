import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCalendarDays, LucidePencil, LucidePlus, LucideTicket, LucideTrash2 } from '@lucide/angular';

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
export class AdminModulePage {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly eventsState = signal<ManagedEvent[]>([
    {
      id: 'connect',
      name: 'Connect Night',
      startsAt: '2026-09-14',
      endsAt: '',
      registrationUrl: 'https://dinamus.recife/eventos/connect',
    },
    {
      id: 'volunteers',
      name: 'Treinamento de voluntários',
      startsAt: '2026-09-21',
      endsAt: '2026-09-22',
      registrationUrl: 'https://dinamus.recife/eventos/voluntarios',
    },
  ]);
  readonly editingId = signal<string | null>(null);
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

  saveEvent() {
    this.eventForm.markAllAsTouched();
    if (this.eventForm.invalid) {
      return;
    }

    const value = this.eventForm.getRawValue();
    const editingId = this.editingId();
    if (editingId) {
      this.eventsState.update((events) => events.map((event) => (event.id === editingId ? { ...event, ...value } : event)));
      this.editingId.set(null);
    } else {
      this.eventsState.update((events) => [
        ...events,
        {
          id: crypto.randomUUID(),
          ...value,
        },
      ]);
    }
    this.eventForm.reset();
  }

  editEvent(event: ManagedEvent) {
    this.editingId.set(event.id);
    this.eventForm.setValue({
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationUrl: event.registrationUrl,
    });
  }

  deleteEvent(id: string) {
    this.eventsState.update((events) => events.filter((event) => event.id !== id));
    if (this.editingId() === id) {
      this.editingId.set(null);
      this.eventForm.reset();
    }
  }
}

type ManagedEvent = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  registrationUrl: string;
};
