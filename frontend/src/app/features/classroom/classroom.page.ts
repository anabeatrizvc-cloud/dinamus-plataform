import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideBookOpen, LucideCalendarDays, LucideCheck, LucideQrCode, LucideUpload } from '@lucide/angular';
import * as QRCode from 'qrcode';

import { DnmsApiService } from '../../core/api/dnms-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { AttendanceEntry, ClassroomDashboard, DisciplineSummary, DisciplineWorkspace, GradeEntry, LessonSummary } from '../../core/models/platform.models';

type ScannerControls = {
  stop: () => void;
};

@Component({
  selector: 'dnms-classroom-page',
  imports: [ReactiveFormsModule, RouterLink, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideQrCode, LucideUpload],
  templateUrl: './classroom.page.html',
  styleUrl: './classroom.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomPage implements OnInit {
  private readonly api = inject(DnmsApiService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private scannerControls: ScannerControls | null = null;

  @ViewChild('preview') preview?: ElementRef<HTMLVideoElement>;

  readonly dashboard = signal<ClassroomDashboard | null>(null);
  readonly workspace = signal<DisciplineWorkspace | null>(null);
  readonly selectedDisciplineId = signal('');
  readonly qrDataUrl = signal('');
  readonly attendanceMessage = signal('');
  readonly scanning = signal(false);

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
    this.api.disciplineWorkspace(discipline.id).subscribe({
      next: (workspace) => this.workspace.set(workspace),
      error: () => this.workspace.set(null),
    });
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
      },
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
      },
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
      },
    });
  }

  saveGrade() {
    this.gradeForm.markAllAsTouched();
    if (this.gradeForm.invalid) {
      return;
    }
    const value = this.gradeForm.getRawValue();
    this.api.saveGrade(value.evaluationId, value.studentId, value.score).subscribe({
      next: (grade) => this.replaceGrade(grade),
    });
  }

  generateQr(lesson: LessonSummary) {
    this.api.generateAttendanceToken(lesson.id).subscribe({
      next: async (saved) => {
        this.workspace.update((current) => (current ? { ...current, lessons: current.lessons.map((item) => (item.id === saved.id ? saved : item)) } : current));
        this.qrDataUrl.set(await QRCode.toDataURL(saved.attendanceToken, { margin: 1, width: 260, color: { dark: '#020202', light: '#ffffff' } }));
      },
    });
  }

  scanAttendance() {
    this.attendanceForm.markAllAsTouched();
    if (this.attendanceForm.invalid) {
      return;
    }
    this.api.scanAttendance(this.attendanceForm.getRawValue().token).subscribe({
      next: (entry) => {
        this.attendanceMessage.set(entry.status === 'PENDING' ? 'Presença enviada para validação do professor.' : 'Presença registrada.');
        this.attendanceForm.reset();
      },
      error: () => this.attendanceMessage.set('Não foi possível validar esse QR Code.'),
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
      next: (saved) => this.replaceAttendance(saved),
    });
  }

  validateAll(lesson: LessonSummary) {
    this.api.validateAllAttendance(lesson.id).subscribe({
      next: (entries) => {
        for (const entry of entries) {
          this.replaceAttendance(entry);
        }
      },
    });
  }

  studentName(id: string) {
    return this.workspace()?.students.find((student) => student.id === id)?.name ?? 'Aluno';
  }

  lessonAttendance(lessonId: string) {
    return this.workspace()?.attendance.filter((entry) => entry.lessonId === lessonId) ?? [];
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
