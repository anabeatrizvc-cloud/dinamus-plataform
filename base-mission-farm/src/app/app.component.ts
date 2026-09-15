import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';

import { BaseApiService, MissionBaseCampaign, MissionBasePix, MissionBaseStage } from './base-api.service';
import { ExploreMedia, contributionValues, exploreItems } from './base-content';

type BaseLayer = 'vision' | 'gallery' | 'contribute' | 'progress' | null;
type Scene = {
  index: string;
  label: string;
  title: string;
  action: string;
  layer: Exclude<BaseLayer, null>;
  mediaType: 'image' | 'video';
  media: string;
  poster?: string;
  className: string;
};

@Component({
  selector: 'base-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly api = inject(BaseApiService);
  private readonly document = inject(DOCUMENT);
  private previousBodyOverflow = '';

  readonly scenes: Scene[] = [
    {
      index: '01 / 03',
      label: 'META DE ARRECADAÇÃO · REFORMA',
      title: 'Faça parte dessa história.',
      action: 'Contribuir ↗',
      layer: 'contribute',
      mediaType: 'video',
      media: 'assets/base/videos/drone-current-horizontal.mp4',
      poster: 'assets/base/photos/drone-current-horizontal.jpg',
      className: 'scene-hero',
    },
    {
      index: '02 / 03',
      label: '',
      title: 'Formar.\nServir.\nEnviar.',
      action: 'A visão ↗',
      layer: 'vision',
      mediaType: 'image',
      media: 'assets/base/photos/varanda-interior.jpeg',
      className: 'scene-vision',
    },
    {
      index: '03 / 03',
      label: '',
      title: 'O próximo capítulo começa aqui.',
      action: 'Explore a Base ↗',
      layer: 'gallery',
      mediaType: 'image',
      media: 'assets/base/photos/construcoes-patio.jpeg',
      className: 'scene-explore',
    },
  ];

  readonly galleryItems: ExploreMedia[] = [
    ...exploreItems,
    {
      id: 'drone',
      type: 'video',
      name: 'Vista aérea',
      caption: 'O terreno real visto de cima.',
      src: 'assets/base/videos/drone-current-horizontal.mp4',
      poster: 'assets/base/photos/drone-current-horizontal.jpg',
      alt: 'Vídeo aéreo da Base Mission Farm',
    },
    {
      id: 'project',
      type: 'video',
      name: 'Transformação',
      caption: 'Vídeo da visão de reforma.',
      src: 'assets/base/videos/final-project.mp4',
      poster: 'assets/base/project/after-corridor.jpeg',
      alt: 'Vídeo do projeto final da Base Mission Farm',
    },
  ];

  readonly contributionValues = contributionValues;
  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly loadingCampaign = signal(true);
  readonly campaignError = signal('');
  readonly activeLayer = signal<BaseLayer>(null);
  readonly selectedExploreItem = signal<ExploreMedia>(this.galleryItems[0]);
  readonly pixLoading = signal(false);
  readonly pixError = signal('');
  readonly pixSuccess = signal('');
  readonly pixResult = signal<MissionBasePix | null>(null);
  readonly pixQrCode = signal('');
  readonly selectedValue = signal(0);
  readonly customValue = signal('');
  readonly selectedStageId = signal('');

  readonly visibleStages = computed(() => {
    const stages = this.campaign()?.stages ?? [];
    return stages.filter((stage) => stage.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  });

  readonly selectedStage = computed(() => {
    const stages = this.visibleStages();
    return stages.find((stage) => stage.id === this.selectedStageId()) ?? stages.find((stage) => stage.current) ?? stages[0] ?? null;
  });

  readonly campaignRawPercent = computed(() => {
    const campaign = this.campaign();
    if (!campaign?.totalGoalCents || campaign.totalGoalCents <= 0) {
      return 0;
    }
    return Math.max(0, Math.round((campaign.totalRaisedCents / campaign.totalGoalCents) * 100));
  });

  readonly campaignPercent = computed(() => Math.min(100, this.campaignRawPercent()));
  readonly remainingPercent = computed(() => Math.max(0, 100 - this.campaignPercent()));
  readonly hasGoal = computed(() => Boolean(this.campaign()?.totalGoalCents && Number(this.campaign()?.totalGoalCents) > 0));

  ngOnInit(): void {
    this.loadCampaign();
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.activeLayer()) {
      this.closeLayer();
    }
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

  openLayer(layer: Exclude<BaseLayer, null>): void {
    if (!this.activeLayer()) {
      this.previousBodyOverflow = this.document.body.style.overflow;
    }
    this.activeLayer.set(layer);
    this.document.body.style.overflow = 'hidden';
  }

  closeLayer(): void {
    this.activeLayer.set(null);
    this.document.body.style.overflow = this.previousBodyOverflow;
  }

  selectExploreItem(item: ExploreMedia): void {
    this.selectedExploreItem.set(item);
  }

  moveGallery(direction: 1 | -1): void {
    const currentIndex = this.galleryItems.findIndex((item) => item.id === this.selectedExploreItem().id);
    const nextIndex = (currentIndex + direction + this.galleryItems.length) % this.galleryItems.length;
    this.selectExploreItem(this.galleryItems[nextIndex]);
  }

  galleryPosition(): string {
    const currentIndex = this.galleryItems.findIndex((item) => item.id === this.selectedExploreItem().id);
    return `${currentIndex + 1} / ${this.galleryItems.length}`;
  }

  resetPixFeedback(): void {
    this.pixError.set('');
    this.pixSuccess.set('');
    this.pixResult.set(null);
    this.pixQrCode.set('');
  }

  selectValue(value: number): void {
    this.selectedValue.set(value);
    this.customValue.set(String(value));
    this.resetPixFeedback();
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
        this.pixSuccess.set('Pix gerado com sucesso.');
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

  setSelectedStage(stageId: string): void {
    this.selectedStageId.set(stageId);
    this.resetPixFeedback();
  }

  formatCurrency(cents: number | null | undefined): string {
    const value = Number(cents ?? 0) / 100;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

  updatedAtLabel(): string {
    const value = this.campaign()?.updatedAt;
    if (!value) {
      return '';
    }
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

}
