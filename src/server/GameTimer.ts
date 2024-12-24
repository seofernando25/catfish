export class GameTimer {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private lastTime: number | null = null;
    public elapsed = 0;
    private _tick = 0;

    constructor(
        private ticksPerSecond: number,
        private tickCallback: () => void
    ) {}

    get delta() {
        return 1 / this.ticksPerSecond;
    }

    get tickDurationMs() {
        return 1000 / this.ticksPerSecond;
    }

    get tick() {
        return this._tick;
    }

    start(): void {
        if (this.intervalId) return;

        this.lastTime = performance.now();
        this.intervalId = setInterval(
            () => this.gameLoop(),
            this.tickDurationMs
        );
    }

    pause(): void {
        if (!this.intervalId) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.lastTime = null;
    }

    resume(): void {
        if (this.intervalId) return;
        this.lastTime = performance.now();
        this.start();
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.lastTime = null;
        this._tick = 0;
        this.elapsed = 0;
    }

    private gameLoop(): void {
        if (this.lastTime === null) return;

        const now = performance.now();
        let deltaMs = now - this.lastTime;
        this.lastTime = now;
        this.elapsed += deltaMs;

        // Run multiple ticks if behind schedule
        let tickCnt = 0;
        while (this.elapsed >= this.tickDurationMs) {
            this.tickCallback();
            tickCnt++;
            this._tick++;
            this.elapsed -= this.tickDurationMs;
            if (tickCnt > 10) {
                console.error("Exceeded max ticks in a single frame");
                break;
            }
        }
    }
}
