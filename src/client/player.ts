import type { PlayerBehavior } from "../common/behaviors/PlayerBehavior";
import type { PlayerInfo } from "../common/player";

export class GamePlayer {
    sprite: Phaser.GameObjects.Image | undefined;
    behaviors: PlayerBehavior[] = [];

    constructor(public scene: Phaser.Scene, public player: PlayerInfo) {
        console.log("Creating player", player);
        this.sprite = scene.add.image(player.x, player.y, "playerImage");
        this.sprite.setDisplaySize(1, 1);
        this.sprite.setDepth(1000);
    }

    update(deltaTime: number): void {
        for (const behavior of this.behaviors) {
            behavior.update(deltaTime);
        }

        if (this.sprite) {
            this.sprite.setPosition(this.player.x, this.player.y);
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
