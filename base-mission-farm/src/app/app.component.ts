import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';

import { BaseApiService, MissionBaseCampaign, MissionBasePix, MissionBaseStage } from './base-api.service';
import { EnvironmentMedia, contributionValues, environments } from './base-content';

@Component({
  selector: 'base-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly api = inject(BaseApiService);
  private readonly document = inject(DOCUMENT);

  @ViewChild('heroDesktop') private readonly heroDesktop?: ElementRef<HTMLVideoElement>;
  @ViewChild('heroMobile') private readonly heroMobile?: ElementRef<HTMLVideoElement>;

  readonly environments = environments;
  readonly contributionValues = contributionValues;
  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly loadingCampaign = signal(true);
  readonly campaignError = signal('');
  readonly selectedEnvironment = signal<EnvironmentMedia>(environments[0]);
  readonly dreamMode = signal(false);
  readonly heroPaused = signal(false);
  readonly pixOpen = signal(false);
  readonly pixLoading = signal(false);
  readonly pixError = signal('');
  readonly pixSuccess = signal('');
  readonly pixResult = signal<MissionBasePix | null>(null);
  readonly pixQrCode = signal('');
  readonly selectedValue = signal(100);
  readonly customValue = signal('');
  readonly selectedStageId = signal('');
  readonly actionNotice = signal('');
  readonly prefersReducedMotion = signal(false);

  readonly visibleStages = computed(() => {
    const stages = this.campaign()?.stages ?? [];
    return stages.filter((stage) => stage.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  });

  readonly selectedStage = computed(() => {
    const stages = this.visibleStages();
    return stages.find((stage) => stage.id === this.selectedStageId()) ?? stages.find((stage) => stage.current) ?? stages[0] ?? null;
  });

  ngOnInit(): void {
    const reducedMotion = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
    this.prefersReducedMotion.set(reducedMotion);
    this.loadCampaign();
  }

  loadCampaign(): void {
    this.loadingCampaign.set(true);
    this.campaignError.set('');

    this.api.getCampaign().subscribe({
      next: (campaign) => {
        this.campaign.set(campaign);
        const selected = campaign.stages.find((stage) => stage.current && stage.visible) ?? campaign.stages.find((stage) => stage.visible);
        this.selectedStageId.set(selected?.id ?? '');
        this.loadingCampaign.set(false);
      },
      error: () => {
        this.campaignError.set('Não foi possível carregar as etapas agora.');
        this.loadingCampaign.set(false);
      },
    });
  }

  selectEnvironment(environment: EnvironmentMedia): void {
    this.selectedEnvironment.set(environment);
    this.dreamMode.set(false);
  }

  moveGallery(direction: 1 | -1): void {
    const currentIndex = environments.findIndex((item) => item.id === this.selectedEnvironment().id);
    const nextIndex = (currentIndex + direction + environments.length) % environments.length;
    this.selectEnvironment(environments[nextIndex]);
  }

  toggleHeroVideo(): void {
    const next = !this.heroPaused();
    this.heroPaused.set(next);
    for (const video of [this.heroDesktop?.nativeElement, this.heroMobile?.nativeElement]) {
      if (!video) {
        continue;
      }
      if (next) {
        video.pause();
      } else {
        void video.play();
      }
    }
  }

  openPix(stage?: MissionBaseStage): void {
    this.pixOpen.set(true);
    this.pixError.set('');
    this.pixSuccess.set('');
    this.pixResult.set(null);
    this.pixQrCode.set('');
    if (stage) {
      this.selectedStageId.set(stage.id);
    }
  }

  closePix(): void {
    this.pixOpen.set(false);
  }

  selectValue(value: number): void {
    this.selectedValue.set(value);
    this.customValue.set('');
  }

  async generatePix(): Promise<void> {
    const stage = this.selectedStage();
    const amountCents = this.currentAmountCents();
    if (!stage) {
      this.pixError.set('Escolha uma etapa para continuar.');
      return;
    }
    if (amountCents < 100) {
      this.pixError.set('Informe um valor a partir de R$ 1,00.');
      return;
    }

    this.pixLoading.set(true);
    this.pixError.set('');
    this.pixSuccess.set('');
    this.pixResult.set(null);
    this.pixQrCode.set('');

    this.api.generatePix(stage.id, amountCents).subscribe({
      next: async (result) => {
        this.pixResult.set(result);
        this.pixQrCode.set(
          await QRCode.toDataURL(result.pixPayload, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 320,
            color: {
              dark: '#10261d',
              light: '#f8f5ef',
            },
          }),
        );
        this.pixSuccess.set('Pix gerado. A confirmação da oferta continua sendo manual pela administração.');
        this.pixLoading.set(false);
      },
      error: () => {
        this.pixError.set('Não foi possível gerar o Pix agora. Confira a configuração da chave Pix.');
        this.pixLoading.set(false);
      },
    });
  }

  async copyPix(): Promise<void> {
    const payload = this.pixResult()?.pixPayload;
    if (!payload) {
      return;
    }
    await this.document.defaultView?.navigator.clipboard.writeText(payload);
    this.pixSuccess.set('Código Pix copiado.');
  }

  currentAmountCents(): number {
    const custom = this.customValue().trim();
    if (custom) {
      const normalized = custom.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    }
    return this.selectedValue() * 100;
  }

  formatCurrency(cents: number | null | undefined): string {
    const value = Number(cents ?? 0) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Atualização em preparação';
    }
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
  }

  stagePercent(stage: MissionBaseStage): number {
    if (!stage.goalCents || stage.goalCents <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Number(stage.percent) || 0));
  }

  stageMeta(stage: MissionBaseStage): string {
    if (!stage.goalCents || stage.goalCents <= 0) {
      return 'Meta em definição';
    }
    return `${this.formatCurrency(stage.raisedCents)} de ${this.formatCurrency(stage.goalCents)}`;
  }

  statusLabel(status: MissionBaseStage['status']): string {
    switch (status) {
      case 'CONCLUIDA':
        return 'Concluída';
      case 'EM_ANDAMENTO':
        return 'Em andamento';
      case 'EM_BREVE':
        return 'Em breve';
    }
  }

  showActionNotice(kind: 'serve' | 'pray'): void {
    this.actionNotice.set(
      kind === 'serve'
        ? 'O fluxo para voluntariado será configurado em breve. Por enquanto, fale com a liderança para servir na Base.'
        : 'Obrigado por se posicionar em oração. A lista de intercessão será configurada em breve.',
    );
  }
}
