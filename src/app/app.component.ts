import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  width: number = 67;
  height: number = 50;
  fps: number = 30;
  frames: number[][] = [];
  diameter: number = 30;
  currentFrame: number = 0;

  grid: number[][] = [];
  private startTime: number = 0;
  private animationId: number | null = null;
  private audio!: HTMLAudioElement;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.animate = this.animate.bind(this);
  }

  ngOnInit() {
    console.log('ngOnInit called');
    this.getJson();
    this.initAudio();
  }

  initAudio() {
    this.audio = new Audio('music.mp3');
    this.audio.load();
  }

  async playAudio(): Promise<void> {
    if (this.audio) {
      try {
        await this.audio.play();
        this.startTime = performance.now();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  }

  initializeGrid() {
    console.log('Initializing grid');
    this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(0));
  }

  updateGrid() {
    const encodedFrame = this.frames[this.currentFrame];
    let rleIndex = 0;
    let gridIndex = 0;

    while (rleIndex < encodedFrame.length) {
      const value = encodedFrame[rleIndex];
      const count = encodedFrame[rleIndex + 1];
      rleIndex += 2;

      for (let k = 0; k < count; k++) {
        const row = Math.floor(gridIndex / this.width);
        const col = gridIndex % this.width;
        this.grid[row][col] = value;
        gridIndex++;
      }
    }
  }

  animate(currentTime: number) {
    if (!this.startTime) {
      this.startTime = currentTime;
    }

    const elapsedTime = currentTime - this.startTime;
    const theoreticalFrame = Math.floor((elapsedTime / 1000) * this.fps);

    // diameter of the circle must be equal to either width or height of screen divided by either width or height of grid, whichever is smaller
    this.diameter = Math.min(window.innerWidth / this.width, window.innerHeight / this.height);

    //console.log('Current frame:', this.currentFrame, 'Theoretical frame:', theoreticalFrame);

    if (theoreticalFrame > this.currentFrame) {
      const framesToSkip = theoreticalFrame - this.currentFrame
      console.log(`Skipping ${framesToSkip} frames`);
      this.currentFrame += framesToSkip;
    } else if (theoreticalFrame < this.currentFrame) {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }

    this.updateGrid();
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });

    this.animationId = requestAnimationFrame(this.animate);
  }

  async startAnimation() {
    await this.playAudio();
    this.animationId = requestAnimationFrame(this.animate);
  }

  getJson() {
    console.log('Fetching JSON');
    this.http.get('frames.json').subscribe(
      (data: any) => {
        console.log('JSON received, frames count:', data.length);
        this.frames = data;
      },
      (error) => {
        console.error('Error fetching JSON:', error);
      }
    );
  }

  ngOnDestroy() {
    if (this.animationId !== null) {
      console.log('Cancelling animation');
      cancelAnimationFrame(this.animationId);
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  start() {
    this.initializeGrid();
    this.ngZone.runOutsideAngular(() => {
      console.log('Starting animation');
      this.startAnimation();
    });
  }
}
