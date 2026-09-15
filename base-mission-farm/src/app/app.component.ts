import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';

import { BaseApiService, MissionBaseCampaign, MissionBasePix, MissionBaseStage } from './base-api.service';
import { EnvironmentMedia, GalleryMedia, contributionValues, environments, galleryItems } from './base-content';

type Layer = 'vision' | 'gallery' | 'contribute' | 'progress';
type GalleryTab = 'photo' | 'video';

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
  @ViewChild('layerClose') private readonly layerClose?: ElementRef<HTMLButtonElement>;

  readonly environments = environments;
  readonly galleryItems = galleryItems;
  readonly contributionValues = contributionValues;
  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly loadingCampaign = signal(true);
  readonly campaignError = signal('');
  readonly selectedEnvironment = signal<EnvironmentMedia>(environments[1]);
  readonly selectedGalleryItem = signal<GalleryMedia>(galleryItems[0]);
  readonly galleryTab = signal<GalleryTab>('photo');
  readonly heroPaused = signal(false);
  readonly activeLayer = signal<Layer | null>(null);
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
  private layerTrigger: HTMLElement | null = null;

  readonly visibleStages = computed(() => {
    const stages = this.campaign()?.stages ?? [];
    return stages.filter((stage) => stage.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  });

  readonly selectedStage = computed(() => {
    const stages = this.visibleStages();
    return stages.find((stage) => stage.id === this.selectedStageId()) ?? stages.find((stage) => stage.current) ?? stages[0] ?? null;
  });

  readonly heroStage = computed(() => {
    const stages = this.visibleStages();
    return stages.find((stage) => stage.current) ?? stages.find((stage) => stage.name.toLowerCase().includes('reforma')) ?? stages[0] ?? null;
  });

  readonly galleryByTab = computed(() => this.galleryItems.filter((item) => item.type === this.galleryTab()));

  readonly raisedPercentRaw = computed(() => {
    const stage = this.heroStage();
    if (!stage?.goalCents || stage.goalCents <= 0) {
      return null;
    }
    return (Number(stage.raisedCents || 0) / stage.goalCents) * 100;
  });

  readonly progressWidth = computed(() => {
    const percent = this.raisedPercentRaw();
    return percent === null ? 0 : Math.max(0, Math.min(100, percent));
  });

  readonly remainingPercent = computed(() => {
    const percent = this.raisedPercentRaw();
    return percent === null ? null : Math.max(0, Math.ceil(100 - percent));
  });

  ngOnInit(): void {
    const reducedMotion = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? false;
    this.prefersReducedMotion.set(reducedMotion);
    this.loadCampaign();
  }

  @HostListener('document:keydown.escape')
  closeLayerByEscape(): void {
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

  selectEnvironment(environment: EnvironmentMedia): void {
    this.selectedEnvironment.set(environment);
  }

  moveGallery(direction: 1 | -1): void {
    const items = this.galleryByTab();
    if (!items.length) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.id === this.selectedGalleryItem().id);
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    this.selectedGalleryItem.set(items[nextIndex]);
  }

  moveEnvironment(direction: 1 | -1): void {
    const scenic = environments.filter((item) => item.id !== 'caminho');
    const currentIndex = scenic.findIndex((item) => item.id === this.selectedEnvironment().id);
    const nextIndex = (currentIndex + direction + scenic.length) % scenic.length;
    this.selectEnvironment(scenic[nextIndex]);
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

  openLayer(layer: Layer, event?: Event): void {
    this.layerTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.activeLayer.set(layer);
    if (layer === 'contribute') {
      this.resetPixFeedback();
    }
    window.setTimeout(() => this.layerClose?.nativeElement.focus(), 0);
  }

  closeLayer(): void {
    this.activeLayer.set(null);
    this.layerTrigger?.focus();
    this.layerTrigger = null;
  }

  resetPixFeedback(): void {
    this.pixError.set('');
    this.pixSuccess.set('');
    this.pixResult.set(null);
    this.pixQrCode.set('');
  }

  openPix(stage?: MissionBaseStage, event?: Event): void {
    this.openLayer('contribute', event);
    if (stage) {
      this.selectedStageId.set(stage.id);
    }
  }

  contributeToHero(event?: Event): void {
    this.openPix(this.heroStage() ?? undefined, event);
  }

  closePix(): void {
    this.closeLayer();
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
        this.pixSuccess.set('Pix gerado com sucesso.');
        this.pixLoading.set(false);
      },
      error: () => {
        this.pixError.set('Não foi possível gerar o Pix agora. Confira a configuração da chave Pix.');
        this.pixLoading.set(false);
      },
    });
  }

  setGalleryTab(tab: GalleryTab): void {
    this.galleryTab.set(tab);
    const first = this.galleryByTab()[0];
    if (first) {
      this.selectedGalleryItem.set(first);
    }
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

  heroMetaText(): string {
    const stage = this.heroStage();
    if (!stage?.goalCents || stage.goalCents <= 0) {
      return 'Meta em definição';
    }
    const remaining = this.remainingPercent();
    if (remaining === 0) {
      return 'Meta alcançada';
    }
    return `Faltam ${remaining}% para alcançar a meta`;
  }

  heroStageName(): string {
    return this.heroStage()?.name ?? 'Reforma';
  }

  layerTitle(): string {
    switch (this.activeLayer()) {
      case 'vision':
        return 'A visão';
      case 'gallery':
        return 'Fotos e vídeos';
      case 'contribute':
        return 'Contribuir';
      case 'progress':
        return 'Acompanhar';
      default:
        return '';
    }
  }

  currentGalleryIndex(): number {
    const items = this.galleryByTab();
    return Math.max(0, items.findIndex((item) => item.id === this.selectedGalleryItem().id)) + 1;
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
