import type { GamePlayer } from "../player";
import type { TileMapManager } from "../tilemap";
import { PlayerBehavior } from "./PlayerBehavior";

/**
 * Reconsiliates the player's position with the server's position
 */
export class WASDMoveBehavior extends PlayerBehavior {
    left: Phaser.Input.Keyboard.Key | undefined;
    right: Phaser.Input.Keyboard.Key | undefined;
    up: Phaser.Input.Keyboard.Key | undefined;
    down: Phaser.Input.Keyboard.Key | undefined;

    constructor(private gp: GamePlayer, private tileMan: TileMapManager) {
        super(gp);

        this.left = this.gp.scene.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.A
        );
        this.right = this.gp.scene.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.D
        );
        this.up = this.gp.scene.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.W
        );
        this.down = this.gp.scene.input.keyboard?.addKey(
            Phaser.Input.Keyboard.KeyCodes.S
        );
    }

    dispose(): void {
        this.left?.destroy();
        this.right?.destroy();
        this.up?.destroy();
        this.down?.destroy();
    }

    update(deltaTime: number): void {
        const playerSpeed = 15;
        //  region Get move directions
        let moveX = 0;
        let moveY = 0;

        if (this.left?.isDown) {
            moveX -= 1;
        } else if (this.right?.isDown) {
            moveX += 1;
        }

        if (this.up?.isDown) {
            moveY -= 1;
        } else if (this.down?.isDown) {
            moveY += 1;
        }

        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        if (length > 0) {
            moveX /= length;
            moveY /= length;
        }
        // endregion

        // region Move X
        const predictedX = this.gp.player.x + moveX * playerSpeed * deltaTime;
        const tile = this.tileMan?.getTile(predictedX, this.gp.player.y);
        if (tile === 0) {
            moveX = 0;
        }
        this.gp.player.x += moveX * playerSpeed * deltaTime;
        // endregion

        // region Move Y

        const predictedY = this.gp.player.y + moveY * playerSpeed * deltaTime;
        const tile2 = this.tileMan?.getTile(this.gp.player.x, predictedY);
        if (tile2 === 0) {
            moveY = 0;
        }

        this.gp.player.y += moveY * playerSpeed * deltaTime;
        // endregion

        // region Water reconsiliation fallback
        const tile3 = this.tileMan?.getTile(this.gp.player.x, this.gp.player.y);
        if (tile3 === 0) {
            this.gp.player.y -= 50 * playerSpeed * deltaTime;
        }
        // endregion
    }
}
