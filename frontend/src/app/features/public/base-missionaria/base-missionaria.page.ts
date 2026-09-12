import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideBuilding2,
  LucideCheck,
  LucideCopy,
  LucideHammer,
  LucideKeyRound,
  LucideLoaderCircle,
  LucideMapPinned,
  LucideX,
} from '@lucide/angular';
import * as QRCode from 'qrcode';

import { DnmsApiService } from '../../../core/api/dnms-api.service';
import { MissionBaseCampaign, MissionBasePix, MissionBaseStage } from '../../../core/models/platform.models';
import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-base-missionaria-page',
  imports: [
    FormsModule,
    RouterLink,
    BottomNavComponent,
    LucideMapPinned,
    LucideKeyRound,
    LucideHammer,
    LucideBuilding2,
    LucideCopy,
    LucideCheck,
    LucideX,
    LucideLoaderCircle,
  ],
  templateUrl: './base-missionaria.page.html',
  styleUrl: './base-missionaria.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseMissionariaPage implements OnInit {
  private readonly api = inject(DnmsApiService);

  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly selectedStageId = signal('');
  readonly selectedAmountCents = signal(10000);
  readonly customAmount = signal<string | number | null>('');
  readonly drawerOpen = signal(false);
  readonly isLoading = signal(true);
  readonly isGeneratingPix = signal(false);
  readonly error = signal('');
  readonly pix = signal<MissionBasePix | null>(null);
  readonly qrCode = signal('');
  readonly copied = signal(false);
  readonly amountOptions = [5000, 10000, 25000, 50000, 100000];

  readonly visibleStages = computed(() => this.campaign()?.stages.filter((stage) => stage.visible) ?? []);
  readonly currentStage = computed(() => this.visibleStages().find((stage) => stage.current) ?? this.visibleStages()[0] ?? null);
  readonly selectedStage = computed(
    () => this.visibleStages().find((stage) => stage.id === this.selectedStageId()) ?? this.currentStage(),
  );
  readonly contributionAmountCents = computed(() => {
    const custom = this.parseCurrencyToCents(this.customAmount());
    return custom > 0 ? custom : this.selectedAmountCents();
  });

  ngOnInit() {
    this.loadCampaign();
  }

  loadCampaign() {
    this.isLoading.set(true);
    this.error.set('');
    this.api.getMissionBase().subscribe({
      next: (campaign) => {
        this.campaign.set(campaign);
        this.selectedStageId.set((campaign.stages.find((stage) => stage.current && stage.visible) ?? campaign.stages[0])?.id ?? '');
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a Base Missionária agora. Tente novamente em instantes.');
        this.isLoading.set(false);
      },
    });
  }

  openContribution(stage?: MissionBaseStage) {
    if (stage) {
      this.selectedStageId.set(stage.id);
    }
    this.pix.set(null);
    this.qrCode.set('');
    this.error.set('');
    this.drawerOpen.set(true);
  }

  closeContribution() {
    this.drawerOpen.set(false);
    this.copied.set(false);
  }

  selectStage(stage: MissionBaseStage) {
    this.selectedStageId.set(stage.id);
    this.pix.set(null);
    this.qrCode.set('');
  }

  selectAmount(amountCents: number) {
    this.selectedAmountCents.set(amountCents);
    this.customAmount.set('');
    this.pix.set(null);
    this.qrCode.set('');
  }

  setCustomAmount(value: string | number | null) {
    this.customAmount.set(value);
    this.pix.set(null);
    this.qrCode.set('');
  }

  async generatePix() {
    const stage = this.selectedStage();
    const amountCents = this.contributionAmountCents();
    if (!stage) {
      this.error.set('Escolha uma etapa para contribuir.');
      return;
    }
    if (amountCents <= 0) {
      this.error.set('Informe um valor válido para gerar o Pix.');
      return;
    }

    this.isGeneratingPix.set(true);
    this.error.set('');
    this.api.generateMissionBasePix({ stageId: stage.id, amountCents }).subscribe({
      next: async (pix) => {
        this.pix.set(pix);
        this.qrCode.set(await QRCode.toDataURL(pix.pixPayload, { margin: 1, width: 420, color: { dark: '#070707', light: '#ffffff' } }));
        this.isGeneratingPix.set(false);
      },
      error: () => {
        this.isGeneratingPix.set(false);
        this.error.set('Não foi possível gerar o Pix. Confira o valor e tente novamente.');
      },
    });
  }

  async copyPix() {
    const payload = this.pix()?.pixPayload;
    if (!payload) {
      return;
    }
    await navigator.clipboard.writeText(payload);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  progressWidth(percent: number) {
    return `${Math.max(0, Math.min(100, percent))}%`;
  }

  statusLabel(status: MissionBaseStage['status']) {
    if (status === 'CONCLUIDA') {
      return 'Concluída';
    }
    if (status === 'EM_ANDAMENTO') {
      return 'Em andamento';
    }
    return 'Em breve';
  }

  formatMoney(cents: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  }

  private parseCurrencyToCents(value: string | number | null) {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : 0;
    }

    const normalized = String(value).replace(/[^\d,.]/g, '').replace(',', '.');
    if (!normalized) {
      return 0;
    }
    return Math.round(Number(normalized) * 100);
  }
}
