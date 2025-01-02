import { EntityBehavior } from "@catfish/common/behaviors/PlayerBehavior";
import { inject } from "@catfish/common/di/index";
import {
    type PlayerInfo,
    PlayerInfoSymbol,
    PLAYER_RADIUS,
    PLAYER_SPEED,
} from "@catfish/common/player";
import { Ticker } from "@catfish/common/Ticker";
import { effect } from "@preact/signals";
import { GameObject } from "@catfish/common/sim/gameObject";
import { keyboardOrSignal } from "../input/events";
import { type ClientSocket, ClientSocketSymbol } from "../socket";
import { TileMapManager, TileMapManagerSymbol } from "../tilemap";
import { CameraBehavior } from "./CameraBehavior";
import { inUI } from "./GameUIBehavior";

/**
 * Reconsiliates the player's position with the server's position
 */
export class WASDMoveBehavior extends EntityBehavior {
    playerInfo = inject<PlayerInfo>(PlayerInfoSymbol);
    go = inject(GameObject);

    left = keyboardOrSignal([{ key: "a" }, { key: "A" }, { key: "ArrowLeft" }]);
    right = keyboardOrSignal([
        { key: "d" },
        { key: "D" },
        { key: "ArrowRight" },
    ]);
    up = keyboardOrSignal([{ key: "w" }, { key: "W" }, { key: "ArrowUp" }]);
    down = keyboardOrSignal([{ key: "s" }, { key: "S" }, { key: "ArrowDown" }]);

    tileMan = inject<TileMapManager>(TileMapManagerSymbol);
    socket = inject<ClientSocket>(ClientSocketSymbol);
    ticker = inject(Ticker);
    cameraBehavior = inject(CameraBehavior);

    constructor() {
        super();

        // Movement rounding
        const DECIMAL_PLACES = 8;
        const ROUND_FACTOR = Math.pow(10, DECIMAL_PLACES);

        effect(() => {
            this.ticker.currentTick.value;

            const deltaTime = this.ticker.deltaTime.value;

            //  region Get move directions
            let moveX = 0;
            let moveY = 0;

            let anyPressed =
                this.left.value ||
                this.right.value ||
                this.up.value ||
                this.down.value;
            if (!anyPressed || inUI.value) {
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
            if (this.cameraBehavior) {
                const angle = this.cameraBehavior.cameraAngle + Math.PI / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const x = moveX;
                const y = moveY;

                moveX =
                    Math.round((x * sin - y * cos) * ROUND_FACTOR) /
                    ROUND_FACTOR;
                moveY =
                    Math.round((x * cos + y * sin) * ROUND_FACTOR) /
                    ROUND_FACTOR;
            }

            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            if (length > 0) {
                moveX /= length;
                moveY /= length;
            }
            // endregion

            const isCollision = (x, y) => {
                return false;
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
                this.playerInfo.x + moveX * PLAYER_SPEED * deltaTime;
            if (isCollision(predictedX, this.playerInfo.y)) {
                moveX = 0; // Stop X movement if collision
            }
            this.playerInfo.x += moveX * PLAYER_SPEED * deltaTime;
            // endregion

            // region Move Y
            const predictedY =
                this.playerInfo.y + moveY * PLAYER_SPEED * deltaTime;
            if (isCollision(this.playerInfo.x, predictedY)) {
                moveY = 0; // Stop Y movement if collision
            }
            this.playerInfo.y += moveY * PLAYER_SPEED * deltaTime;
            // endregion

            this.socket.volatile.emit("moveRequest", moveX, moveY);
        });
    }
}
