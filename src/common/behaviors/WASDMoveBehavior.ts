import type { GamePlayer } from "../../client/player";
import type { TileMapManager } from "../../client/tilemap";
import { PLAYER_SPEED } from "../player";
import { PlayerBehavior } from "./PlayerBehavior";
import type { ClientSocket } from "../../client/socket";
import { keyboardOrSignal, keyboardSignal } from "../../client/input/events";
import type { ReadonlySignal } from "@preact/signals";

/**
 * Reconsiliates the player's position with the server's position
 */
export class WASDMoveBehavior extends PlayerBehavior {
    left: ReadonlySignal<number>;
    right: ReadonlySignal<number>;
    up: ReadonlySignal<number>;
    down: ReadonlySignal<number>;

    constructor(
        private gp: GamePlayer,
        private tileMan: TileMapManager,
        private socket: ClientSocket
    ) {
        super(gp);

        this.left = keyboardOrSignal([
            { key: "a" },
            { key: "A" },
            { key: "ArrowLeft" },
        ]);
        this.right = keyboardOrSignal([
            { key: "d" },
            { key: "D" },
            { key: "ArrowRight" },
        ]);
        this.up = keyboardOrSignal([
            { key: "w" },
            { key: "W" },
            { key: "ArrowUp" },
        ]);
        this.down = keyboardOrSignal([
            { key: "s" },
            { key: "S" },
            { key: "ArrowDown" },
        ]);
    }

    update(deltaTime: number): void {
        //  region Get move directions
        let moveX = 0;
        let moveY = 0;

        let anyPressed =
            this.left.value ||
            this.right.value ||
            this.up.value ||
            this.down.value;
        if (!anyPressed) {
            return;
        }

        if (this.left.value) {
            moveX -= 1;
        } else if (this.right.value) {
            moveX += 1;
        }

        if (this.up.value) {
            moveY -= 1;
        } else if (this.down.value) {
            moveY += 1;
        }

        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        if (length > 0) {
            moveX /= length;
            moveY /= length;
        }
        // endregion

        // // region Move X
        // const predictedX = this.gp.player.x + moveX * playerSpeed * deltaTime;
        // const tile = this.tileMan?.getTile(predictedX, this.gp.player.y);
        // if (tile === 0) {
        //     moveX = 0;
        // }
        this.gp.player.x += moveX * PLAYER_SPEED * deltaTime;
        // // endregion

        // // region Move Y

        // const predictedY = this.gp.player.y + moveY * playerSpeed * deltaTime;
        // const tile2 = this.tileMan?.getTile(this.gp.player.x, predictedY);
        // if (tile2 === 0) {
        //     moveY = 0;
        // }

        this.gp.player.y += moveY * PLAYER_SPEED * deltaTime;
        // // endregion

        // // region Water reconsiliation fallback
        // const tile3 = this.tileMan?.getTile(this.gp.player.x, this.gp.player.y);
        // if (tile3 === 0) {
        //     this.gp.player.y -= 50 * playerSpeed * deltaTime;
        // }
        // endregion
        this.socket.volatile.emit("moveRequest", moveX, moveY);
    }

    fixedUpdate(): void {
        this.socket.volatile.emit("moveRequest", 0, 0);
    }
}
