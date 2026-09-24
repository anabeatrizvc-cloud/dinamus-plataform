import { CommonModule, DOCUMENT } from "@angular/common";
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
  viewChildren,
} from "@angular/core";
import {
  LucideArrowDown,
  LucideArrowUpRight,
  LucideArrowRight,
  LucideChevronLeft,
  LucideChevronRight,
  LucideHammer,
  LucideMenu,
  LucidePause,
  LucidePlay,
  LucideSprout,
  LucideX,
} from "@lucide/angular";
import {
  BaseApiService,
  MissionBaseCampaign,
  MissionBaseStage,
} from "./base-api.service";
import {
  ExploreMedia,
  contributionCheckout,
  supporterCheckouts,
  transformationVideos,
  exploreItems,
  projectPairs,
} from "./base-content";
import { StoryVideoComponent } from "./story-video.component";

@Component({
  selector: "base-root",
  standalone: true,
  imports: [
    CommonModule,
    StoryVideoComponent,
    LucideArrowDown,
    LucideArrowUpRight,
    LucideArrowRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucideHammer,
    LucideMenu,
    LucidePause,
    LucidePlay,
    LucideSprout,
    LucideX,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(BaseApiService);
  private readonly document = inject(DOCUMENT);
  private observer?: IntersectionObserver;
  private readonly hero = viewChild<ElementRef<HTMLElement>>("hero");
  private readonly contributionTrigger = viewChild<ElementRef<HTMLElement>>(
    "contributionTrigger",
  );
  private readonly heroVideo =
    viewChild<ElementRef<HTMLVideoElement>>("heroVideo");
  private readonly siteHeader =
    viewChild.required<ElementRef<HTMLElement>>("siteHeader");
  private readonly panorama =
    viewChild.required<ElementRef<HTMLElement>>("panorama");
  private readonly donationOptions =
    viewChild.required<ElementRef<HTMLDetailsElement>>("donationOptions");
  private readonly transformationRail =
    viewChild.required<ElementRef<HTMLElement>>("transformationRail");
  private readonly transformationPlayers = viewChildren<StoryVideoComponent>(
    "transformationPlayer",
  );
  private motionQuery?: MediaQueryList;
  private readonly onMotionChange = () => {
    if (this.motionQuery?.matches) this.heroVideo()?.nativeElement.pause();
  };
  readonly menuOpen = signal(false);
  readonly contributionRevealed = signal(false);
  readonly heroPlaying = signal(false);
  readonly heroFrameReady = signal(false);
  readonly heroPreload =
    this.document.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
      .matches ||
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData
      ? "none"
      : "auto";
  readonly contributionExpanded = signal(false);
  readonly transformationIndex = signal(0);
  readonly transformations = transformationVideos;
  readonly projectPairs = projectPairs;
  readonly offerCheckout = contributionCheckout;
  readonly supporterCheckouts = supporterCheckouts;
  readonly galleryItems: ExploreMedia[] = [
    ...exploreItems,
    {
      id: "drone",
      type: "video",
      name: "Vista aérea",
      caption: "O terreno real visto de cima.",
      src: "assets/base/videos/drone-current-horizontal.mp4",
      poster: "assets/base/photos/drone-current-horizontal.jpg",
      alt: "Vídeo aéreo da Base Mission Farm",
    },
  ];
  readonly campaign = signal<MissionBaseCampaign | null>(null);
  readonly loadingCampaign = signal(true);
  readonly campaignError = signal("");
  readonly selectedExploreItem = signal<ExploreMedia>(this.galleryItems[1]);
  readonly visibleStages = computed(() =>
    (this.campaign()?.stages ?? [])
      .filter((stage) => stage.visible)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );

  ngOnInit(): void {
    this.loadCampaign();
  }

  ngAfterViewInit(): void {
    this.syncHeroHeight();
    this.document.defaultView?.addEventListener("resize", this.syncHeroHeight);
    this.document.defaultView?.visualViewport?.addEventListener(
      "resize",
      this.syncHeroHeight,
    );
    const hero = this.hero()?.nativeElement;
    const trigger = this.contributionTrigger()?.nativeElement;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero && !entry.isIntersecting)
            this.heroVideo()?.nativeElement.pause();
          if (entry.target === trigger)
            this.contributionRevealed.set(entry.isIntersecting);
        }
      },
      { rootMargin: "-100px 0px -124px 0px", threshold: 0 },
    );
    if (hero) this.observer.observe(hero);
    if (trigger) this.observer.observe(trigger);
    this.motionQuery = this.document.defaultView?.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    this.motionQuery?.addEventListener("change", this.onMotionChange);
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (!this.motionQuery?.matches && !saveData) {
      void this.heroVideo()
        ?.nativeElement.play()
        .catch(() => this.heroPlaying.set(false));
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.motionQuery?.removeEventListener("change", this.onMotionChange);
    this.document.defaultView?.removeEventListener(
      "resize",
      this.syncHeroHeight,
    );
    this.document.defaultView?.visualViewport?.removeEventListener(
      "resize",
      this.syncHeroHeight,
    );
  }

  private readonly syncHeroHeight = (): void => {
    const viewport = this.document.defaultView;
    if (
      !viewport ||
      viewport.CSS.supports("height", "100dvh") ||
      (viewport.visualViewport && viewport.visualViewport.scale !== 1)
    )
      return;
    this.hero()?.nativeElement.style.setProperty(
      "--hero-height",
      `${Math.ceil(viewport.innerHeight)}px`,
    );
  };

  @HostListener("document:keydown.escape")
  closeOnEscape(): void {
    this.menuOpen.set(false);
  }

  @HostListener("document:visibilitychange")
  visibilityChanged(): void {
    if (this.document.hidden)
      this.document.querySelectorAll("video").forEach((video) => video.pause());
  }

  loadCampaign(): void {
    this.loadingCampaign.set(true);
    this.campaignError.set("");
    this.api.getCampaign().subscribe({
      next: (campaign) => {
        this.campaign.set(campaign);
        this.loadingCampaign.set(false);
      },
      error: () => {
        this.campaignError.set("Não foi possível carregar as metas agora");
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

  async playTransformation(): Promise<void> {
    this.moveTransformation(0, true);
    this.transformationRail().nativeElement.scrollIntoView({
      block: "center",
      behavior: "instant",
    });
    await this.transformationPlayers()[0]?.toggle();
  }

  moveTransformation(delta: number, first = false): void {
    const index = first
      ? 0
      : Math.max(
          0,
          Math.min(
            this.transformations.length - 1,
            this.transformationIndex() + delta,
          ),
        );
    const rail = this.transformationRail().nativeElement;
    const item = rail.children.item(index) as HTMLElement;
    rail.scrollTo({
      left: item.offsetLeft - rail.offsetLeft,
      behavior: this.motionQuery?.matches ? "instant" : "smooth",
    });
  }

  transformationScrolled(): void {
    const rail = this.transformationRail().nativeElement;
    const items = Array.from(rail.children) as HTMLElement[];
    this.transformationIndex.set(
      items.reduce(
        (closest, item, index) =>
          Math.abs(item.offsetLeft - rail.offsetLeft - rail.scrollLeft) <
          Math.abs(
            items[closest].offsetLeft - rail.offsetLeft - rail.scrollLeft,
          )
            ? index
            : closest,
        0,
      ),
    );
  }

  transformationKey(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).tagName === "INPUT") return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      this.moveTransformation(event.key === "ArrowRight" ? 1 : -1);
    }
  }

  openContribution(): void {
    if (this.campaign()?.active === false) return;
    const viewport = this.document.defaultView;
    if (!viewport) return;
    this.menuOpen.set(false);
    const panorama = this.panorama().nativeElement;
    const options = this.donationOptions().nativeElement;
    const offset =
      this.siteHeader().nativeElement.getBoundingClientRect().bottom + 16;
    const bounds = panorama.getBoundingClientRect();
    // Capture the destination before expansion changes Safari's scroll anchoring.
    const targetTop = Math.max(0, viewport.scrollY + bounds.top - offset);
    const alreadyHere =
      bounds.top < viewport.innerHeight - 120 && bounds.bottom > offset;

    // Open synchronously so the first checkout is focusable without interrupting the scroll.
    options.open = true;
    this.contributionExpanded.set(true);
    if (!alreadyHere) {
      viewport.scrollTo({
        top: targetTop,
        behavior: this.motionQuery?.matches ? "instant" : "smooth",
      });
    }
    options
      .querySelector<HTMLElement>("a[href]")
      ?.focus({ preventScroll: true });
  }

  shortLabel(value: string | null | undefined): string {
    return (value ?? "").trimEnd().replace(/[.\u2026]+$/u, "");
  }

  selectExploreItem(item: ExploreMedia): void {
    this.selectedExploreItem.set(item);
  }
  moveGallery(direction: 1 | -1): void {
    const current = this.galleryItems.findIndex(
      (item) => item.id === this.selectedExploreItem().id,
    );
    this.selectExploreItem(
      this.galleryItems[
        (current + direction + this.galleryItems.length) %
          this.galleryItems.length
      ],
    );
  }
  galleryPosition(): string {
    return `${this.galleryItems.findIndex((item) => item.id === this.selectedExploreItem().id) + 1} / ${this.galleryItems.length}`;
  }
  formatCurrency(cents: number | null | undefined): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(cents ?? 0) / 100);
  }
  stagePercent(stage: MissionBaseStage): number {
    return Math.max(0, Math.min(100, Number(stage.percent) || 0));
  }
  formatPercent(percent: number): string {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
      percent,
    );
  }
  updatedAtLabel(value: string | null | undefined): string {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Recife",
    }).format(new Date(value));
  }
}
