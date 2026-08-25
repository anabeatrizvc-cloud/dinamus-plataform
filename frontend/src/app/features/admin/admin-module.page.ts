import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideCalendarDays,
  LucideCheck,
  LucideEye,
  LucideMail,
  LucidePencil,
  LucidePlus,
  LucideQrCode,
  LucideTicket,
  LucideTrash2,
  LucideUsersRound,
  LucideX,
} from '@lucide/angular';
import { map } from 'rxjs';

import { DnmsApiService } from '../../core/api/dnms-api.service';
import { EcoAttendance, EcoLesson, EventPayload, EventSummary, MemberPayload, MemberSummary, Role } from '../../core/models/platform.models';

const labels: Record<string, string> = {
  membros: 'Membros',
  eventos: 'Eventos',
  eco: 'Eco',
};

@Component({
  selector: 'dnms-admin-module-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
    LucideTicket,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideCalendarDays,
    LucideUsersRound,
    LucideMail,
    LucideQrCode,
    LucideEye,
    LucideCheck,
    LucideX,
  ],
  templateUrl: './admin-module.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminModulePage implements OnInit {
  private readonly api = inject(DnmsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsState = signal<EventSummary[]>([]);
  private readonly membersState = signal<MemberSummary[]>([]);
  private readonly ecoLessonsState = signal<EcoLesson[]>([]);
  private readonly ecoAttendancesState = signal<EcoAttendance[]>([]);

  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly feedback = signal('');
  readonly selectedEcoLessonId = signal<string | null>(null);
  readonly selectedPhoto = signal<EcoAttendance | null>(null);
  readonly moduleKey = toSignal(this.route.url.pipe(map((segments) => segments[0]?.path ?? '')), {
    initialValue: this.route.snapshot.url[0]?.path ?? '',
  });
  readonly title = computed(() => labels[this.moduleKey()] ?? 'Administração');
  readonly isEventsModule = computed(() => this.moduleKey() === 'eventos');
  readonly isMembersModule = computed(() => this.moduleKey() === 'membros');
  readonly isEcoModule = computed(() => this.moduleKey() === 'eco');
  readonly events = this.eventsState.asReadonly();
  readonly members = this.membersState.asReadonly();
  readonly ecoLessons = this.ecoLessonsState.asReadonly();
  readonly ecoAttendances = this.ecoAttendancesState.asReadonly();
  readonly selectedEcoLesson = computed(() => this.ecoLessons().find((lesson) => lesson.id === this.selectedEcoLessonId()) ?? null);
  readonly activeMembers = computed(() => this.members().filter((member) => member.active).length);
  readonly pendingInvites = computed(() => this.members().filter((member) => member.invitePending).length);
  readonly adminMembers = computed(() => this.members().filter((member) => member.roles.includes('ADMIN')).length);

  readonly eventForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    startsAt: ['', [Validators.required]],
    endsAt: [''],
    registrationUrl: ['', [Validators.required]],
  });

  readonly memberForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.email]],
    active: [true],
    admin: [false],
  });

  ngOnInit() {
    this.route.url.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadModule());
  }

  saveEvent() {
    this.eventForm.markAllAsTouched();
    if (this.eventForm.invalid) {
      this.feedback.set('Preencha nome, data de início e link de inscrição.');
      return;
    }

    const value: EventPayload = this.eventForm.getRawValue();
    const editingId = this.editingId();
    this.isSaving.set(true);

    if (editingId) {
      this.api.updateEvent(editingId, value).subscribe({
        next: (saved) => {
          this.eventsState.update((events) => events.map((event) => (event.id === editingId ? saved : event)));
          this.feedback.set('Evento atualizado com sucesso.');
          this.finishEditing();
        },
        error: () => this.fail('Não foi possível atualizar o evento. Confira os dados e tente novamente.'),
      });
      return;
    }

    this.api.createEvent(value).subscribe({
      next: (saved) => {
        this.eventsState.update((events) => [saved, ...events]);
        this.feedback.set('Evento criado e publicado na página pública.');
        this.finishEditing();
      },
      error: () => this.fail('Não foi possível criar o evento. Confira nome, data e link de inscrição.'),
    });
  }

  editEvent(event: EventSummary) {
    this.editingId.set(event.id);
    this.eventForm.setValue({
      name: event.name,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationUrl: event.registrationUrl,
    });
    this.feedback.set('Editando evento selecionado.');
  }

  deleteEvent(id: string) {
    this.api.deleteEvent(id).subscribe({
      next: () => {
        this.eventsState.update((events) => events.filter((event) => event.id !== id));
        this.feedback.set('Evento excluído.');
        if (this.editingId() === id) {
          this.finishEditing();
        }
      },
      error: () => this.fail('Não foi possível excluir o evento.'),
    });
  }

  saveMember() {
    this.memberForm.markAllAsTouched();
    if (this.memberForm.invalid) {
      this.feedback.set('Preencha nome e telefone. O e-mail é opcional, mas precisa ser válido quando informado.');
      return;
    }

    const value = this.memberForm.getRawValue();
    const roles: Role[] = ['MEMBRO'];
    if (value.admin) {
      roles.push('ADMIN');
    }

    const payload: MemberPayload = { name: value.name, phone: value.phone, email: value.email, active: value.active, roles };
    const editingId = this.editingId();
    this.isSaving.set(true);
    const request = editingId ? this.api.updateMember(editingId, payload) : this.api.createMember(payload);

    request.subscribe({
      next: (saved) => {
        this.membersState.update((members) => {
          const without = members.filter((member) => member.id !== saved.id);
          return [saved, ...without];
        });
        this.feedback.set(saved.invitePending ? 'Membro salvo. O convite de senha ficou disponível.' : 'Membro salvo com sucesso.');
        this.finishEditing();
      },
      error: () => this.fail('Não foi possível salvar o membro. Confira os dados e tente novamente.'),
    });
  }

  editMember(member: MemberSummary) {
    this.editingId.set(member.id);
    this.memberForm.setValue({
      name: member.name,
      phone: member.phone,
      email: member.email,
      active: member.active,
      admin: member.roles.includes('ADMIN'),
    });
    this.feedback.set('Editando membro selecionado.');
  }

  deleteMember(id: string) {
    this.api.deleteMember(id).subscribe({
      next: () => {
        this.membersState.update((members) => members.filter((member) => member.id !== id));
        this.feedback.set('Membro excluído.');
        if (this.editingId() === id) {
          this.finishEditing();
        }
      },
      error: () => this.fail('Não foi possível excluir o membro.'),
    });
  }

  resendInvite(member: MemberSummary) {
    if (!member.email) {
      this.feedback.set('Informe um e-mail antes de enviar convite.');
      return;
    }

    this.isSaving.set(true);
    this.api.resendMemberInvite(member.id).subscribe({
      next: (saved) => {
        this.membersState.update((members) => members.map((item) => (item.id === saved.id ? saved : item)));
        this.isSaving.set(false);
        this.feedback.set('Convite reenviado ou registrado no log do servidor.');
      },
      error: () => this.fail('Não foi possível enviar o convite. Verifique a configuração de e-mail.'),
    });
  }

  selectEcoLesson(lesson: EcoLesson) {
    this.selectedEcoLessonId.set(lesson.id);
    this.feedback.set('');
    this.api.listEcoAttendances(lesson.id).subscribe({
      next: (attendances) => this.ecoAttendancesState.set(attendances),
      error: () => {
        this.ecoAttendancesState.set([]);
        this.feedback.set('Não foi possível carregar as presenças do Eco.');
      },
    });
  }

  openPhoto(attendance: EcoAttendance) {
    this.selectedPhoto.set(attendance);
  }

  closePhoto() {
    this.selectedPhoto.set(null);
  }

  validateEcoAttendance(attendance: EcoAttendance, validated: boolean) {
    this.isSaving.set(true);
    this.api.validateEcoAttendance(attendance.lessonId, attendance.id, validated).subscribe({
      next: (saved) => {
        this.ecoAttendancesState.update((items) => items.map((item) => (item.id === saved.id ? saved : item)));
        this.feedback.set(validated ? 'Presença validada.' : 'Presença marcada como não validada.');
        this.isSaving.set(false);
      },
      error: () => this.fail('Não foi possível atualizar a presença.'),
    });
  }

  inviteLink(member: MemberSummary) {
    if (!member.setupToken) {
      return '';
    }
    return `${globalThis.location?.origin ?? ''}/setup-password?token=${member.setupToken}`;
  }

  roleLabel(member: MemberSummary) {
    if (member.roles.includes('ADMIN')) {
      return 'Administrador';
    }
    return 'Membro';
  }

  eventDate(event: EventSummary) {
    return event.endsAt ? `${event.startsAt} até ${event.endsAt}` : event.startsAt;
  }

  ecoLessonLabel(lesson: EcoLesson) {
    return `${lesson.title} - ${this.formatDate(lesson.lessonDate)}`;
  }

  statusLabel(status: EcoAttendance['status']) {
    if (status === 'VALIDATED') {
      return 'Validada';
    }
    if (status === 'REJECTED') {
      return 'Não validada';
    }
    return 'Pendente';
  }

  formatDate(value: string) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  formatDateTime(value: string) {
    if (!value) {
      return '';
    }
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private loadEvents() {
    this.api.listAdminEvents().subscribe({
      next: (events) => this.eventsState.set(events),
      error: () => this.eventsState.set([]),
    });
  }

  private loadMembers() {
    this.api.listMembers().subscribe({
      next: (members) => this.membersState.set(members),
      error: () => this.membersState.set([]),
    });
  }

  private loadModule() {
    this.feedback.set('');
    this.editingId.set(null);
    this.isSaving.set(false);

    if (this.isEventsModule()) {
      this.loadEvents();
      return;
    }

    if (this.isMembersModule()) {
      this.loadMembers();
      return;
    }

    if (this.isEcoModule()) {
      this.loadEcoLessons();
      return;
    }

    void this.router.navigateByUrl('/admin/dashboard');
  }

  private loadEcoLessons() {
    this.api.listEcoLessons().subscribe({
      next: (lessons) => {
        this.ecoLessonsState.set(lessons);
        const firstLesson = lessons[0];
        if (firstLesson) {
          this.selectEcoLesson(firstLesson);
        }
      },
      error: () => {
        this.ecoLessonsState.set([]);
        this.ecoAttendancesState.set([]);
        this.feedback.set('Não foi possível carregar as aulas do Eco.');
      },
    });
  }

  private finishEditing() {
    this.editingId.set(null);
    if (this.isEventsModule()) {
      this.eventForm.reset({ name: '', startsAt: '', endsAt: '', registrationUrl: '' });
    }
    if (this.isMembersModule()) {
      this.memberForm.reset({ name: '', phone: '', email: '', active: true, admin: false });
    }
    this.isSaving.set(false);
  }

  private fail(message: string) {
    this.isSaving.set(false);
    this.feedback.set(message);
  }
}
