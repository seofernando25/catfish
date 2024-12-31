import { effect } from "@preact/signals";
import { Scene, Sprite, SpriteMaterial } from "three";
import { Ticker } from "@catfish/common/Ticker";
import { EntityBehavior } from "@catfish/common/behaviors/PlayerBehavior";
import { inject } from "@catfish/common/di/index";
import { getSubTextureFromAtlas } from "../rendering/textures";

// TODO: Add sprite
export class TreeSpriteBehavior extends EntityBehavior {
    treeMat = new SpriteMaterial({
        map: getSubTextureFromAtlas("tree1"),
        alphaTest: 0.5,
        transparent: true,
    });

    sprite = new Sprite(this.treeMat);
    scene = inject(Scene);
    ticker = inject(Ticker);

    constructor() {
        super();
        this.scene.add(this.sprite);
        this.sprite.center.set(0.5, 0.75);

        effect(() => {
            this.ticker.currentTick.value;

            // this.sprite.position.set(this.gp.player.x, this.gp.player.y, 0);
        });
    }

    dispose(): void {
        this.scene.remove(this.sprite);
    }
}
