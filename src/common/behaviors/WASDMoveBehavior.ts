import type { GamePlayer } from "../../client/player";
import type { TileMapManager } from "../../client/tilemap";
import { PLAYER_RADIUS, PLAYER_SPEED } from "../player";
import { PlayerBehavior } from "./PlayerBehavior";
import type { ClientSocket } from "../../client/socket";
import { keyboardOrSignal, keyboardSignal } from "../../client/input/events";
import { effect, type ReadonlySignal } from "@preact/signals";
import { Ticker } from "../ticker/Ticker";
import { CameraBehavior } from "./CameraBehavior";

/**
 * Reconsiliates the player's position with the server's position
 */
export class WASDMoveBehavior extends PlayerBehavior {
    left = keyboardOrSignal([{ key: "a" }, { key: "A" }, { key: "ArrowLeft" }]);
    right = keyboardOrSignal([
        { key: "d" },
        { key: "D" },
        { key: "ArrowRight" },
    ]);
    up = keyboardOrSignal([{ key: "w" }, { key: "W" }, { key: "ArrowUp" }]);
    down = keyboardOrSignal([{ key: "s" }, { key: "S" }, { key: "ArrowDown" }]);

    constructor(
        private gp: GamePlayer,
        private tileMan: TileMapManager,
        private socket: ClientSocket,
        ticker: Ticker
    ) {
        super(gp);
        let cameraBehavior: CameraBehavior | undefined;
        setTimeout(() => {
            // Find CameraBehavior
            const camBehavior = this.gp.behaviors.find(
                (b) => b instanceof CameraBehavior
            );
            if (camBehavior === undefined) {
                console.error("CameraBehavior not found");
            }

            cameraBehavior = camBehavior;
        }, 0);

        effect(() => {
            ticker.currentTick.value;

            const deltaTime = ticker.deltaTime.value;

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

            // rotate x, y by cameraBehavior.cameraAngle
            if (cameraBehavior) {
                const angle = cameraBehavior.cameraAngle + Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const x = moveX;
                const y = moveY;
                moveX = x * sin - y * cos;
                moveY = x * cos + y * sin;
            }

            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            if (length > 0) {
                moveX /= length;
                moveY /= length;
            }
            // endregion

            const isCollision = (x, y) => {
                const offsets = [
                    [PLAYER_RADIUS, 0],
                    [-PLAYER_RADIUS, 0],
                    [0, PLAYER_RADIUS],
                    [0, -PLAYER_RADIUS],
                ];
                for (const [dx, dy] of offsets) {
                    const tile = this.tileMan?.getTile(x + dx, y + dy);
                    if (tile === 0) {
                        return true;
                    }
                }
                return false;
            };

            // region Move X
            const predictedX =
                this.gp.player.x + moveX * PLAYER_SPEED * deltaTime;
            if (isCollision(predictedX, this.gp.player.y)) {
                moveX = 0; // Stop X movement if collision
            }
            this.gp.player.x += moveX * PLAYER_SPEED * deltaTime;
            // endregion

            // region Move Y
            const predictedY =
                this.gp.player.y + moveY * PLAYER_SPEED * deltaTime;
            if (isCollision(this.gp.player.x, predictedY)) {
                moveY = 0; // Stop Y movement if collision
            }
            this.gp.player.y += moveY * PLAYER_SPEED * deltaTime;
            // endregion

            this.socket.volatile.emit("moveRequest", moveX, moveY);
        });
    }
}
