import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  input,
  signal,
  viewChild,
} from "@angular/core";
import {
  LucideMaximize,
  LucidePause,
  LucidePlay,
  LucideRotateCcw,
  LucideVolume2,
  LucideVolumeX,
} from "@lucide/angular";

@Component({
  selector: "base-story-video",
  imports: [
    LucideMaximize,
    LucidePause,
    LucidePlay,
    LucideRotateCcw,
    LucideVolume2,
    LucideVolumeX,
  ],
  templateUrl: "./story-video.component.html",
  styleUrl: "./story-video.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryVideoComponent implements AfterViewInit, OnDestroy {
  readonly src = input.required<string>();
  readonly poster = input.required<string>();
  readonly title = input.required<string>();
  readonly durationLabel = input("");
  readonly autoplay = input(false);
  readonly started = signal(false);
  readonly playing = signal(false);
  readonly muted = signal(true);
  readonly failed = signal(false);
  readonly elapsed = signal(0);
  readonly duration = signal(0);
  private readonly video =
    viewChild.required<ElementRef<HTMLVideoElement>>("video");
  private readonly player =
    viewChild.required<ElementRef<HTMLElement>>("player");
  private observer?: IntersectionObserver;
  private visible = false;
  private manuallyPaused = false;

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        if (!this.visible) this.video().nativeElement.pause();
        else this.autoplayVisible();
      },
      { threshold: [0, 0.25] },
    );
    this.observer.observe(this.player().nativeElement);
  }

  async toggle() {
    const video = this.video().nativeElement;
    if (!video.paused) {
      this.manuallyPaused = true;
      video.pause();
      return;
    }
    this.manuallyPaused = false;
    await this.play();
  }

  private autoplayVisible() {
    if (
      this.autoplay() &&
      this.visible &&
      !this.manuallyPaused &&
      !this.video().nativeElement.ownerDocument.hidden
    )
      void this.play();
  }

  async play() {
    const video = this.video().nativeElement;
    if (!this.started() || this.failed()) {
      video.src = this.src();
      video.load();
    }
    this.started.set(true);
    this.failed.set(false);
    try {
      await video.play();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        this.failed.set(true);
    }
  }

  onPlay() {
    this.playing.set(true);
    const current = this.video().nativeElement;
    if (this.autoplay() && current.muted) return;
    current.ownerDocument.querySelectorAll("video").forEach((video) => {
      if (video !== current) video.pause();
    });
  }

  updateTime() {
    const video = this.video().nativeElement;
    this.elapsed.set(video.currentTime);
    this.duration.set(Number.isFinite(video.duration) ? video.duration : 0);
  }

  seek(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    if (this.duration()) this.video().nativeElement.currentTime = value;
  }

  toggleSound() {
    this.muted.update((value) => !value);
  }

  async fullscreen() {
    const player = this.player().nativeElement;
    if (player.requestFullscreen)
      await player.requestFullscreen().catch(() => {});
  }

  canFullscreen() {
    return Boolean(this.player()?.nativeElement.requestFullscreen);
  }
  time(value: number) {
    return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
  }

  @HostListener("document:visibilitychange")
  visibilityChanged() {
    if (this.video().nativeElement.ownerDocument.hidden)
      this.video().nativeElement.pause();
    else this.autoplayVisible();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.video().nativeElement.pause();
  }
}
