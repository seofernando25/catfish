import { computed, effect, Signal, signal } from "@preact/signals";

export class Ticker {
    tickrate = signal(30);
    currentTick = signal(0);
    deltaTime = computed(() => this.tickrate.value / 1000);

    intervalId: Signal<ReturnType<typeof setInterval> | undefined> =
        signal(undefined);

    constructor() {
        this.intervalId.value;
        // Reset the current tick when the tickrate changes
        effect(() => {
            this.tickrate.value;
            this.currentTick.value = 0;
        });

        // Update tick
        effect(() => {
            if (this.intervalId.peek() !== undefined) {
                console.log("clearing interval");
                clearInterval(this.intervalId.peek());
            }
            console.log("interval ms:", 1000 / this.tickrate.value);
            this.intervalId.value = setInterval(() => {
                console.log("tick");
                this.currentTick.value++;
            }, 1000 / this.tickrate.value);
        });
    }
}
