import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideQrCode } from '@lucide/angular';
import * as QRCode from 'qrcode';

import { DnmsApiService } from '../../../core/api/dnms-api.service';
import { EcoLesson } from '../../../core/models/platform.models';

@Component({
  selector: 'dnms-eco-page',
  imports: [RouterLink, LucideQrCode, LucideArrowRight],
  templateUrl: './eco.page.html',
  styleUrl: './eco.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcoPage implements OnInit {
  private readonly api = inject(DnmsApiService);
  readonly lesson = signal<EcoLesson | null>(null);
  readonly qrCode = signal('');
  readonly attendanceUrl = signal('');
  readonly error = signal('');

  ngOnInit() {
    this.api.getEcoLesson().subscribe({
      next: (lesson) => {
        this.lesson.set(lesson);
        void this.renderQrCode(lesson);
      },
      error: () => this.error.set('Não foi possível carregar a aula do Eco agora.'),
    });
  }

  formattedDate() {
    const value = this.lesson()?.lessonDate ?? '2026-08-25';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private async renderQrCode(lesson: EcoLesson) {
    const origin = globalThis.location?.origin ?? '';
    const url = `${origin}/eco/presenca?data=${encodeURIComponent(lesson.lessonDate)}`;
    this.attendanceUrl.set(url);
    this.qrCode.set(await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: {
        dark: '#050505',
        light: '#ffffff',
      },
    }));
  }
}
