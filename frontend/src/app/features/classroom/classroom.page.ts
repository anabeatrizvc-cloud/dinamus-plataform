import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideBookOpen, LucideCalendarDays, LucideCheck, LucidePlayCircle, LucideQrCode, LucideUpload } from '@lucide/angular';
import * as QRCode from 'qrcode';

import { DnmsApiService } from '../../core/api/dnms-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { AttendanceEntry, ClassroomDashboard, DisciplineSummary, DisciplineWorkspace, GradeEntry, LessonSummary, RecordedLesson } from '../../core/models/platform.models';

type ScannerControls = {
  stop: () => void;
};

type ClassroomView = 'overview' | 'attendance' | 'materials' | 'activities' | 'grades' | 'setup';

@Component({
  selector: 'dnms-classroom-page',
  imports: [ReactiveFormsModule, RouterLink, LucideBookOpen, LucideCalendarDays, LucideCheck, LucidePlayCircle, LucideQrCode, LucideUpload],
  templateUrl: './classroom.page.html',
  styleUrl: './classroom.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomPage implements OnInit {
  private readonly api = inject(DnmsApiService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private scannerControls: ScannerControls | null = null;

  @ViewChild('preview') preview?: ElementRef<HTMLVideoElement>;

  readonly dashboard = signal<ClassroomDashboard | null>(null);
  readonly workspace = signal<DisciplineWorkspace | null>(null);
  readonly selectedDisciplineId = signal('');
  readonly qrDataUrl = signal('');
  readonly qrLesson = signal<LessonSummary | null>(null);
  readonly attendanceMessage = signal('');
  readonly classroomFeedback = signal('');
  readonly scanning = signal(false);
  readonly activeView = signal<ClassroomView>('attendance');

  readonly isTeacher = computed(() => this.auth.hasRole('ADMIN') || this.auth.hasRole('PROFESSOR'));
  readonly visibleDisciplines = computed(() => {
    const dashboard = this.dashboard();
    if (!dashboard) {
      return [];
    }
    const merged = [...dashboard.enrolledDisciplines, ...dashboard.teachingDisciplines];
    return merged.filter((discipline, index) => merged.findIndex((item) => item.id === discipline.id) === index);
  });

  readonly lessonForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    lessonDate: ['', [Validators.required]],
  });

  readonly materialForm = this.fb.nonNullable.group({
    lessonId: [''],
    title: ['', [Validators.required, Validators.minLength(3)]],
    url: ['', [Validators.required]],
  });

  readonly recordingForm = this.fb.nonNullable.group({
    lessonId: [''],
    title: ['', [Validators.required, Validators.minLength(3)]],
    youtubeUrl: ['', [Validators.required]],
    visibleToStudents: [true],
  });

  readonly activityForm = this.fb.nonNullable.group({
    lessonId: [''],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    dueAt: [''],
    points: [0],
  });

  readonly evaluationForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    weight: [1],
    maxScore: [10],
  });

  readonly gradeForm = this.fb.nonNullable.group({
    evaluationId: ['', [Validators.required]],
    studentId: ['', [Validators.required]],
    score: [0],
  });

  readonly attendanceForm = this.fb.nonNullable.group({
    token: ['', [Validators.required]],
  });

  ngOnInit() {
    this.loadDashboard();
  }

  selectDiscipline(discipline: DisciplineSummary) {
    this.selectedDisciplineId.set(discipline.id);
    this.qrDataUrl.set('');
    this.qrLesson.set(null);
    this.classroomFeedback.set('');
    this.api.disciplineWorkspace(discipline.id).subscribe({
      next: (workspace) => this.workspace.set(workspace),
      error: () => {
        this.workspace.set(null);
        this.classroomFeedback.set('Nao conseguimos carregar esta disciplina. Tente novamente.');
      },
    });
  }

  setView(view: ClassroomView) {
    this.activeView.set(view);
  }

  createLesson() {
    const workspace = this.workspace();
    this.lessonForm.markAllAsTouched();
    if (!workspace || this.lessonForm.invalid) {
      return;
    }
    const value = this.lessonForm.getRawValue();
    this.api.createLesson(workspace.discipline.id, value.title, value.lessonDate).subscribe({
      next: (lesson) => {
        this.workspace.update((current) => (current ? { ...current, lessons: [...current.lessons, lesson] } : current));
        this.lessonForm.reset();
        this.classroomFeedback.set('Aula cadastrada com sucesso.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel criar a aula. Confira o tema e a data.'),
    });
  }

  addMaterial() {
    const workspace = this.workspace();
    this.materialForm.markAllAsTouched();
    if (!workspace || this.materialForm.invalid) {
      return;
    }
    const value = this.materialForm.getRawValue();
    this.api.addMaterial(workspace.discipline.id, value.lessonId, value.title, value.url).subscribe({
      next: (material) => {
        this.workspace.update((current) => (current ? { ...current, materials: [...current.materials, material] } : current));
        this.materialForm.reset();
        this.classroomFeedback.set('Material publicado.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel publicar o material. Confira o link.'),
    });
  }

  addRecording() {
    const workspace = this.workspace();
    this.recordingForm.markAllAsTouched();
    if (!workspace || this.recordingForm.invalid) {
      this.classroomFeedback.set('Informe titulo e link do YouTube para liberar a gravacao.');
      return;
    }
    const value = this.recordingForm.getRawValue();
    this.api.addRecording(workspace.discipline.id, value.lessonId, value.title, value.youtubeUrl, value.visibleToStudents).subscribe({
      next: (recording) => {
        this.workspace.update((current) => (current ? { ...current, recordings: [...(current.recordings ?? []), recording] } : current));
        this.recordingForm.reset({ lessonId: '', title: '', youtubeUrl: '', visibleToStudents: true });
        this.classroomFeedback.set('Gravacao liberada para os alunos autorizados.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel liberar a gravacao. Confira o link do YouTube.'),
    });
  }

  addActivity() {
    const workspace = this.workspace();
    this.activityForm.markAllAsTouched();
    if (!workspace || this.activityForm.invalid) {
      this.classroomFeedback.set('Informe o titulo da atividade antes de publicar.');
      return;
    }
    const value = this.activityForm.getRawValue();
    this.api.addActivity(workspace.discipline.id, value.lessonId, value.title, value.description, value.dueAt, value.points).subscribe({
      next: (activity) => {
        this.workspace.update((current) => (current ? { ...current, activities: [...current.activities, activity] } : current));
        this.activityForm.reset({ lessonId: '', title: '', description: '', dueAt: '', points: 0 });
        this.classroomFeedback.set('Atividade publicada para os alunos.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel publicar a atividade.'),
    });
  }

  addEvaluation() {
    const workspace = this.workspace();
    this.evaluationForm.markAllAsTouched();
    if (!workspace || this.evaluationForm.invalid) {
      return;
    }
    const value = this.evaluationForm.getRawValue();
    this.api.addEvaluation(workspace.discipline.id, value.title, value.weight, value.maxScore).subscribe({
      next: (evaluation) => {
        this.workspace.update((current) => (current ? { ...current, evaluations: [...current.evaluations, evaluation] } : current));
        this.evaluationForm.reset({ title: '', weight: 1, maxScore: 10 });
        this.classroomFeedback.set('Avaliacao criada.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel criar a avaliacao.'),
    });
  }

  saveGrade() {
    this.gradeForm.markAllAsTouched();
    if (this.gradeForm.invalid) {
      return;
    }
    const value = this.gradeForm.getRawValue();
    this.api.saveGrade(value.evaluationId, value.studentId, value.score).subscribe({
      next: (grade) => {
        this.replaceGrade(grade);
        this.classroomFeedback.set('Notas salvas.');
      },
      error: () => this.classroomFeedback.set('A nota precisa estar dentro da escala configurada.'),
    });
  }

  generateQr(lesson: LessonSummary) {
    this.api.generateAttendanceToken(lesson.id).subscribe({
      next: async (saved) => {
        this.workspace.update((current) => (current ? { ...current, lessons: current.lessons.map((item) => (item.id === saved.id ? saved : item)) } : current));
        this.qrLesson.set(saved);
        this.activeView.set('attendance');
        this.qrDataUrl.set(await QRCode.toDataURL(saved.attendanceToken, { margin: 1, width: 260, color: { dark: '#020202', light: '#ffffff' } }));
        this.classroomFeedback.set('Chamada aberta. O QR Code ja pode ser exibido.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel abrir a chamada. Verifique se ja existe uma chamada aberta.'),
    });
  }

  scanAttendance() {
    this.attendanceForm.markAllAsTouched();
    if (this.attendanceForm.invalid) {
      return;
    }
    this.api.scanAttendance(this.attendanceForm.getRawValue().token).subscribe({
      next: (entry) => {
        this.attendanceMessage.set(this.isPending(entry.status) ? 'Presenca registrada! Aguarde a validacao do professor.' : 'Presenca ja registrada para esta aula.');
        this.attendanceForm.reset();
      },
      error: () => this.attendanceMessage.set('Nao foi possivel validar esse QR Code. Confira se a chamada ainda esta aberta.'),
    });
  }

  async startScanner() {
    if (!this.preview) {
      return;
    }
    const { BrowserQRCodeReader } = await import('@zxing/browser');
    const reader = new BrowserQRCodeReader();
    this.scanning.set(true);
    this.scannerControls = (await reader.decodeFromVideoDevice(undefined, this.preview.nativeElement, (result) => {
      if (result) {
        this.attendanceForm.patchValue({ token: result.getText() });
        this.stopScanner();
        this.scanAttendance();
      }
    })) as ScannerControls;
  }

  stopScanner() {
    this.scannerControls?.stop();
    this.scannerControls = null;
    this.scanning.set(false);
  }

  validateAttendance(attendance: AttendanceEntry, present: boolean) {
    this.api.validateAttendance(attendance.id, present).subscribe({
      next: (saved) => {
        this.replaceAttendance(saved);
        this.classroomFeedback.set(present ? 'Presenca validada.' : 'Presenca invalidada.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel alterar esta presenca.'),
    });
  }

  justifyAttendance(attendance: AttendanceEntry) {
    this.api.justifyAttendance(attendance.id).subscribe({
      next: (saved) => {
        this.replaceAttendance(saved);
        this.classroomFeedback.set('Falta justificada.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel justificar esta presenca.'),
    });
  }

  validateAll(lesson: LessonSummary) {
    this.api.validateAllAttendance(lesson.id).subscribe({
      next: (entries) => {
        for (const entry of entries) {
          this.replaceAttendance(entry);
        }
        this.classroomFeedback.set('Presencas validadas em lote.');
      },
      error: () => this.classroomFeedback.set('Nao foi possivel validar as presencas em lote.'),
    });
  }

  studentName(id: string) {
    return this.workspace()?.students.find((student) => student.id === id)?.name ?? 'Aluno';
  }

  lessonAttendance(lessonId: string) {
    return this.workspace()?.attendance.filter((entry) => entry.lessonId === lessonId) ?? [];
  }

  pendingLessonAttendance(lessonId: string) {
    return this.lessonAttendance(lessonId).filter((entry) => this.isPending(entry.status));
  }

  lessonMaterialCount(lessonId: string) {
    return this.workspace()?.materials.filter((material) => material.lessonId === lessonId).length ?? 0;
  }

  formatDate(value: string) {
    if (!value) {
      return 'Sem data';
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
  }

  attendanceLabel(status: AttendanceEntry['status']) {
    const labels = {
      PENDING: 'Aguardando validação',
      PENDING_VALIDATION: 'Aguardando validação',
      VALIDATED: 'Presente',
      PRESENT: 'Presente',
      REJECTED: 'Invalidada',
      INVALIDATED: 'Invalidada',
      ABSENT: 'Falta',
      JUSTIFIED_ABSENCE: 'Falta justificada',
    };
    return labels[status];
  }

  isPending(status: AttendanceEntry['status']) {
    return status === 'PENDING' || status === 'PENDING_VALIDATION';
  }

  isPresent(status: AttendanceEntry['status']) {
    return status === 'PRESENT' || status === 'VALIDATED';
  }

  isRejected(status: AttendanceEntry['status']) {
    return status === 'REJECTED' || status === 'INVALIDATED' || status === 'ABSENT';
  }

  recordingUrl(recording: RecordedLesson) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(recording.embedUrl);
  }

  studentGrades(studentId: string) {
    return this.workspace()?.grades.filter((grade) => grade.studentId === studentId) ?? [];
  }

  average(studentId: string) {
    const workspace = this.workspace();
    const grades = this.studentGrades(studentId);
    if (!workspace || !grades.length) {
      return 'Sem nota';
    }
    const totalWeight = grades.reduce((sum, grade) => sum + (workspace.evaluations.find((item) => item.id === grade.evaluationId)?.weight ?? 1), 0);
    const total = grades.reduce((sum, grade) => sum + grade.score * (workspace.evaluations.find((item) => item.id === grade.evaluationId)?.weight ?? 1), 0);
    return (total / Math.max(totalWeight, 1)).toFixed(1);
  }

  private loadDashboard() {
    this.api.classroomDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        const first = [...dashboard.enrolledDisciplines, ...dashboard.teachingDisciplines][0];
        if (first) {
          this.selectDiscipline(first);
        }
      },
      error: () => this.dashboard.set({ courses: [], enrolledDisciplines: [], teachingDisciplines: [] }),
    });
  }

  private replaceGrade(grade: GradeEntry) {
    this.workspace.update((current) => {
      if (!current) {
        return current;
      }
      const grades = current.grades.filter((item) => !(item.evaluationId === grade.evaluationId && item.studentId === grade.studentId));
      return { ...current, grades: [...grades, grade] };
    });
  }

  private replaceAttendance(attendance: AttendanceEntry) {
    this.workspace.update((current) => {
      if (!current) {
        return current;
      }
      const entries = current.attendance.filter((item) => item.id !== attendance.id);
      return { ...current, attendance: [...entries, attendance] };
    });
  }
}
