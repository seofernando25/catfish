import { inject } from "../di";
import { GameObject } from "../sim/gameObject";
import { Ticker } from "../Ticker";
import { EntityBehavior } from "./PlayerBehavior";

export class TreeSpriteBehavior extends EntityBehavior {
    ticker = inject(Ticker);
    go = inject(GameObject);

    constructor() {
        super();
    }

    dispose(): void {
        // this.gp.scene.remove(this.sprite);
    }
}
