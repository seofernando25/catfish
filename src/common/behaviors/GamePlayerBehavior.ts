import { effect } from "@preact/signals";
import { GameObject } from "../../client/gameObject";
import { Ticker } from "../ticker/Ticker";
import { EntityBehavior } from "./PlayerBehavior";
import { inject } from "../di";

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
