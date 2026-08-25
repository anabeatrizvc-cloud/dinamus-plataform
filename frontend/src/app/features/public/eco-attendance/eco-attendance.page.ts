import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCamera, LucideCheckCircle2, LucideLoaderCircle } from '@lucide/angular';

import { DnmsApiService } from '../../../core/api/dnms-api.service';
import { EcoLesson } from '../../../core/models/platform.models';

@Component({
  selector: 'dnms-eco-attendance-page',
  imports: [ReactiveFormsModule, RouterLink, LucideCamera, LucideCheckCircle2, LucideLoaderCircle],
  templateUrl: './eco-attendance.page.html',
  styleUrl: './eco-attendance.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcoAttendancePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DnmsApiService);
  private readonly route = inject(ActivatedRoute);

  readonly lesson = signal<EcoLesson | null>(null);
  readonly photoPreview = signal('');
  readonly error = signal('');
  readonly success = signal('');
  readonly isSaving = signal(false);
  readonly isProcessingPhoto = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(90)]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+?55\s?)?(\(?[1-9]{2}\)?\s?)9[0-9]{4}-?[0-9]{4}$/)]],
    photoDataUrl: ['', [Validators.required]],
  });

  ngOnInit() {
    this.api.getEcoLesson().subscribe({
      next: (lesson) => {
        const requestedDate = this.route.snapshot.queryParamMap.get('data');
        if (requestedDate && requestedDate !== lesson.lessonDate) {
          this.error.set('Este link não corresponde à aula aberta hoje.');
          return;
        }
        this.lesson.set(lesson);
      },
      error: () => this.error.set('Não foi possível carregar a aula do Eco agora.'),
    });
  }

  formatPhone() {
    const digits = this.form.controls.phone.value.replace(/\D/g, '').replace(/^55(?=\d{11}$)/, '').slice(0, 11);
    let value = digits;
    if (digits.length > 2) {
      value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    this.form.controls.phone.setValue(value, { emitEvent: false });
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.error.set('');
    this.success.set('');

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Envie uma selfie em JPG, PNG ou WebP.');
      input.value = '';
      return;
    }

    this.isProcessingPhoto.set(true);
    try {
      const dataUrl = await this.resizeImage(file);
      this.photoPreview.set(dataUrl);
      this.form.controls.photoDataUrl.setValue(dataUrl);
    } catch {
      this.error.set('Não foi possível processar a selfie. Tente outra foto.');
      input.value = '';
    } finally {
      this.isProcessingPhoto.set(false);
    }
  }

  submit() {
    this.form.markAllAsTouched();
    this.error.set('');
    this.success.set('');
    const lesson = this.lesson();

    if (!lesson) {
      this.error.set('A aula ainda não foi carregada.');
      return;
    }
    if (this.form.invalid) {
      this.error.set('Preencha nome, celular com DDD e envie uma selfie.');
      return;
    }

    this.isSaving.set(true);
    const value = this.form.getRawValue();
    this.api.registerEcoAttendance({ ...value, lessonDate: lesson.lessonDate }).subscribe({
      next: () => {
        this.success.set('Presença enviada. A equipe vai validar sua selfie na área administrativa.');
        this.isSaving.set(false);
        this.form.reset({ name: '', phone: '', photoDataUrl: '' });
        this.photoPreview.set('');
      },
      error: () => {
        this.error.set('Não foi possível enviar sua presença. Confira os dados e tente novamente.');
        this.isSaving.set(false);
      },
    });
  }

  formattedDate() {
    const value = this.lesson()?.lessonDate ?? this.route.snapshot.queryParamMap.get('data') ?? '2026-08-25';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private resizeImage(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read-failed'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('image-failed'));
        image.onload = () => {
          const maxSize = 980;
          const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('canvas-failed'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }
}
