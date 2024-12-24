import { Sprite, type Container } from "pixi.js";
import type { PlayerBehavior } from "../common/behaviors/PlayerBehavior";
import type { PlayerInfo } from "../common/player";
import { spritesheetObj } from "../main";

export class GamePlayer {
    sprite: Sprite | undefined;
    behaviors: PlayerBehavior[] = [];

    constructor(private root: Container, public player: PlayerInfo) {
        console.log("Creating player", player);
        this.sprite = new Sprite(spritesheetObj.textures.car);
        this.sprite.setSize(1, 1);
        this.sprite.zIndex = 1000;
    }

    update(deltaTime: number): void {
        for (const behavior of this.behaviors) {
            behavior.update(deltaTime);
        }

        if (this.sprite) {
            this.sprite.position.set(this.player.x, this.player.y);
        }
    }

    fixedUpdate(): void {
        for (const behavior of this.behaviors) {
            behavior.fixedUpdate();
        }
    }

    dispose(): void {
        for (const behavior of this.behaviors) {
            behavior.dispose();
        }

        this.sprite?.destroy();
    }
}
