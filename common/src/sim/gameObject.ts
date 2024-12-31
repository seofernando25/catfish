import type { EntityBehavior } from "../behaviors/PlayerBehavior";
import { inject, provide } from "../di";
import { Injector } from "../di/injector";
import { Ticker } from "../Ticker";

export class GameObject {
    behaviorInstances: EntityBehavior[] = [];
    injectionContext = new Injector();

    ticker = inject(Ticker);

    addBehavior<T extends EntityBehavior>(behavior: { new (): T }) {
        provide({
            provide: behavior,
            useClass: behavior,
        });
        this.ticker?.requestTickerTick(() => {
            // FIXME: Weird way to schedule instantiation
            inject(behavior);
        });
    }

    removeBehavior<T extends EntityBehavior>(behavior: { new (): T }) {
        const behaviorInstance = this.behaviorInstances.find(
            (b) => b.constructor === behavior
        );
        if (behaviorInstance) {
            behaviorInstance.dispose();
            this.behaviorInstances = this.behaviorInstances.filter(
                (b) => b !== behaviorInstance
            );
        }
    }

    dispose(): void {
        for (const behavior of this.behaviorInstances) {
            behavior.dispose();
        }
    }
}
