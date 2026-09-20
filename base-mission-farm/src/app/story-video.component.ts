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

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) this.video().nativeElement.pause();
    });
    this.observer.observe(this.player().nativeElement);
  }

  async toggle() {
    const video = this.video().nativeElement;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (!this.started() || this.failed()) {
      video.src = this.src();
      video.load();
    }
    this.started.set(true);
    this.failed.set(false);
    try {
      await video.play();
    } catch {
      this.failed.set(true);
    }
  }

  onPlay() {
    this.playing.set(true);
    const current = this.video().nativeElement;
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
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.video().nativeElement.pause();
  }
}
