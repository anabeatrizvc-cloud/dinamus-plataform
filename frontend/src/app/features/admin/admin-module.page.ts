import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideCalendarDays,
  LucideChevronDown,
  LucideCheck,
  LucideDownload,
  LucideEye,
  LucideHammer,
  LucideImageOff,
  LucideKeyRound,
  LucideLoaderCircle,
  LucideMail,
  LucideMapPinned,
  LucidePencil,
  LucidePlus,
  LucideQrCode,
  LucideRotateCcw,
  LucideShieldCheck,
  LucideTicket,
  LucideTrash2,
  LucideUsersRound,
  LucideX,
} from '@lucide/angular';
import { map } from 'rxjs';

import { DnmsApiService } from '../../core/api/dnms-api.service';
import {
  EcoAttendance,
  EcoLesson,
  EventPayload,
  EventSummary,
  MemberPayload,
  MemberSummary,
  MissionBaseCampaign,
  MissionBaseCampaignPayload,
  MissionBaseStageStatus,
  Role,
} from '../../core/models/platform.models';

const labels: Record<string, string> = {
  membros: 'Membros',
  eventos: 'Eventos',
  eco: 'Eco',
  'base-missionaria': 'Base Missionária',
};

type MissionStageDraft = {
  id: string;
  name: string;
  description: string;
  goalCents: number;
  raisedCents: number;
  status: MissionBaseStageStatus;
  visible: boolean;
  current: boolean;
  percent: number;
  goalExceeded: boolean;
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
    LucideChevronDown,
    LucideUsersRound,
    LucideMail,
    LucideQrCode,
    LucideMapPinned,
    LucideKeyRound,
    LucideHammer,
    LucideEye,
    LucideCheck,
    LucideX,
    LucideDownload,
    LucideImageOff,
    LucideShieldCheck,
    LucideLoaderCircle,
    LucideRotateCcw,
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
  private readonly missionBaseState = signal<MissionBaseCampaign | null>(null);
  readonly missionStageDrafts = signal<MissionStageDraft[]>([]);

  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly isLoadingMissionBase = signal(false);
  readonly feedback = signal('');
  readonly selectedEcoLessonId = signal<string | null>(null);
  readonly selectedPhoto = signal<EcoAttendance | null>(null);
  readonly isLoadingEcoAttendances = signal(false);
  readonly moduleKey = toSignal(this.route.url.pipe(map((segments) => segments[0]?.path ?? '')), {
    initialValue: this.route.snapshot.url[0]?.path ?? '',
  });
  readonly title = computed(() => labels[this.moduleKey()] ?? 'Administração');
  readonly isEventsModule = computed(() => this.moduleKey() === 'eventos');
  readonly isMembersModule = computed(() => this.moduleKey() === 'membros');
  readonly isEcoModule = computed(() => this.moduleKey() === 'eco');
  readonly isMissionBaseModule = computed(() => this.moduleKey() === 'base-missionaria');
  readonly events = this.eventsState.asReadonly();
  readonly members = this.membersState.asReadonly();
  readonly ecoLessons = this.ecoLessonsState.asReadonly();
  readonly ecoAttendances = this.ecoAttendancesState.asReadonly();
  readonly missionBase = this.missionBaseState.asReadonly();
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

  readonly missionBaseForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(360)]],
    active: [true],
    currentStageId: [''],
    resetConfirmation: [''],
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

  saveMissionBase() {
    this.missionBaseForm.markAllAsTouched();
    if (this.missionBaseForm.invalid) {
      this.feedback.set('Preencha título, descrição e etapa atual da Base Missionária.');
      return;
    }

    const form = this.missionBaseForm.getRawValue();
    const payload: MissionBaseCampaignPayload = {
      title: form.title,
      description: form.description,
      active: form.active,
      currentStageId: form.currentStageId,
      stages: this.missionStageDrafts().map((stage) => ({
        id: stage.id,
        goalCents: stage.goalCents,
        raisedCents: stage.raisedCents,
        status: stage.status,
        visible: stage.visible,
      })),
    };

    this.isSaving.set(true);
    this.api.updateMissionBase(payload).subscribe({
      next: (campaign) => {
        this.applyMissionBase(campaign);
        this.isSaving.set(false);
        this.feedback.set('Base Missionária atualizada com sucesso.');
      },
      error: () => this.fail('Não foi possível salvar a Base Missionária. Confira metas e status.'),
    });
  }

  resetMissionBase() {
    const confirmation = this.missionBaseForm.controls.resetConfirmation.value;
    if (confirmation !== 'ZERAR') {
      this.feedback.set('Digite ZERAR para confirmar o reset dos valores arrecadados.');
      return;
    }

    this.isSaving.set(true);
    this.api.resetMissionBase(confirmation).subscribe({
      next: (campaign) => {
        this.applyMissionBase(campaign);
        this.missionBaseForm.controls.resetConfirmation.setValue('');
        this.isSaving.set(false);
        this.feedback.set('Valores arrecadados zerados. Metas, textos e status foram preservados.');
      },
      error: () => this.fail('Não foi possível zerar os dados da Base Missionária.'),
    });
  }

  updateMissionStage(stageId: string, field: 'goalCents' | 'raisedCents' | 'status' | 'visible', value: string | boolean) {
    this.missionStageDrafts.update((stages) =>
      stages.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }
        if (field === 'goalCents' || field === 'raisedCents') {
          return { ...stage, [field]: this.reaisToCents(String(value)) };
        }
        return { ...stage, [field]: value };
      }),
    );
  }

  missionBaseProgressWidth(percent: number) {
    return `${Math.max(0, Math.min(100, percent))}%`;
  }

  missionStageStatusLabel(status: MissionBaseStageStatus) {
    if (status === 'CONCLUIDA') {
      return 'Concluída';
    }
    if (status === 'EM_ANDAMENTO') {
      return 'Em andamento';
    }
    return 'Em breve';
  }

  formatCurrency(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  currencyInputValue(cents: number) {
    return (cents / 100).toFixed(2);
  }

  selectEcoLesson(lesson: EcoLesson) {
    this.selectedEcoLessonId.set(lesson.id);
    this.isLoadingEcoAttendances.set(true);
    this.feedback.set('');
    this.api.listEcoAttendances(lesson.id).subscribe({
      next: (attendances) => {
        if (this.selectedEcoLessonId() !== lesson.id) {
          return;
        }
        this.ecoAttendancesState.set(attendances);
        this.isLoadingEcoAttendances.set(false);
      },
      error: () => {
        if (this.selectedEcoLessonId() !== lesson.id) {
          return;
        }
        this.ecoAttendancesState.set([]);
        this.isLoadingEcoAttendances.set(false);
        this.feedback.set('Não foi possível carregar as presenças do Eco.');
      },
    });
  }

  openPhoto(attendance: EcoAttendance) {
    if (!this.hasPhoto(attendance)) {
      this.feedback.set('A foto desta presença já foi removida após revisão.');
      return;
    }
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
        if (this.selectedPhoto()?.id === saved.id) {
          this.closePhoto();
        }
        this.feedback.set(validated ? 'Presença validada.' : 'Presença marcada como não validada.');
        this.isSaving.set(false);
      },
      error: () => this.fail('Não foi possível atualizar a presença.'),
    });
  }

  validateAllEcoAttendances() {
    const lesson = this.selectedEcoLesson();
    if (!lesson) {
      return;
    }

    this.isSaving.set(true);
    this.api.validateAllEcoAttendances(lesson.id).subscribe({
      next: (attendances) => {
        this.ecoAttendancesState.set(attendances);
        this.closePhoto();
        this.isSaving.set(false);
        this.feedback.set('Todas as presenças da aula foram validadas e as fotos foram removidas dos registros.');
      },
      error: () => this.fail('Não foi possível validar todas as presenças.'),
    });
  }

  purgeEcoPhotos() {
    const lesson = this.selectedEcoLesson();
    if (!lesson) {
      return;
    }

    this.isSaving.set(true);
    this.api.purgeEcoReviewedPhotos(lesson.id).subscribe({
      next: (result) => {
        this.isSaving.set(false);
        this.closePhoto();
        this.selectEcoLesson(lesson);
        this.feedback.set(result.updated ? `${result.updated} foto(s) revisada(s) foram removidas.` : 'Não havia fotos revisadas para remover nesta aula.');
      },
      error: () => this.fail('Não foi possível limpar as fotos revisadas.'),
    });
  }

  downloadLessonCsv() {
    const lesson = this.selectedEcoLesson();
    if (!lesson) {
      return;
    }
    this.api.downloadEcoLessonCsv(lesson.id).subscribe({
      next: (blob) => this.downloadBlob(blob, `eco-${lesson.lessonDate}-presencas.csv`),
      error: () => this.fail('Não foi possível baixar a planilha da aula.'),
    });
  }

  downloadEcoSummaryCsv() {
    this.api.downloadEcoStudentsSummaryCsv().subscribe({
      next: (blob) => this.downloadBlob(blob, 'eco-resumo-geral.csv'),
      error: () => this.fail('Não foi possível baixar a planilha geral.'),
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

  attendanceCount(lesson: EcoLesson) {
    if (lesson.id !== this.selectedEcoLessonId()) {
      return null;
    }
    return this.ecoAttendances().length;
  }

  pendingCount() {
    return this.ecoAttendances().filter((attendance) => attendance.status === 'PENDING').length;
  }

  validatedCount() {
    return this.ecoAttendances().filter((attendance) => attendance.status === 'VALIDATED').length;
  }

  hasPhoto(attendance: EcoAttendance) {
    return Boolean(attendance.photoDataUrl);
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
    this.isLoadingEcoAttendances.set(false);

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

    if (this.isMissionBaseModule()) {
      this.loadMissionBase();
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
        this.isLoadingEcoAttendances.set(false);
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

  private loadMissionBase() {
    this.isLoadingMissionBase.set(true);
    this.api.getAdminMissionBase().subscribe({
      next: (campaign) => {
        this.applyMissionBase(campaign);
        this.isLoadingMissionBase.set(false);
      },
      error: () => {
        this.missionBaseState.set(null);
        this.missionStageDrafts.set([]);
        this.isLoadingMissionBase.set(false);
        this.feedback.set('Não foi possível carregar a Base Missionária.');
      },
    });
  }

  private applyMissionBase(campaign: MissionBaseCampaign) {
    this.missionBaseState.set(campaign);
    this.missionBaseForm.patchValue({
      title: campaign.title,
      description: campaign.description,
      active: campaign.active,
      currentStageId: campaign.stages.find((stage) => stage.current)?.id ?? campaign.stages[0]?.id ?? '',
    });
    this.missionStageDrafts.set(
      campaign.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
        goalCents: stage.goalCents,
        raisedCents: stage.raisedCents,
        status: stage.status,
        visible: stage.visible,
        current: stage.current,
        percent: stage.percent,
        goalExceeded: stage.goalExceeded,
      })),
    );
  }

  private reaisToCents(value: string) {
    const parsed = Number(value.replace(/[^\d,.]/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed * 100);
  }

  private fail(message: string) {
    this.isSaving.set(false);
    this.feedback.set(message);
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
