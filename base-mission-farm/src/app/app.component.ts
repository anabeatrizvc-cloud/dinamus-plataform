import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArrowDown,
  LucideArrowUpRight,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCopy,
  LucideGlobe,
  LucideMenu,
  LucidePause,
  LucidePlay,
  LucideSprout,
  LucideUsersRound,
  LucideX,
  LucideBookOpen,
} from '@lucide/angular';
import QRCode from 'qrcode';

import {
  BaseApiService,
  MissionBaseCampaign,
  MissionBasePix,
  MissionBaseStage,
} from './base-api.service';
import { ExploreMedia, contributionValues, exploreItems, projectPairs } from './base-content';

@Component({
  selector: 'base-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideArrowDown,
    LucideArrowUpRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCopy,
    LucideGlobe,
    LucideMenu,
    LucidePause,
    LucidePlay,
    LucideSprout,
    LucideUsersRound,
    LucideX,
    LucideBookOpen,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(BaseApiService);
  private readonly document = inject(DOCUMENT);
  private observer?: IntersectionObserver;
  private readonly hero = viewChild<ElementRef<HTMLElement>>('hero');
  private readonly contributionTrigger = viewChild<ElementRef<HTMLElement>>('contributionTrigger');
  private readonly heroVideo = viewChild<ElementRef<HTMLVideoElement>>('heroVideo');
  private readonly transformationVideo =
    viewChild<ElementRef<HTMLVideoElement>>('transformationVideo');
  readonly menuOpen = signal(false);
  readonly contributionRevealed = signal(false);
  readonly heroPlaying = signal(false);
  readonly transformationPlaying = signal(false);
  readonly transformationStarted = signal(false);
  readonly projectPairs = projectPairs;

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
  ];

  readonly contributionValues = contributionValues;
  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly loadingCampaign = signal(true);
  readonly campaignError = signal('');
  readonly selectedExploreItem = signal<ExploreMedia>(this.galleryItems[1]);
  readonly pixLoading = signal(false);
  readonly pixError = signal('');
  readonly pixSuccess = signal('');
  readonly pixResult = signal<MissionBasePix | null>(null);
  readonly pixQrCode = signal('');
  readonly customValue = signal('');
  readonly selectedStageId = signal('');

  readonly visibleStages = computed(() => {
    const stages = this.campaign()?.stages ?? [];
    return stages.filter((stage) => stage.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  });

  readonly selectedStage = computed<MissionBaseStage | null>(() => {
    const stages = this.visibleStages();
    return (
      stages.find((stage) => stage.id === this.selectedStageId()) ??
      stages.find((stage) => stage.current) ??
      stages[0] ??
      null
    );
  });

  ngOnInit(): void {
    this.loadCampaign();
  }

  ngAfterViewInit(): void {
    const hero = this.hero()?.nativeElement;
    const trigger = this.contributionTrigger()?.nativeElement;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero) {
            const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            if (past) this.heroVideo()?.nativeElement.pause();
          }
          if (entry.target === trigger) {
            this.contributionRevealed.set(entry.isIntersecting);
          }
        }
      },
      { rootMargin: '-100px 0px -124px 0px', threshold: 0 },
    );
    if (hero) this.observer.observe(hero);
    if (trigger) this.observer.observe(trigger);
    if (!this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void this.heroVideo()
        ?.nativeElement.play()
        .catch(() => this.heroPlaying.set(false));
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.menuOpen.set(false);
  }

  loadCampaign(): void {
    this.loadingCampaign.set(true);
    this.campaignError.set('');

    this.api.getCampaign().subscribe({
      next: (campaign) => {
        this.campaign.set(campaign);
        const selected =
          campaign.stages.find((stage) => stage.current && stage.visible) ??
          campaign.stages.find((stage) => stage.visible);
        this.selectedStageId.set(selected?.id ?? '');
        this.loadingCampaign.set(false);
      },
      error: () => {
        this.campaignError.set('Não foi possível carregar as etapas agora.');
        this.loadingCampaign.set(false);
      },
    });
  }

  async toggleHero(): Promise<void> {
    const video = this.heroVideo()?.nativeElement;
    if (!video) return;
    if (!video.paused) video.pause();
    else await video.play().catch(() => this.heroPlaying.set(false));
  }

  async toggleTransformation(): Promise<void> {
    const video = this.transformationVideo()?.nativeElement;
    if (!video) return;
    if (!video.paused) video.pause();
    else {
      this.transformationStarted.set(true);
      if (this.document.defaultView?.matchMedia('(max-width: 760px)').matches) {
        video.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
      await video.play().catch(() => this.transformationPlaying.set(false));
    }
  }

  selectExploreItem(item: ExploreMedia): void {
    this.selectedExploreItem.set(item);
  }

  moveGallery(direction: 1 | -1): void {
    const currentIndex = this.galleryItems.findIndex(
      (item) => item.id === this.selectedExploreItem().id,
    );
    const nextIndex =
      (currentIndex + direction + this.galleryItems.length) % this.galleryItems.length;
    this.selectExploreItem(this.galleryItems[nextIndex]);
  }

  galleryPosition(): string {
    const currentIndex = this.galleryItems.findIndex(
      (item) => item.id === this.selectedExploreItem().id,
    );
    return `${currentIndex + 1} / ${this.galleryItems.length}`;
  }

  resetPixFeedback(): void {
    this.pixError.set('');
    this.pixSuccess.set('');
    this.pixResult.set(null);
    this.pixQrCode.set('');
  }

  selectValue(value: number): void {
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
        try {
          const qrCode = await QRCode.toDataURL(result.pixPayload, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 320,
            color: {
              dark: '#10261d',
              light: '#f8f5ef',
            },
          });
          this.pixResult.set(result);
          this.pixQrCode.set(qrCode);
          this.pixSuccess.set('Pix gerado com sucesso.');
        } catch {
          this.pixError.set('Não foi possível exibir o QR Code. Tente novamente.');
        } finally {
          this.pixLoading.set(false);
        }
      },
      error: () => {
        this.pixError.set(
          'Não foi possível gerar o Pix agora. Confira a configuração da chave Pix.',
        );
        this.pixLoading.set(false);
      },
    });
  }

  async copyPix(): Promise<void> {
    const payload = this.pixResult()?.pixPayload;
    if (!payload) {
      return;
    }
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard unavailable');
      await clipboard.writeText(payload);
      this.pixSuccess.set('Código Pix copiado.');
    } catch {
      this.pixError.set('Não foi possível copiar. Selecione o código Pix abaixo.');
    }
  }

  currentAmountCents(): number {
    const custom = this.customValue().trim();
    if (custom) {
      const normalized = custom
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
    }
    return 0;
  }

  setSelectedStage(stageId: string): void {
    this.selectedStageId.set(stageId);
    this.resetPixFeedback();
  }

  formatCurrency(cents: number | null | undefined): string {
    const value = Number(cents ?? 0) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
