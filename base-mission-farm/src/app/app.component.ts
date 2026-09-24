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
  private readonly gallery =
    viewChild.required<ElementRef<HTMLElement>>("gallery");
  private galleryTimer?: ReturnType<typeof setInterval>;
  private galleryVisible = false;
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
  private readonly contributionDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>("contributionDialog");
  private drawerScroll = 0;
  private bodyStyles?: { position: string; top: string; width: string };
  private readonly transformationRail =
    viewChild.required<ElementRef<HTMLElement>>("transformationRail");
  private readonly transformationPlayers = viewChildren<StoryVideoComponent>(
    "transformationPlayer",
  );
  private motionQuery?: MediaQueryList;
  private readonly onMotionChange = () => {
    if (this.motionQuery?.matches) {
      this.heroVideo()?.nativeElement.pause();
      this.galleryPlaying.set(false);
    }
  };
  readonly activeSection = signal("base");
  readonly galleryPlaying = signal(false);
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
    ...exploreItems.filter((item) => item.id !== "arrival"),
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
          if (entry.target === this.gallery().nativeElement)
            this.galleryVisible = entry.isIntersecting;
        }
      },
      { rootMargin: "-100px 0px -124px 0px", threshold: 0 },
    );
    if (hero) this.observer.observe(hero);
    if (trigger) this.observer.observe(trigger);
    this.observer.observe(this.gallery().nativeElement);
    this.motionQuery = this.document.defaultView?.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    this.motionQuery?.addEventListener("change", this.onMotionChange);
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (!this.motionQuery?.matches && !saveData) {
      this.galleryPlaying.set(true);
      void this.heroVideo()
        ?.nativeElement.play()
        .catch(() => this.heroPlaying.set(false));
    }
    this.galleryTimer = setInterval(() => {
      if (
        !this.galleryPlaying() ||
        !this.galleryVisible ||
        this.document.hidden
      )
        return;
      const photos = this.galleryItems.filter((item) => item.type === "photo");
      const index = photos.findIndex(
        (item) => item.id === this.selectedExploreItem().id,
      );
      this.selectedExploreItem.set(photos[(index + 1) % photos.length]);
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.contributionExpanded()) this.closeContribution();
    clearInterval(this.galleryTimer);
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
    if (this.campaign()?.active === false || this.contributionExpanded())
      return;
    const viewport = this.document.defaultView;
    if (!viewport) return;
    this.menuOpen.set(false);
    const panorama = this.panorama().nativeElement;
    const offset =
      this.siteHeader().nativeElement.getBoundingClientRect().bottom + 16;
    const bounds = panorama.getBoundingClientRect();
    const targetTop = Math.max(0, viewport.scrollY + bounds.top - offset);
    // Lock the page at the goals, not at the original contribution button.
    viewport.scrollTo({ top: targetTop, behavior: "instant" });
    this.drawerScroll = viewport.scrollY;
    const style = this.document.body.style;
    this.bodyStyles = {
      position: style.position,
      top: style.top,
      width: style.width,
    };
    style.position = "fixed";
    style.top = `-${this.drawerScroll}px`;
    style.width = "100%";
    this.document.querySelectorAll("video").forEach((video) => video.pause());
    this.galleryPlaying.set(false);
    this.contributionExpanded.set(true);
    this.contributionDialog().nativeElement.showModal();
  }

  closeContribution(event?: Event): void {
    event?.preventDefault();
    if (!this.contributionExpanded()) return;
    this.contributionDialog().nativeElement.close();
    this.contributionExpanded.set(false);
    Object.assign(this.document.body.style, this.bodyStyles);
    this.bodyStyles = undefined;
    this.document.defaultView?.scrollTo({
      top: this.drawerScroll,
      behavior: "instant",
    });
    this.panorama().nativeElement.focus({ preventScroll: true });
  }

  backdropClick(event: MouseEvent): void {
    const dialog = this.contributionDialog().nativeElement;
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      this.closeContribution();
  }

  trapContributionFocus(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      this.contributionDialog().nativeElement.querySelectorAll<HTMLElement>(
        "button:not([disabled]), summary, a[href]",
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  shortLabel(value: string | null | undefined): string {
    return (value ?? "").trimEnd().replace(/[.\u2026]+$/u, "");
  }

  selectExploreItem(item: ExploreMedia): void {
    this.galleryPlaying.set(false);
    this.selectedExploreItem.set(item);
  }
  selectSection(id: string): void {
    this.activeSection.set(id);
    this.menuOpen.set(false);
  }
  galleryFocus(event: FocusEvent): void {
    if (!(event.target as HTMLElement).closest(".gallery-toggle"))
      this.galleryPlaying.set(false);
  }
  toggleGallery(): void {
    this.galleryPlaying.update((playing) => !playing);
    if (this.galleryPlaying() && this.selectedExploreItem().type === "video")
      this.selectedExploreItem.set(
        this.galleryItems.find((item) => item.type === "photo")!,
      );
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
    return Math.min(100, this.stageProgress(stage));
  }
  stageProgress(stage: MissionBaseStage): number {
    const goal = Number(stage.goalCents);
    const raised = Number(stage.raisedCents);
    if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(raised))
      return 0;
    const percent = (raised / goal) * 100;
    return Number.isFinite(percent) ? Math.max(0, percent) : 0;
  }
  formatPercent(percent: number): string {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(
      percent,
    );
  }
}
