import type { EntityBehavior } from "../common/behaviors/PlayerBehavior";
import { inject } from "../common/di";
import { Ticker } from "../common/ticker/Ticker";

export class GameObject {
    behaviors: EntityBehavior[] = [];

    ticker = inject(Ticker);

    dispose(): void {
        for (const behavior of this.behaviors) {
            behavior.dispose();
        }
    }
}
