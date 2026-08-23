import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideBookOpen, LucideCalendarDays, LucidePencil, LucidePlus, LucideTicket, LucideTrash2, LucideUsersRound } from '@lucide/angular';
import { map } from 'rxjs';

import { DnmsApiService } from '../../core/api/dnms-api.service';
import { AttendanceReportRow, CourseSummary, DisciplineSummary, EventPayload, EventSummary, MemberPayload, MemberSummary, Role } from '../../core/models/platform.models';

type AcademicView = 'courses' | 'disciplines' | 'enrollments' | 'reports';

const labels: Record<string, string> = {
  membros: 'Membros',
  eventos: 'Eventos',
  cursos: 'Cursos',
  agenda: 'Agenda',
  gcs: 'GCs',
  voluntariado: 'Voluntariado',
  configuracoes: 'Configurações',
};

@Component({
  selector: 'dnms-admin-module-page',
  imports: [RouterLink, ReactiveFormsModule, LucideTicket, LucidePlus, LucidePencil, LucideTrash2, LucideCalendarDays, LucideUsersRound, LucideBookOpen],
  templateUrl: './admin-module.page.html',
  styleUrl: './admin.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminModulePage implements OnInit {
  private readonly api = inject(DnmsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventsState = signal<EventSummary[]>([]);
  private readonly membersState = signal<MemberSummary[]>([]);
  private readonly coursesState = signal<CourseSummary[]>([]);
  private readonly disciplinesState = signal<DisciplineSummary[]>([]);
  private readonly reportRowsState = signal<AttendanceReportRow[]>([]);

  readonly editingId = signal<string | null>(null);
  readonly isSaving = signal(false);
  readonly feedback = signal('');
  readonly academicView = signal<AcademicView>('courses');
  readonly selectedCourseId = signal('');
  readonly moduleKey = toSignal(this.route.paramMap.pipe(map((params) => params.get('module') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('module') ?? '',
  });
  readonly title = computed(() => labels[this.moduleKey()] ?? 'Módulo');
  readonly isEventsModule = computed(() => this.moduleKey() === 'eventos');
  readonly isMembersModule = computed(() => this.moduleKey() === 'membros');
  readonly isCoursesModule = computed(() => this.moduleKey() === 'cursos');
  readonly events = this.eventsState.asReadonly();
  readonly members = this.membersState.asReadonly();
  readonly courses = this.coursesState.asReadonly();
  readonly disciplines = this.disciplinesState.asReadonly();
  readonly reportRows = this.reportRowsState.asReadonly();
  readonly professors = computed(() => this.members().filter((member) => member.roles.includes('PROFESSOR')));
  readonly students = computed(() => this.members().filter((member) => member.roles.includes('MEMBRO')));
  readonly selectedCourse = computed(() => this.courses().find((course) => course.id === this.selectedCourseId()) ?? null);

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
    professor: [false],
  });

  readonly courseForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    startsAt: ['', [Validators.required]],
    endsAt: [''],
    status: ['OPEN'],
  });

  readonly disciplineForm = this.fb.nonNullable.group({
    courseId: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    teacherId: ['', [Validators.required]],
    maxAbsences: [2],
    usesGrades: [true],
  });

  readonly enrollmentForm = this.fb.nonNullable.group({
    disciplineId: ['', [Validators.required]],
    studentId: ['', [Validators.required]],
  });

  readonly reportForm = this.fb.nonNullable.group({
    disciplineId: ['', [Validators.required]],
  });

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadModule());
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
          this.feedback.set('Evento atualizado.');
          this.finishEditing();
        },
        error: () => this.fail('Não foi possível atualizar o evento. Confira os dados e tente novamente.'),
      });
    } else {
      this.api.createEvent(value).subscribe({
        next: (saved) => {
          this.eventsState.update((events) => [...events, saved]);
          this.feedback.set('Evento criado e publicado na página pública.');
          this.finishEditing();
        },
        error: () => this.fail('Não foi possível criar o evento. Confira nome, data e link de inscrição.'),
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
      return;
    }
    const value = this.memberForm.getRawValue();
    const roles: Role[] = ['MEMBRO'];
    if (value.admin) {
      roles.push('ADMIN');
    }
    if (value.professor) {
      roles.push('PROFESSOR');
    }
    const payload: MemberPayload = { name: value.name, phone: value.phone, email: value.email, active: value.active, roles };
    const editingId = this.editingId();
    this.isSaving.set(true);
    const request = editingId ? this.api.updateMember(editingId, payload) : this.api.createMember(payload);
    request.subscribe({
      next: (saved) => {
        this.membersState.update((members) => {
          const without = members.filter((member) => member.id !== saved.id);
          return [...without, saved];
        });
        this.feedback.set(saved.invitePending ? 'Membro salvo. O convite de senha foi enviado ou registrado no log do servidor.' : 'Membro salvo.');
        this.finishEditing();
      },
      error: () => this.fail('Não foi possível salvar o membro. Confira os dados e a configuração de e-mail.'),
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
      professor: member.roles.includes('PROFESSOR'),
    });
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
        this.feedback.set('Convite enviado ou registrado no log do servidor.');
      },
      error: () => this.fail('Não foi possível enviar o convite. Verifique as variáveis SMTP.'),
    });
  }

  saveCourse() {
    this.courseForm.markAllAsTouched();
    if (this.courseForm.invalid) {
      return;
    }
    this.isSaving.set(true);
    this.api.createCourse(this.courseForm.getRawValue()).subscribe({
      next: (course) => {
        this.coursesState.update((courses) => [...courses, course]);
        this.selectedCourseId.set(course.id);
        this.disciplineForm.patchValue({ courseId: course.id });
        this.academicView.set('disciplines');
        this.feedback.set('Curso criado. Agora cadastre as disciplinas dessa jornada.');
        this.courseForm.reset({ title: '', description: '', startsAt: '', endsAt: '', status: 'OPEN' });
        this.isSaving.set(false);
      },
      error: () => this.fail('Não foi possível criar o curso. Confira nome e data de início.'),
    });
  }

  saveDiscipline() {
    this.disciplineForm.markAllAsTouched();
    if (this.disciplineForm.invalid) {
      return;
    }
    const value = this.disciplineForm.getRawValue();
    this.isSaving.set(true);
    this.api
      .createDiscipline({
        courseId: value.courseId,
        title: value.title,
        description: value.description,
        teacherIds: value.teacherId ? [value.teacherId] : [],
        maxAbsences: value.maxAbsences,
        usesGrades: value.usesGrades,
      })
      .subscribe({
        next: (discipline) => {
          this.disciplinesState.update((disciplines) => [...disciplines, discipline]);
          this.selectedCourseId.set(discipline.courseId);
          this.enrollmentForm.patchValue({ disciplineId: discipline.id });
          this.feedback.set('Disciplina criada e adicionada ao curso.');
          this.disciplineForm.reset({ courseId: value.courseId, title: '', description: '', teacherId: '', maxAbsences: 2, usesGrades: true });
          this.isSaving.set(false);
        },
        error: () => this.fail('Não foi possível criar a disciplina. Selecione curso, professor e confira o nome.'),
      });
  }

  enrollStudent() {
    this.enrollmentForm.markAllAsTouched();
    if (this.enrollmentForm.invalid) {
      return;
    }
    const value = this.enrollmentForm.getRawValue();
    this.isSaving.set(true);
    this.api.enrollStudent(value.disciplineId, value.studentId).subscribe({
      next: () => {
        this.enrollmentForm.reset({ disciplineId: value.disciplineId, studentId: '' });
        this.feedback.set('Aluno matriculado na disciplina.');
        this.isSaving.set(false);
      },
      error: () => this.fail('Não foi possível matricular. Confira aluno e disciplina.'),
    });
  }

  loadAttendanceReport() {
    this.reportForm.markAllAsTouched();
    if (this.reportForm.invalid) {
      return;
    }
    this.isSaving.set(true);
    this.api.attendanceReport(this.reportForm.getRawValue().disciplineId).subscribe({
      next: (rows) => {
        this.reportRowsState.set(rows);
        this.feedback.set(rows.length ? 'Relatório carregado.' : 'Nenhum aluno encontrado para esta disciplina.');
        this.isSaving.set(false);
      },
      error: () => this.fail('Não foi possível carregar o relatório de frequência.'),
    });
  }

  setAcademicView(view: AcademicView) {
    this.academicView.set(view);
  }

  selectCourse(course: CourseSummary) {
    this.selectedCourseId.set(course.id);
    this.disciplineForm.patchValue({ courseId: course.id });
    this.academicView.set('disciplines');
  }

  courseDisciplines(courseId: string) {
    return this.disciplines().filter((discipline) => discipline.courseId === courseId);
  }

  coursePeriod(course: CourseSummary) {
    return course.endsAt ? `${course.startsAt} até ${course.endsAt}` : course.startsAt;
  }

  courseTitle(id: string) {
    return this.courses().find((course) => course.id === id)?.title ?? 'Curso';
  }

  teacherNames(ids: string[]) {
    const names = ids.map((id) => this.members().find((member) => member.id === id)?.name).filter(Boolean);
    return names.length ? names.join(', ') : 'Professor a definir';
  }

  inviteLink(member: MemberSummary) {
    if (!member.setupToken) {
      return '';
    }
    return `${globalThis.location?.origin ?? ''}/setup-password?token=${member.setupToken}`;
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

  private loadAcademic() {
    this.loadMembers();
    this.api.listAdminCourses().subscribe({
      next: (courses) => {
        this.coursesState.set(courses);
        if (!this.selectedCourseId() && courses.length) {
          this.selectedCourseId.set(courses[0].id);
          this.disciplineForm.patchValue({ courseId: courses[0].id });
        }
      },
      error: () => this.coursesState.set([]),
    });
    this.api.listAdminDisciplines().subscribe({
      next: (disciplines) => {
        this.disciplinesState.set(disciplines);
        if (disciplines.length && !this.reportForm.getRawValue().disciplineId) {
          this.reportForm.patchValue({ disciplineId: disciplines[0].id });
        }
      },
      error: () => this.disciplinesState.set([]),
    });
  }

  private loadModule() {
    this.feedback.set('');
    this.editingId.set(null);
    this.isSaving.set(false);
    if (this.isEventsModule()) {
      this.loadEvents();
    } else if (this.isMembersModule()) {
      this.loadMembers();
    } else if (this.isCoursesModule()) {
      this.loadAcademic();
    }
  }

  private finishEditing() {
    this.editingId.set(null);
    if (this.isEventsModule()) {
      this.eventForm.reset({ name: '', startsAt: '', endsAt: '', registrationUrl: '' });
    }
    if (this.isMembersModule()) {
      this.memberForm.reset({ name: '', phone: '', email: '', active: true, admin: false, professor: false });
    }
    this.isSaving.set(false);
  }

  private fail(message: string) {
    this.isSaving.set(false);
    this.feedback.set(message);
  }
}
