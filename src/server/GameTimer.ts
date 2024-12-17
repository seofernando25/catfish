export class GameTimer {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private startTime: number | null = null;
    public elapsed = 0;
    public delta = 0;
    private _tick = 0;

    constructor(
        private ticksPerSecond: number,
        private tickCallback: () => void
    ) {}

    get tick() {
        return this._tick;
    }

    start(): void {
        if (this.intervalId) return;

        this.delta = 1 / this.ticksPerSecond;
        this.startTime = Date.now();
        this.intervalId = setInterval(() => {
            this.elapsed = Date.now() - (this.startTime || 0);
            this.tickCallback();
            this._tick++;
        }, 1000 / this.ticksPerSecond);
    }

    pause(): void {
        if (!this.intervalId) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    resume(): void {
        if (this.intervalId) return;

        this.startTime = Date.now();
        this.start();
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.startTime = null;
    }
}
