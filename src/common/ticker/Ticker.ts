import { computed, effect, Signal, signal } from "@preact/signals";
import type { TickerInfo } from "../../server/events";

export class Ticker {
    tickrate = signal(30); // ticks per second
    currentTick = signal(0);
    deltaTime = computed(() => 1 / this.tickrate.value);
    elapsed = computed(() => this.currentTick.value * this.deltaTime.value);

    intervalId: Signal<ReturnType<typeof setTimeout> | undefined> =
        signal(undefined);
    startTime = signal(Date.now());

    constructor() {
        this.intervalId.value;

        // effect(() => {
        //     this.tickrate.value;
        //     if (this.intervalId.peek() !== undefined) {
        //         clearTimeout(this.intervalId.peek());
        //     }
        this.scheduleNextTick();
        // });
    }

    scheduleNextTick() {
        const now = Date.now();
        const elapsed = now - this.startTime.value;
        const expectedTicks = Math.floor(
            elapsed / (1000 / this.tickrate.value)
        );
        const nextTickIn =
            (expectedTicks + 1) * (1000 / this.tickrate.value) - elapsed;
        this.intervalId.value = setTimeout(() => {
            while (this.currentTick.value < expectedTicks) {
                this.currentTick.value++;
            }
            this.scheduleNextTick(); // Schedule the next tick dynamically
        }, Math.max(nextTickIn, 0)); // Ensure no negative timeouts
    }

    sync(info: TickerInfo) {
        console.log("Syncing...", info);
        this.tickrate.value = info.tickrate;
        this.currentTick.value = info.server_tick;
        this.startTime.value = info.start_t;
        // this.offset.value = Date.now() - info.start_t;
    }
}

export const globalTicker = new Ticker();
