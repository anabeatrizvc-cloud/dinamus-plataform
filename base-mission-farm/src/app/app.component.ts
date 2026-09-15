import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';

import { BaseApiService, MissionBaseCampaign, MissionBasePix, MissionBaseStage } from './base-api.service';
import { ExploreMedia, ProjectPair, contributionValues, exploreItems, projectPairs } from './base-content';

@Component({
  selector: 'base-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(BaseApiService);
  private readonly document = inject(DOCUMENT);
  private contributionObserver?: IntersectionObserver;

  @ViewChild('heroVideo') private readonly heroVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('visionSection') private readonly visionSection?: ElementRef<HTMLElement>;
  @ViewChild('contributionSection') private readonly contributionSection?: ElementRef<HTMLElement>;

  readonly projectPairs = projectPairs;
  readonly exploreItems = exploreItems;
  readonly contributionValues = contributionValues;
  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly loadingCampaign = signal(true);
  readonly campaignError = signal('');
  readonly showContributionActions = signal(false);
  readonly heroPaused = signal(false);
  readonly selectedProject = signal<ProjectPair>(projectPairs[0]);
  readonly comparePosition = signal(52);
  readonly selectedExploreItem = signal<ExploreMedia>(exploreItems[0]);
  readonly pixLoading = signal(false);
  readonly pixError = signal('');
  readonly pixSuccess = signal('');
  readonly pixResult = signal<MissionBasePix | null>(null);
  readonly pixQrCode = signal('');
  readonly selectedValue = signal(100);
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

  readonly currentStage = computed(() => {
    const stages = this.visibleStages();
    return stages.find((stage) => stage.current) ?? stages[0] ?? null;
  });

  readonly campaignPercent = computed(() => Math.max(0, Math.min(100, Number(this.campaign()?.percent ?? 0))));

  ngOnInit(): void {
    this.loadCampaign();
  }

  ngAfterViewInit(): void {
    const win = this.document.defaultView;
    if (!win || !this.visionSection?.nativeElement || !('IntersectionObserver' in win)) {
      return;
    }

    if (win.location.hash && win.location.hash !== '#inicio') {
      this.showContributionActions.set(true);
    }

    this.contributionObserver = new win.IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.showContributionActions.set(true);
          this.contributionObserver?.disconnect();
        }
      },
      { rootMargin: '-18% 0px -45% 0px', threshold: 0.2 },
    );
    this.contributionObserver.observe(this.visionSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.contributionObserver?.disconnect();
  }

  @HostListener('document:keydown.escape')
  clearPixFeedback(): void {
    if (this.pixResult()) {
      this.resetPixFeedback();
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

  toggleHeroVideo(): void {
    const video = this.heroVideo?.nativeElement;
    if (!video) {
      return;
    }

    void video.play();
    this.heroPaused.set(false);
  }

  selectProject(project: ProjectPair): void {
    this.selectedProject.set(project);
    this.comparePosition.set(52);
  }

  moveProject(direction: 1 | -1): void {
    const currentIndex = projectPairs.findIndex((project) => project.id === this.selectedProject().id);
    const nextIndex = (currentIndex + direction + projectPairs.length) % projectPairs.length;
    this.selectProject(projectPairs[nextIndex]);
  }

  setComparePosition(value: string | number): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      this.comparePosition.set(Math.max(8, Math.min(92, parsed)));
    }
  }

  selectExploreItem(item: ExploreMedia): void {
    this.selectedExploreItem.set(item);
  }

  scrollToContribution(): void {
    this.showContributionActions.set(true);
    this.contributionSection?.nativeElement.scrollIntoView({
      behavior: this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  resetPixFeedback(): void {
    this.pixError.set('');
    this.pixSuccess.set('');
    this.pixResult.set(null);
    this.pixQrCode.set('');
  }

  selectValue(value: number): void {
    this.selectedValue.set(value);
    this.customValue.set('');
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
}
